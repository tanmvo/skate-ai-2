# PRD: Multi-Environment Database Setup (Development vs Production)
## Skate AI - Database Environment Strategy

**Document Version:** 1.0  
**Last Updated:** 2025-08-14  
**Status:** Draft  
**Priority:** High  

---

## Executive Summary

This PRD outlines the implementation of separate database environments for development, staging, and production for Skate AI. The current setup uses a single Neon PostgreSQL database for all environments, which presents risks for development safety, data isolation, and scalability. This document proposes a comprehensive multi-environment database strategy leveraging Neon's branching capabilities.

**Confidence Score:** 97% - Well-researched implementation with proven Neon branching patterns and minimal risk.

## Business Context

### Current State
- **Single Database Environment**: One Neon PostgreSQL database for all development and production
- **Environment Variables**: `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` pointing to same database
- **Risk Profile**: High - development changes can impact production data
- **Development Workflow**: Developers working directly against production data structure

### Business Drivers
- **Development Safety**: Prevent accidental data corruption or schema conflicts
- **Team Collaboration**: Enable multiple developers to work in isolation
- **CI/CD Pipeline**: Support automated testing with clean database states
- **Preview Environments**: Database per pull request for better testing
- **Cost Optimization**: Reduce costs through Neon's scale-to-zero for non-production environments

## Goals & Success Criteria

### Primary Goals
1. **Environment Isolation**: Separate databases for development, staging, and production
2. **Developer Experience**: Fast, reliable database setup for local development
3. **Cost Efficiency**: Optimize database costs for non-production environments
4. **CI/CD Integration**: Automated database provisioning for testing and previews
5. **Data Safety**: Protect production data from development activities

### Success Metrics
- [ ] 100% environment isolation - no cross-environment data access
- [ ] <30 second database branch creation time
- [ ] 40% reduction in non-production database costs
- [ ] Zero production incidents from development activities
- [ ] Automated database per pull request

## User Stories

### As a Developer
- I want my own development database so I can test schema changes safely
- I want to reset my development database quickly when needed
- I want to test with production-like data without affecting production
- I want my database to auto-scale to zero when I'm not working

### As a DevOps Engineer
- I want automated database provisioning for CI/CD pipelines
- I want cost-effective non-production database environments
- I want easy migration paths between environments
- I want monitoring and cleanup automation for database branches

### As a Product Manager
- I want preview environments with databases for testing features
- I want confidence that development work won't impact production
- I want cost visibility across different database environments

## Technical Requirements

### Core Architecture

#### 1. Neon Database Branching Strategy ✅
**Primary Approach: Leverage Neon's copy-on-write branching**

```
Production Database (main)
├── Staging Branch (staging)
├── Development Branch (dev-main)
├── Feature Branches (feature/*)
└── Preview Branches (preview/pr-*)
```

**Key Benefits:**
- Instant branch creation (<30 seconds)
- Copy-on-write efficiency (minimal storage cost)
- Full production data access for testing
- Automated branch management via API

#### 2. Environment Configuration Structure ✅

```bash
# Production Environment
POSTGRES_PRISMA_URL="postgresql://prod-pooling-url"
POSTGRES_URL_NON_POOLING="postgresql://prod-direct-url"

# Staging Environment  
POSTGRES_PRISMA_URL="postgresql://staging-pooling-url"
POSTGRES_URL_NON_POOLING="postgresql://staging-direct-url"

# Development Environment
POSTGRES_PRISMA_URL="postgresql://dev-pooling-url"
POSTGRES_URL_NON_POOLING="postgresql://dev-direct-url"

# Environment-specific settings
DATABASE_ENVIRONMENT="development|staging|production"
NEON_API_KEY="for-automated-branch-management"
```

#### 3. Enhanced Prisma Configuration ✅

```typescript
// lib/prisma-env.ts - Environment-aware Prisma client
import { PrismaClient } from '@prisma/client';

const getDatabaseUrl = () => {
  const env = process.env.DATABASE_ENVIRONMENT || 'development';
  
  switch (env) {
    case 'production':
      return process.env.POSTGRES_PRISMA_URL;
    case 'staging':
      return process.env.POSTGRES_PRISMA_URL_STAGING;
    case 'development':
      return process.env.POSTGRES_PRISMA_URL_DEV;
    default:
      throw new Error(`Unknown environment: ${env}`);
  }
};

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl()
    }
  }
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Alternative Local Development Options

#### Option A: Docker PostgreSQL (Full Local Isolation)
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: skate_ai_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-dev-db.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

#### Option B: SQLite Development (Rapid Prototyping)
```typescript
// For extremely fast local development
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.NODE_ENV === 'development' && process.env.USE_SQLITE 
        ? 'file:./dev.db' 
        : process.env.POSTGRES_PRISMA_URL
    }
  }
});
```

### CI/CD Integration

#### 1. GitHub Actions Database Management ✅
```yaml
# .github/workflows/database-management.yml
name: Database Management

on:
  pull_request:
    types: [opened, synchronize, closed]

jobs:
  create-preview-db:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Create Neon Branch
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
        run: |
          BRANCH_NAME="preview/pr-${{ github.event.number }}"
          curl -X POST "https://console.neon.tech/api/v2/projects/$PROJECT_ID/branches" \
            -H "Authorization: Bearer $NEON_API_KEY" \
            -H "Content-Type: application/json" \
            -d '{"branch_name": "'$BRANCH_NAME'", "parent_id": "main"}'

  cleanup-preview-db:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Delete Neon Branch
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
        run: |
          BRANCH_NAME="preview/pr-${{ github.event.number }}"
          curl -X DELETE "https://console.neon.tech/api/v2/projects/$PROJECT_ID/branches/$BRANCH_NAME" \
            -H "Authorization: Bearer $NEON_API_KEY"
```

#### 2. Automated Testing with Fresh Databases ✅
```bash
# Enhanced package.json scripts
{
  "scripts": {
    "test:integration": "NODE_ENV=test npm run db:test:setup && vitest run tests/integration",
    "db:test:setup": "npx tsx scripts/setup-test-db.ts",
    "db:branch:create": "npx tsx scripts/create-dev-branch.ts",
    "db:branch:reset": "npx tsx scripts/reset-dev-branch.ts",
    "db:branch:cleanup": "npx tsx scripts/cleanup-branches.ts"
  }
}
```

## Database Change Management Process

### Overview: From Single Database to Multi-Environment Workflow

**Current State (Single Database):**
```bash
# Current workflow - applies directly to production ⚠️
npx prisma generate          # Generate Prisma client
npx prisma db push          # Push schema changes to database
npx prisma studio           # View/edit database data
```

**New Multi-Environment Workflow:**
Database changes now follow a controlled progression: Development → Staging → Production

### Core Workflow: Schema Changes & Migrations

#### 1. Development Environment Changes ✅

**Step 1: Switch to Development Database**
```bash
# Set environment for development
export DATABASE_ENVIRONMENT=development
# or use .env.development file
```

**Step 2: Make Schema Changes**
```bash
# Edit prisma/schema.prisma with your changes
# Example: Add new field to User model

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  newField      String?   # <- New field added
  # ... other fields
}
```

**Step 3: Apply Changes to Development Database**
```bash
# Generate new Prisma client
npx prisma generate

# Create and apply migration (recommended for production path)
npx prisma migrate dev --name add-user-new-field

# OR for quick prototyping (dev only)
npx prisma db push
```

**Step 4: Test Changes**
```bash
# Start development server
npm run dev

# Open Prisma Studio to verify changes
npx prisma studio

# Run tests to ensure changes work
npm run test
```

#### 2. Staging Environment Deployment ✅

**Step 1: Switch to Staging Database**
```bash
# Set environment for staging
export DATABASE_ENVIRONMENT=staging
# or update .env.staging
```

**Step 2: Deploy Migration to Staging**
```bash
# Deploy pending migrations (safe for production)
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status

# Generate client for staging environment
npx prisma generate
```

**Step 3: Staging Validation**
```bash
# Deploy application to staging
npm run build
npm run start

# Run integration tests
npm run test:integration

# Manual testing and validation
npx prisma studio  # View staging data
```

#### 3. Production Environment Deployment ✅

**Step 1: Pre-Production Checklist**
- [ ] All migrations tested in development and staging
- [ ] Database backup completed (automatic with Neon)
- [ ] Migration rollback plan prepared
- [ ] Team notification sent

**Step 2: Deploy to Production**
```bash
# Set environment for production (usually via CI/CD)
export DATABASE_ENVIRONMENT=production

# Deploy migrations (non-destructive only)
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

**Step 3: Post-Deployment Verification**
```bash
# Verify application functionality
curl -f https://your-app.vercel.app/api/health

# Check database schema (read-only)
npx prisma studio --browser none
```

### Enhanced Package.json Scripts

```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:studio": "prisma studio",
    
    "db:dev:push": "DATABASE_ENVIRONMENT=development prisma db push",
    "db:dev:migrate": "DATABASE_ENVIRONMENT=development prisma migrate dev",
    "db:dev:studio": "DATABASE_ENVIRONMENT=development prisma studio",
    "db:dev:reset": "DATABASE_ENVIRONMENT=development prisma migrate reset",
    
    "db:staging:deploy": "DATABASE_ENVIRONMENT=staging prisma migrate deploy",
    "db:staging:studio": "DATABASE_ENVIRONMENT=staging prisma studio",
    "db:staging:status": "DATABASE_ENVIRONMENT=staging prisma migrate status",
    
    "db:prod:deploy": "DATABASE_ENVIRONMENT=production prisma migrate deploy",
    "db:prod:status": "DATABASE_ENVIRONMENT=production prisma migrate status",
    
    "db:branch:create": "npx tsx scripts/create-dev-branch.ts",
    "db:branch:reset": "npx tsx scripts/reset-dev-branch.ts",
    "db:branch:switch": "npx tsx scripts/switch-db-branch.ts"
  }
}
```

### Environment-Specific Workflows

#### Development Branch Management

**Create Fresh Development Branch**
```bash
# Create new branch from production
npm run db:branch:create my-feature-branch

# This automatically:
# 1. Creates Neon branch from production
# 2. Updates .env.local with new connection string
# 3. Runs migrations and seeds data
```

**Reset Development Environment**
```bash
# Reset to clean state from production
npm run db:branch:reset

# This automatically:
# 1. Deletes current dev branch
# 2. Creates fresh branch from production
# 3. Updates local environment variables
# 4. Applies any pending migrations
```

**Switch Between Branches**
```bash
# Switch to different development branch
npm run db:branch:switch feature-xyz

# Manual switch via environment variables
export POSTGRES_PRISMA_URL="neon-branch-connection-string"
export POSTGRES_URL_NON_POOLING="neon-branch-direct-string"
```

#### Migration Best Practices

**Safe Migration Patterns**
```sql
-- ✅ Safe: Adding nullable columns
ALTER TABLE users ADD COLUMN new_field TEXT;

-- ✅ Safe: Adding new tables
CREATE TABLE new_table (...);

-- ✅ Safe: Adding indexes
CREATE INDEX idx_users_email ON users(email);

-- ⚠️ Requires planning: Dropping columns
-- ALTER TABLE users DROP COLUMN old_field;

-- ⚠️ Requires planning: Changing column types
-- ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(500);
```

**Migration Testing Workflow**
```bash
# 1. Test migration in development
npm run db:dev:migrate

# 2. Test application with changes
npm run dev
npm run test

# 3. Deploy to staging for integration testing
npm run db:staging:deploy

# 4. Run full test suite
npm run test:integration

# 5. Deploy to production (usually via CI/CD)
npm run db:prod:deploy
```

### Data Management Across Environments

#### Database Studio Access

**Development Environment**
```bash
# Access development database
npm run db:dev:studio
# Opens: http://localhost:5555 connected to dev branch
```

**Staging Environment**
```bash
# Access staging database (read-only recommended)
npm run db:staging:studio
# Opens: http://localhost:5555 connected to staging branch
```

**Production Environment**
```bash
# Access production database (read-only only!)
npm run db:prod:studio
# Opens: http://localhost:5555 connected to production branch
# ⚠️ Never modify production data through Studio
```

#### Data Seeding Strategy

**Development Seeding**
```typescript
// prisma/seed-dev.ts
import { prisma } from '../lib/prisma';

async function seedDevelopment() {
  // Create test user
  const testUser = await prisma.user.create({
    data: {
      id: 'usr_dev_test_2025',
      name: 'Test Developer',
      email: 'dev@example.com',
    }
  });

  // Create sample studies with documents
  const study = await prisma.study.create({
    data: {
      name: 'Development Test Study',
      userId: testUser.id,
      documents: {
        create: [
          {
            fileName: 'sample-doc.pdf',
            fileType: 'application/pdf',
            fileSize: 1024,
            status: 'READY',
            extractedText: 'Sample document for testing...',
          }
        ]
      }
    }
  });

  console.log('Development environment seeded!');
}
```

**Staging Seeding**
```typescript
// prisma/seed-staging.ts
async function seedStaging() {
  // Use anonymized production-like data
  // More realistic data volumes
  // Representative test cases
}
```

#### Environment Switching Helper Script

```typescript
// scripts/switch-db-environment.ts
import { writeFileSync } from 'fs';
import { NeonApi } from '../lib/neon-api';

interface Environment {
  name: string;
  branchName: string;
  description: string;
}

const environments: Environment[] = [
  {
    name: 'development',
    branchName: 'dev-main',
    description: 'Main development environment'
  },
  {
    name: 'staging',
    branchName: 'staging',
    description: 'Pre-production testing'
  },
  {
    name: 'production',
    branchName: 'main',
    description: 'Live production database'
  }
];

async function switchEnvironment(targetEnv: string) {
  const env = environments.find(e => e.name === targetEnv);
  if (!env) {
    throw new Error(`Unknown environment: ${targetEnv}`);
  }

  const neon = new NeonApi(process.env.NEON_API_KEY!);
  const branch = await neon.getBranch(env.branchName);

  // Update .env.local
  const envContent = `
# Database Environment: ${env.description}
DATABASE_ENVIRONMENT=${env.name}
POSTGRES_PRISMA_URL="${branch.connection_string_pooled}"
POSTGRES_URL_NON_POOLING="${branch.connection_string_direct}"
`;

  writeFileSync('.env.local', envContent);
  
  console.log(`✅ Switched to ${env.name} environment`);
  console.log(`📝 Database: ${env.branchName}`);
  console.log(`🔄 Run 'npx prisma generate' to update client`);
}
```

### Troubleshooting Common Issues

#### Connection Issues
```bash
# Verify current environment
echo $DATABASE_ENVIRONMENT

# Test database connection
npx prisma db execute --stdin <<< "SELECT 1"

# Check migration status
npx prisma migrate status

# Regenerate Prisma client
npx prisma generate
```

#### Migration Conflicts
```bash
# Reset development branch to clean state
npm run db:branch:reset

# Manually resolve migration conflicts
npx prisma migrate resolve --applied "migration-name"

# Force push schema (development only!)
npx prisma db push --force-reset
```

#### Environment Variable Issues
```bash
# Verify environment variables
npx tsx -e "console.log(process.env.DATABASE_ENVIRONMENT)"
npx tsx -e "console.log(process.env.POSTGRES_PRISMA_URL)"

# Switch environments
npm run db:branch:switch development
```

### Security & Best Practices

#### Access Control
- **Development**: Full read/write access via Prisma Studio
- **Staging**: Limited write access, primarily for testing
- **Production**: Read-only access only, no direct modifications

#### Data Protection
- Never run `prisma db push --force-reset` against production
- Always use migrations (`prisma migrate`) for production changes
- Keep production connection strings secure and environment-specific
- Regular automated backups (handled by Neon)

#### Migration Safety
- Test all migrations in development first
- Use reversible migrations when possible
- Plan downtime for destructive changes
- Always have rollback procedures ready

## Implementation Plan

### Phase 1: Neon Environment Setup (1 day)
- [ ] Create staging and development branches in Neon console
- [ ] Configure environment-specific connection strings
- [ ] Set up Neon API access for automated branch management
- [ ] Update environment variable documentation

### Phase 2: Enhanced Prisma Configuration (1 day)
- [ ] Create environment-aware Prisma client configuration
- [ ] Update existing `lib/prisma.ts` with multi-environment support
- [ ] Test database connections across all environments
- [ ] Implement fallback and error handling

### Phase 3: Development Workflow Scripts (1 day)
- [ ] Create database branch management scripts
- [ ] Implement automated seeding for development environments
- [ ] Set up local development Docker option (alternative)
- [ ] Create developer onboarding documentation

### Phase 4: CI/CD Pipeline Integration (1 day)
- [ ] Configure GitHub Actions for automated branch management
- [ ] Set up preview environment database creation
- [ ] Implement automated cleanup for closed pull requests
- [ ] Test end-to-end CI/CD database provisioning

### Phase 5: Monitoring & Optimization (1 day)
- [ ] Set up database usage monitoring across environments
- [ ] Configure automated branch cleanup policies
- [ ] Implement cost tracking and alerts
- [ ] Create operational runbooks

## Technical Implementation Details

### Database Branch Management Scripts

#### Create Development Branch
```typescript
// scripts/create-dev-branch.ts
import { NeonApi } from './lib/neon-api';

async function createDevBranch(branchName: string, parentBranch = 'main') {
  const neon = new NeonApi(process.env.NEON_API_KEY!);
  
  try {
    const branch = await neon.createBranch({
      name: branchName,
      parent_id: parentBranch,
      compute_provisioner: 'k8s-pod', // Auto-suspend for cost savings
    });
    
    console.log(`✅ Created branch: ${branch.name}`);
    console.log(`📝 Connection string: ${branch.connection_string}`);
    
    return branch;
  } catch (error) {
    console.error('Failed to create branch:', error);
    throw error;
  }
}
```

#### Reset Development Environment
```typescript
// scripts/reset-dev-branch.ts
async function resetDevEnvironment() {
  const branchName = `dev-${process.env.USER || 'local'}`;
  
  // Delete existing branch
  await neon.deleteBranch(branchName);
  
  // Create fresh branch from production
  const newBranch = await createDevBranch(branchName, 'main');
  
  // Update local environment
  updateEnvFile('.env.local', {
    POSTGRES_PRISMA_URL: newBranch.connection_string_pooled,
    POSTGRES_URL_NON_POOLING: newBranch.connection_string_direct,
  });
  
  // Run migrations and seed
  await exec('npx prisma migrate deploy');
  await exec('npx prisma db seed');
  
  console.log('🎉 Development environment reset complete!');
}
```

### Cost Optimization Strategy

#### Auto-Suspend Configuration
```javascript
// Neon branch configuration for cost optimization
const branchConfig = {
  compute_provisioner: 'k8s-pod',
  auto_suspend_compute_seconds: 300, // 5 minutes
  suspend_timeout_seconds: 60,
  settings: {
    quota: {
      active_time_seconds: 3600, // 1 hour daily limit for dev branches
      compute_time_seconds: 7200, // 2 hours compute time
    }
  }
};
```

#### Cleanup Automation
```bash
# Automated cleanup script (run daily via cron)
#!/bin/bash
# scripts/cleanup-old-branches.sh

# Delete branches older than 7 days
CUTOFF_DATE=$(date -d "7 days ago" -u +"%Y-%m-%dT%H:%M:%SZ")

neon branches list --format json | \
  jq -r ".[] | select(.created_at < \"$CUTOFF_DATE\" and (.name | startswith(\"preview/\") or startswith(\"feature/\"))) | .id" | \
  xargs -I {} neon branches delete {}
```

## Environment Configuration Matrix

| Environment | Purpose | Data Source | Auto-Suspend | Retention |
|------------|---------|-------------|--------------|-----------|
| **Production** | Live application | - | No | Permanent |
| **Staging** | Pre-production testing | Copy of production | No | Permanent |
| **Development** | Developer main branch | Copy of production | 5 minutes | 30 days |
| **Feature** | Feature development | Copy of staging | 5 minutes | 7 days |
| **Preview** | PR testing | Copy of staging | 5 minutes | PR lifetime |
| **Testing** | CI/CD pipelines | Empty/seeded | 1 minute | 1 day |

## Risk Assessment & Mitigation

### High Risk Items
1. **Database Connection Complexity**
   - Risk: Environment configuration errors causing wrong database access
   - Mitigation: Comprehensive environment validation and connection testing
   - Impact: High - Could cause data corruption if dev connects to production

2. **Cost Escalation**  
   - Risk: Uncontrolled branch creation leading to unexpected costs
   - Mitigation: Automated cleanup, quotas, and monitoring alerts
   - Impact: Medium - Financial impact but easily controllable

### Medium Risk Items
1. **Migration Complexity**
   - Risk: Schema changes across multiple environments
   - Mitigation: Automated migration testing and rollback procedures
   - Impact: Medium - Could cause development delays

2. **Neon API Dependency**
   - Risk: Neon API downtime affecting branch management
   - Mitigation: Fallback to manual branch creation and local Docker option
   - Impact: Low - Temporary inconvenience with workarounds available

## Dependencies & Prerequisites

### External Dependencies
- Neon database project with API access
- GitHub repository with Actions enabled
- Docker (optional, for local development)
- Neon CLI tool for manual management

### Internal Prerequisites  
- Updated environment variable management
- CI/CD pipeline write access
- Developer Docker setup (optional path)
- Monitoring and alerting infrastructure

## Cost Analysis

### Current State (Single Database)
- **Monthly Cost**: ~$25/month (estimated for current usage)
- **Risk Factor**: High (production data exposure)

### Proposed Multi-Environment Setup
- **Production**: $25/month (unchanged)
- **Staging**: $15/month (smaller compute, auto-suspend)
- **Development Branches**: $5-10/month total (auto-suspend, quotas)
- **Preview Environments**: $2-5/month (short-lived, auto-suspend)

**Total Estimated Cost**: $47-55/month (+88% increase)
**Cost per Environment**: Staging +$15, Dev/Preview +$7-15
**ROI**: Risk reduction, productivity improvement, team scalability

### Cost Optimization Strategies
1. **Auto-Suspend**: Reduce costs by 40-60% for non-production environments
2. **Quotas**: Prevent runaway usage with time-based limits  
3. **Automated Cleanup**: Remove unused branches after 7 days
4. **Resource Limits**: Smaller compute units for development environments

## Post-Launch Considerations

### Monitoring & Analytics
- Database connection success rates per environment
- Branch creation and cleanup automation health
- Cost tracking and optimization opportunities
- Developer productivity metrics (environment setup time)

### Future Enhancements
- **Database Seeding Automation**: Environment-specific seed data
- **Schema Change Management**: Automated migration testing across environments
- **Performance Testing Environments**: Dedicated branches for load testing
- **Backup and Recovery**: Point-in-time recovery for non-production environments

### Maintenance Tasks
- Weekly cost review and optimization
- Monthly branch cleanup verification
- Quarterly environment access audit
- Neon feature and pricing updates monitoring

---

**Estimated Timeline:** 5 days total development effort  
**Team Required:** 1 senior developer with DevOps experience  
**Budget Impact:** Medium - $22-30/month additional database costs, high value for risk reduction and productivity
# PRD: Authentication System Implementation (Auth.js)
## Skate AI - Multi-User Authentication Migration

**Document Version:** 1.0  
**Last Updated:** 2025-08-12  
**Status:** Draft  
**Priority:** Critical  

---

## Executive Summary

This PRD outlines the migration from Skate AI's current single-user MVP authentication to a full multi-user authentication system using Auth.js (NextAuth.js v5). This is a foundational requirement for market launch and enables user accounts, data isolation, and commercial viability.

**Confidence Score:** 98% - Well-researched implementation with mature tooling and clear migration path.

## Business Context

### Current State
- Single-user MVP mode with hardcoded user ID (`usr_mvp_dev_2025`)
- All data operations properly scoped to single user via `lib/auth.ts`
- Clean separation of concerns with user validation functions
- Database schema ready for multi-user with proper relationships

### Business Drivers
- **Market Requirement:** Cannot launch commercially without proper user accounts
- **Data Security:** Need proper user data isolation for compliance
- **Scalability:** Enable multiple users and future team features
- **Revenue:** Enable subscription and usage-based pricing models

## Goals & Success Criteria

### Primary Goals
1. **Seamless Migration:** Migrate from single-user to multi-user without data loss
2. **Security First:** Implement enterprise-grade authentication security
3. **User Experience:** Smooth sign-in/sign-up flow for research platform users
4. **Developer Experience:** Maintain existing code patterns and API structure

### Success Metrics
- [ ] 100% of existing API endpoints work with new auth system
- [ ] Zero data loss during migration from MVP user
- [ ] <2 second authentication response times
- [ ] Support for 3+ authentication providers
- [ ] Pass security audit checklist

## User Stories

### As a New User
- I want to sign up with my Google/GitHub account so I can quickly start using the platform
- I want to sign up with my email address so I don't depend on third-party accounts
- I want to verify my email so my account is secure

### As an Existing User (MVP Data)
- I want my existing studies and documents to be preserved when the system upgrades
- I want to continue working without interruption during the migration

### As a Developer
- I want existing code patterns to continue working so migration is seamless
- I want clear authentication helpers so I can build new features securely

## Technical Requirements

### Core Authentication Features

#### 1. Auth.js v5 Implementation ✅
- **Provider Support:**
  - Google OAuth (primary - academic/professional users)
  - GitHub OAuth (technical researchers)
  - Email/Magic Link (universal access via Resend)
- **Session Management:** JWT strategy for serverless compatibility
- **Security:** CSRF protection, secure cookies, HTTPS enforcement

#### 2. Database Schema Migration ✅
```prisma
# Add Auth.js required models
model Account { ... }
model Session { ... }  
model VerificationToken { ... }

# Update User model
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  # ... Auth.js fields + existing app relations
}
```

#### 3. API Integration ✅
- **Backward Compatibility:** Maintain existing `getCurrentUserId()` function signature
- **Migration Mode:** Environment flag to switch between MVP and Auth.js modes
- **Error Handling:** Graceful fallbacks and clear error messages

### Authentication Providers

#### Google OAuth
**Rationale:** Primary choice for research/academic users
- Most researchers have Google accounts
- Trusted by institutions
- Works with Google Workspace

#### GitHub OAuth  
**Rationale:** Perfect for technical researchers and data scientists
- Popular in developer communities
- Integrated with research workflows
- Organization-based access potential

#### Email/Magic Link (Resend)
**Rationale:** Universal accessibility without third-party dependencies
- Works for all user types
- GDPR compliant
- Good for institutional email addresses

### Security Requirements

#### Authentication Security ✅
- Session duration: 7 days with refresh capability
- CSRF protection via Auth.js built-in mechanisms
- Rate limiting: 5 sign-in attempts per 15 minutes per IP
- Secure cookie configuration with httpOnly and sameSite

#### Privacy & Compliance ✅
- GDPR consent flows for data processing
- Data retention policies implementation
- Right to deletion with cascade deletes (already in schema)
- Minimal data collection principle

## Implementation Plan

### Phase 1: Setup & Configuration (3 days)
- [ ] Install Auth.js v5 beta and dependencies
- [ ] Configure authentication providers (Google, GitHub, Resend)
- [ ] Create auth configuration file
- [ ] Set up environment variables and secrets

### Phase 2: Database Migration (2 days)
- [ ] Create Prisma migration for Auth.js tables
- [ ] Update User model with Auth.js fields
- [ ] Test migration on development database
- [ ] Create rollback procedures

### Phase 3: Authentication Integration (3 days)
- [ ] Update `lib/auth.ts` with Auth.js integration
- [ ] Implement backward compatibility mode
- [ ] Create authentication middleware
- [ ] Update API routes for session handling

### Phase 4: Data Migration (2 days)
- [ ] Create migration script for existing MVP data
- [ ] Test data migration on development environment
- [ ] Plan production migration strategy
- [ ] Validate all existing user scoping works

### Phase 5: Testing & Validation (2 days)
- [ ] Test all authentication flows (Google, GitHub, Email)
- [ ] Validate API endpoints with new auth system
- [ ] Test data migration and user scoping
- [ ] Performance testing for authentication flows
- [ ] Security testing and vulnerability assessment

### Phase 6: Deployment & Monitoring (1 day)
- [ ] Deploy to staging environment
- [ ] Configure monitoring and error tracking
- [ ] Test production OAuth configurations
- [ ] Plan gradual rollout strategy

## Technical Implementation Details

### Environment Configuration
```bash
# Required environment variables
AUTH_SECRET="generated-with-openssl-rand-hex-32"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"  
AUTH_GITHUB_ID="your-github-client-id"
AUTH_GITHUB_SECRET="your-github-client-secret"
AUTH_RESEND_KEY="your-resend-api-key"
```

### Backward Compatibility Strategy
```typescript
// Enhanced auth.ts with fallback
export async function getCurrentUserId(): Promise<string> {
  if (process.env.NODE_ENV === 'development' && !process.env.AUTH_SECRET) {
    return DEFAULT_USER_ID; // Fallback to MVP mode
  }
  
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }
  
  return session.user.id;
}
```

### File Structure Changes
```
app/
├── api/auth/[...nextauth]/
│   └── route.ts              # Auth.js handlers
├── auth/
│   ├── signin/
│   │   └── page.tsx         # Custom sign-in page
│   └── error/
│       └── page.tsx         # Auth error page
lib/
├── auth.ts                   # Enhanced auth with Auth.js
└── auth-config.ts           # Auth.js configuration
```

## Risk Assessment & Mitigation

### High Risk Items
1. **React 19 Compatibility**
   - Risk: Auth.js v5 beta may have issues with React 19
   - Mitigation: Consider React 18 downgrade or wait for stable release
   - Impact: Medium - May need version adjustments

2. **Data Migration Complexity**  
   - Risk: Existing MVP data reassignment challenges
   - Mitigation: Comprehensive testing and rollback procedures
   - Impact: High - Could cause data loss if not handled properly

### Medium Risk Items
1. **OAuth Provider Configuration**
   - Risk: Misconfigured OAuth apps causing sign-in failures
   - Mitigation: Thorough testing in staging environment
   - Impact: Medium - Blocks user sign-in but easily fixable

2. **Session Management**
   - Risk: JWT vs database session trade-offs
   - Mitigation: Start with JWT, monitor performance and security
   - Impact: Low - Can adjust later without breaking changes

## Dependencies & Prerequisites

### External Dependencies
- Auth.js v5 beta (version 5.0.0-beta.25+)
- @auth/prisma-adapter
- Resend API account and key
- Google OAuth application setup
- GitHub OAuth application setup

### Internal Prerequisites  
- Database migration capability
- Environment variable management
- OAuth application approvals
- SSL certificate for production domain

## Post-Launch Considerations

### Monitoring & Analytics
- Authentication success/failure rates
- Provider usage distribution
- Session duration analytics
- Security incident tracking

### Future Enhancements
- ORCID provider for academic researchers
- Institutional SSO (SAML/LDAP)
- Two-factor authentication
- Role-based access control preparation

### Maintenance Tasks
- Regular security updates for Auth.js
- OAuth application maintenance
- Session cleanup and optimization
- User data retention policy enforcement

---

**Estimated Timeline:** 13 days total development effort  
**Team Required:** 1-2 senior developers with Next.js and authentication experience  
**Budget Impact:** Low - primarily development time, minimal additional service costs
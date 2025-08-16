# PRD: Stripe Integration & Subscription Management
## Skate AI - Usage-Based Billing & Commercial Launch

**Document Version:** 1.0  
**Last Updated:** 2025-08-14  
**Status:** Draft  
**Priority:** Critical (Commercial Launch Enabler)  

---

## Executive Summary

This PRD outlines the implementation of Stripe-powered subscription management and usage-based billing for Skate AI's commercial launch. The system will support flexible pricing models aligned with AI platform trends, enabling sustainable revenue growth while maintaining competitive positioning against research platforms like Dovetail and Notion AI.

**Confidence Score:** 94% - Well-established Stripe patterns with Next.js, proven usage-based billing models in AI market.

## Business Context

### Current State
- **MVP Mode**: Single-user development with hardcoded user ID
- **No Monetization**: Free platform with no billing infrastructure
- **Market Position**: Pre-commercial with beta user base building
- **Revenue Requirement**: Commercial launch planned for Week 17-18 per roadmap

### Business Drivers
- **Commercial Launch**: Enable revenue generation by Week 17-18 (current roadmap)
- **Market Positioning**: Compete with $39-89/month research platforms
- **Sustainable Growth**: Usage-based model aligns costs with value delivery
- **Investor Requirements**: Demonstrate monetization capability for funding rounds

## Goals & Success Criteria

### Primary Goals
1. **Revenue Generation**: First paying customers within 4 weeks of launch
2. **Flexible Pricing**: Support multiple usage-based and subscription models
3. **Market Alignment**: Competitive pricing vs Dovetail ($89/month) and NotionAI ($10/month)
4. **Cost Management**: Variable pricing that covers AI inference costs (50-60% gross margins)
5. **Growth Platform**: Foundation for enterprise and team features

### Success Metrics
- [ ] First $1K MRR within 8 weeks of launch
- [ ] 15% freemium to paid conversion rate within 3 months
- [ ] Average revenue per user (ARPU) of $45-75/month
- [ ] 60%+ gross margins after AI and infrastructure costs
- [ ] <2% payment failure rate
- [ ] 95%+ billing automation success rate

## User Stories

### As a Research Professional
- I want flexible pricing so I only pay for what I use
- I want transparent usage tracking so I can budget and optimize
- I want team billing options so my organization can manage costs
- I want to upgrade seamlessly when I hit usage limits

### As a Budget-Conscious Academic
- I want affordable credits for small research projects
- I want to pause my subscription when not actively researching
- I want educational discounts for academic institutions
- I want clear pricing without hidden fees

### As a Business Decision Maker
- I want cost predictability through usage caps and alerts
- I want invoice management for expense reporting
- I want usage analytics to optimize team efficiency
- I want enterprise billing with annual contracts

## 🎯 **PRICING STRATEGY ACTION ITEM**

### **CRITICAL RESEARCH REQUIRED: Usage-Based Pricing Model Design**

**Deadline:** Week 16 (1 week before Stripe integration begins)  
**Owner:** Product/Business team  
**Confidence:** TBD (pending market research)

#### Research Requirements:

1. **Competitive Analysis**
   - Dovetail: $89/month unlimited, $39/month starter (50 insights)
   - NotionAI: $10/month per user with usage limits
   - Claude Pro: $20/month for heavy usage
   - Research platforms: $15K-50K annually for enterprise

2. **Cost Structure Analysis**
   - AI inference costs (Claude API): ~$0.10-0.30 per 1K tokens
   - Document processing: ~$0.05-0.15 per document
   - Vector storage: ~$0.001 per document per month
   - Stripe fees: 2.9% + $0.30 per transaction

3. **User Value Mapping**
   - Time saved per analysis (research shows 5-15 hours per study)
   - Professional consultant rates ($150-300/hour)
   - Academic research grant budgets
   - Small business research budgets

4. **Proposed Research Questions**
   - What's the maximum willingness to pay for 10 documents + 50 AI interactions?
   - How do users prefer to be billed: per document, per analysis, or monthly?
   - What usage levels trigger upgrade decisions?
   - How important are team/collaboration features vs individual pricing?

#### Pricing Model Hypotheses to Test:

**Option A: Credit-Based System** (Recommended)
```
Free Tier: 5 documents, 25 AI interactions/month
Starter: $29/month - 25 documents, 100 AI interactions
Professional: $79/month - 100 documents, 500 AI interactions  
Enterprise: $199/month - Unlimited documents, 2000 AI interactions
```

**Option B: Usage-Based (Pay-as-you-go)**
```
Document Processing: $2.99 per document (up to 20 pages)
AI Interactions: $0.50 per analysis request
Monthly Active User: $19/month base fee + usage
```

**Option C: Hybrid Model** (Market trend)
```
Base Subscription: $39/month (platform access + 20 documents)
Additional Documents: $1.99 each
Additional AI Credits: $0.25 per interaction above limit
Team Features: +$15/month per additional user
```

**Deliverable:** Detailed pricing strategy document with user research, competitive analysis, and recommended pricing tiers including:
- Target customer segments and willingness to pay
- Usage pattern analysis from beta users
- Revenue projections for each pricing model
- Implementation complexity assessment
- Go-to-market pricing strategy

---

## Technical Requirements

### Core Stripe Integration

#### 1. Subscription Management System ✅
```typescript
// Core subscription types aligned with Skate AI usage patterns
interface SubscriptionTier {
  id: string;
  name: 'free' | 'starter' | 'professional' | 'enterprise';
  monthlyPrice: number;
  features: {
    documentsPerMonth: number;
    aiInteractionsPerMonth: number;
    studiesLimit: number;
    teamMembers: number;
    exportFormats: string[];
    prioritySupport: boolean;
  };
}

interface UsageMetrics {
  documentsProcessed: number;
  aiInteractionsUsed: number;
  storageUsedMB: number;
  teamMembersActive: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
}
```

#### 2. Usage Tracking & Billing ✅
```typescript
// Usage-based billing aligned with AI platform patterns
interface UsageBilling {
  userId: string;
  billingPeriod: Date;
  baseSubscription: SubscriptionTier;
  overageCharges: {
    additionalDocuments: number; // $1.99 each over limit
    additionalInteractions: number; // $0.25 each over limit
    additionalStorage: number; // $0.10 per GB over 5GB
  };
  totalAmount: number;
  stripeInvoiceId: string;
}
```

#### 3. Pricing Configuration ✅
```typescript
// Flexible pricing system supporting multiple models
interface PricingConfig {
  tiers: SubscriptionTier[];
  usageRates: {
    documentProcessing: number; // Base cost per document
    aiInteraction: number; // Cost per AI analysis request
    storageGB: number; // Monthly storage cost per GB
    teamMemberSeat: number; // Additional team member cost
  };
  discounts: {
    academicDiscount: number; // 40% discount for .edu emails
    annualDiscount: number; // 20% discount for annual billing
    teamDiscount: number; // 15% discount for 5+ team members
  };
}
```

### Database Schema Extensions

#### Subscription Management Tables
```prisma
model Subscription {
  id                String    @id @default(cuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id])
  stripeCustomerId  String    @unique
  stripeSubscriptionId String? @unique
  
  // Subscription Details
  tier              SubscriptionTier @default(FREE)
  status            SubscriptionStatus @default(ACTIVE)
  currentPeriodStart DateTime
  currentPeriodEnd  DateTime
  
  // Usage Tracking
  documentsUsed     Int       @default(0)
  aiInteractionsUsed Int      @default(0)
  storageUsedMB     Float     @default(0)
  
  // Billing
  monthlyAmount     Float?
  lastPaymentDate   DateTime?
  nextBillingDate   DateTime?
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  usageRecords      UsageRecord[]
  invoices          Invoice[]
}

model UsageRecord {
  id             String      @id @default(cuid())
  subscriptionId String
  subscription   Subscription @relation(fields: [subscriptionId], references: [id])
  
  // Usage Details
  eventType      UsageEventType
  quantity       Float
  cost           Float
  
  // Context
  studyId        String?
  documentId     String?
  chatId         String?
  
  // Metadata
  timestamp      DateTime    @default(now())
  billingPeriod  String      // "2025-01" for aggregation
  metadata       Json?       // Additional event data
}

model Invoice {
  id                String       @id @default(cuid())
  subscriptionId    String
  subscription      Subscription @relation(fields: [subscriptionId], references: [id])
  
  // Stripe Details
  stripeInvoiceId   String       @unique
  stripePaymentIntentId String?
  
  // Invoice Details
  subtotal          Float
  taxAmount         Float?
  totalAmount       Float
  currency          String       @default("usd")
  
  // Status
  status            InvoiceStatus
  paidAt            DateTime?
  dueDate           DateTime
  
  // Billing Period
  periodStart       DateTime
  periodEnd         DateTime
  
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
}

enum SubscriptionTier {
  FREE
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  INCOMPLETE
  TRIALING
}

enum UsageEventType {
  DOCUMENT_UPLOADED
  DOCUMENT_PROCESSED
  AI_INTERACTION
  STORAGE_USED
  TEAM_MEMBER_ADDED
}

enum InvoiceStatus {
  DRAFT
  OPEN
  PAID
  VOID
  UNCOLLECTIBLE
}
```

### Stripe Integration Architecture

#### 1. Customer & Subscription Management
```typescript
// lib/stripe/customer.ts
export class StripeCustomerManager {
  async createCustomer(user: User): Promise<Stripe.Customer> {
    return await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user.id,
        source: 'skate-ai'
      }
    });
  }

  async createSubscription(
    customerId: string, 
    priceId: string,
    tier: SubscriptionTier
  ): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        tier: tier,
        platform: 'skate-ai'
      }
    });
  }
}
```

#### 2. Usage-Based Billing Implementation
```typescript
// lib/stripe/usage-billing.ts
export class UsageBillingManager {
  async recordUsage(
    subscriptionId: string,
    eventType: UsageEventType,
    quantity: number
  ): Promise<void> {
    // Record in database for analytics
    await prisma.usageRecord.create({
      data: {
        subscriptionId,
        eventType,
        quantity,
        cost: this.calculateCost(eventType, quantity),
        billingPeriod: format(new Date(), 'yyyy-MM')
      }
    });

    // Send to Stripe for billing (if metered billing)
    if (this.isMeteredEvent(eventType)) {
      await stripe.subscriptionItems.createUsageRecord(
        subscriptionId,
        {
          quantity: Math.ceil(quantity),
          timestamp: Math.floor(Date.now() / 1000),
          action: 'increment'
        }
      );
    }
  }

  async calculateMonthlyBill(subscriptionId: string): Promise<BillingCalculation> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { usageRecords: true }
    });

    const currentPeriod = format(new Date(), 'yyyy-MM');
    const usage = subscription.usageRecords
      .filter(record => record.billingPeriod === currentPeriod);

    return {
      baseSubscription: subscription.monthlyAmount || 0,
      usageCharges: usage.reduce((sum, record) => sum + record.cost, 0),
      total: baseSubscription + usageCharges
    };
  }
}
```

#### 3. Webhook Handler for Real-time Updates
```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;
    
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
      break;
  }

  return NextResponse.json({ received: true });
}
```

### Usage Tracking Integration

#### Document Processing Billing
```typescript
// lib/billing/document-usage.ts
export async function trackDocumentProcessing(
  userId: string,
  document: Document
): Promise<void> {
  const subscription = await getUserSubscription(userId);
  
  // Check limits
  const currentUsage = await getCurrentPeriodUsage(subscription.id);
  const tier = subscription.tier;
  
  if (currentUsage.documentsProcessed >= getTierLimit(tier, 'documents')) {
    // Charge overage or block based on plan
    if (tier === 'FREE') {
      throw new Error('Document limit reached. Please upgrade your plan.');
    } else {
      // Record overage charge
      await recordUsage(subscription.id, 'DOCUMENT_PROCESSED', 1);
    }
  } else {
    // Within limits, just track usage
    await incrementUsageCounter(subscription.id, 'documentsUsed', 1);
  }
  
  // Always track for analytics
  await recordUsage(subscription.id, 'DOCUMENT_UPLOADED', 1);
}
```

#### AI Interaction Billing
```typescript
// lib/billing/ai-usage.ts
export async function trackAIInteraction(
  userId: string,
  interaction: {
    studyId: string;
    chatId: string;
    tokensUsed: number;
    interactionType: 'search' | 'analysis' | 'summary';
  }
): Promise<void> {
  const subscription = await getUserSubscription(userId);
  const cost = calculateAICost(interaction.tokensUsed, interaction.interactionType);
  
  await recordUsage(subscription.id, 'AI_INTERACTION', 1, {
    tokensUsed: interaction.tokensUsed,
    interactionType: interaction.interactionType,
    studyId: interaction.studyId,
    chatId: interaction.chatId,
    cost
  });
  
  // Update subscription usage counter
  await incrementUsageCounter(subscription.id, 'aiInteractionsUsed', 1);
}
```

## Implementation Plan

### Phase 1: Stripe Foundation Setup (Week 17) 
- [ ] **Day 1-2:** Stripe account setup, webhook configuration, environment variables
- [ ] **Day 3-4:** Database schema migration for subscription tables
- [ ] **Day 5:** Basic Stripe integration (customer creation, simple subscriptions)
- [ ] **Day 6-7:** Testing and webhook implementation

### Phase 2: Usage Tracking & Billing Logic (Week 18)
- [ ] **Day 1-2:** Usage tracking integration in document processing pipeline
- [ ] **Day 3-4:** AI interaction billing and cost calculation system
- [ ] **Day 5:** Subscription tier limits and overage handling
- [ ] **Day 6-7:** Billing calculation and invoice generation testing

### Phase 3: User Interface & Customer Portal (Week 18-19)
- [ ] **Day 1-2:** Subscription management UI (upgrade/downgrade flows)
- [ ] **Day 3-4:** Usage dashboard and billing history interface
- [ ] **Day 5:** Payment method management and customer portal
- [ ] **Day 6-7:** Integration testing and user experience validation

### Phase 4: Production Launch & Monitoring (Week 19-20)
- [ ] **Day 1-2:** Production Stripe configuration and security audit
- [ ] **Day 3-4:** Soft launch with beta users, payment flow testing
- [ ] **Day 5:** Full commercial launch with pricing enforcement
- [ ] **Day 6-7:** Monitoring, analytics setup, and optimization

## Prioritization & Roadmap Integration

### **Updated Priority Placement**

Based on the existing roadmap analysis, Stripe integration should be inserted as follows:

#### **Roadmap Priority Score: 33 (CRITICAL+)**

| **Criteria** | **Score** | **Justification** |
|--------------|-----------|-------------------|
| **Impact** | 10 | Revenue enabler, commercial launch requirement |
| **Effort** | 6 | Well-established patterns, moderate complexity |
| **Urgency** | 9 | Blocking commercial launch (Week 17-18 deadline) |
| **Risk** | 2 | Proven Stripe + Next.js patterns, low risk |

#### **Recommended Placement: Week 15-18**

**Current Roadmap Adjustment:**
- **Week 15:** Beta signup completion + Stripe setup begins
- **Week 16:** Pricing research completion (CRITICAL ACTION ITEM)
- **Week 17:** Core Stripe integration (as currently planned)
- **Week 18:** Usage tracking + UI implementation (expanded scope)
- **Week 19:** Launch preparation + beta user migration
- **Week 20:** Commercial launch with full billing

#### **Dependencies & Prerequisites**
1. **Authentication System** (Week 12-14) - REQUIRED for user management
2. **Analytics & Monitoring** (Week 5-7) - REQUIRED for usage tracking
3. **Pricing Strategy Research** (Week 16) - CRITICAL for billing implementation
4. **Beta Signup Page** (Week 15) - REQUIRED for customer acquisition

#### **Risk Mitigation**
- **Payment Integration Testing**: 2 weeks parallel development with authentication
- **Pricing Strategy Validation**: Complete by Week 16 to avoid implementation delays
- **Usage Tracking**: Build on existing analytics foundation from Week 5-7
- **Customer Migration**: Gradual rollout to beta users before full launch

## Cost Analysis & Revenue Projections

### Implementation Costs
- **Development Team**: 1 senior developer × 4 weeks = $20K-30K
- **Stripe Fees**: 2.9% + $0.30 per transaction
- **Ongoing Maintenance**: $5K-10K annually

### Revenue Projections (Optimistic)
**Month 1-3 (Launch Period):**
- Beta users: 50 paying customers × $45 ARPU = $2,250 MRR
- Organic growth: +25 customers/month

**Month 4-6 (Growth Period):**
- Customer base: 150 paying customers × $52 ARPU = $7,800 MRR
- Upselling to higher tiers increases ARPU

**Month 7-12 (Scale Period):**
- Customer base: 400 paying customers × $61 ARPU = $24,400 MRR
- Enterprise customers increase average revenue

**Annual Revenue Target**: $180K-300K in Year 1

### Cost Structure Analysis
```
Revenue per Customer: $45-75/month
AI Costs: $8-15/month (20-25% of revenue)
Stripe Fees: $1.50-2.50/month (3-4% of revenue)  
Infrastructure: $2-5/month (5-8% of revenue)
Gross Margin: 65-75% (industry target: 60%+)
```

## Risk Assessment & Mitigation

### High Risk Items
1. **Pricing Strategy Uncertainty**
   - Risk: Wrong pricing model impacts adoption and revenue
   - Mitigation: Complete pricing research by Week 16, A/B testing capability
   - Impact: High - Could require pricing pivots post-launch

2. **Usage Tracking Accuracy**  
   - Risk: Billing discrepancies damage customer trust
   - Mitigation: Comprehensive testing, usage audit trails, dispute resolution
   - Impact: High - Could cause churn and billing disputes

### Medium Risk Items
1. **Stripe Integration Complexity**
   - Risk: Webhook reliability and payment processing edge cases
   - Mitigation: Thorough testing, idempotent webhook handling, monitoring
   - Impact: Medium - Affects billing automation but manageable

2. **Customer Migration from Beta**
   - Risk: Beta users reluctant to pay, churn during transition
   - Mitigation: Grandfather beta users, gradual feature restrictions, clear value communication
   - Impact: Medium - Affects initial revenue but temporary

## Dependencies & Prerequisites

### External Dependencies
- **Stripe Account Setup**: Business verification and approval (1-3 days)
- **Tax Configuration**: State/international tax setup via Stripe Tax
- **Banking**: Business account for Stripe payouts
- **Legal**: Terms of service and privacy policy updates for billing

### Internal Prerequisites  
- **Authentication System**: Complete user management (Week 12-14)
- **Analytics Infrastructure**: Usage tracking foundation (Week 5-7)
- **Database Migration**: Subscription schema deployment
- **Environment Management**: Production Stripe configuration

### 🎯 **CRITICAL ACTION ITEM: Pricing Strategy Research**

**REQUIRED COMPLETION: Week 16 (before Stripe implementation)**

**Research Deliverables:**
1. **Competitive Pricing Analysis** - Detailed comparison vs Dovetail, NotionAI, research platforms
2. **User Willingness-to-Pay Research** - Beta user interviews, pricing sensitivity analysis
3. **Cost Structure Modeling** - AI costs, infrastructure, Stripe fees impact on margins  
4. **Usage Pattern Analysis** - Beta user behavior, optimal tier limits, overage triggers
5. **Go-to-Market Pricing Strategy** - Launch pricing, discount strategies, growth projections

**Success Criteria:**
- Clear pricing tiers with 60%+ gross margins
- Validated willingness-to-pay from 20+ beta users
- Competitive positioning strategy vs key competitors
- Revenue projections for 12 months post-launch

## Post-Launch Considerations

### Monitoring & Analytics
- **Revenue Metrics**: MRR, ARPU, churn rate, upgrade/downgrade patterns
- **Usage Analytics**: Feature adoption, limit utilization, overage frequency
- **Payment Health**: Success rates, failed payments, dunning management
- **Customer Satisfaction**: Billing-related support tickets, payment experience NPS

### Future Enhancements
- **Enterprise Features**: Custom contracts, volume discounts, annual billing
- **Usage Optimization**: AI-powered usage recommendations, cost optimization alerts
- **International Expansion**: Multi-currency support, regional pricing
- **Advanced Billing**: Prorated upgrades, credit systems, referral programs

### Maintenance Tasks
- **Stripe Updates**: Regular SDK updates, webhook version management
- **Price Testing**: A/B testing different pricing models and tiers
- **Tax Compliance**: Quarterly tax reporting, international tax requirements
- **Customer Success**: Proactive billing issue resolution, usage guidance

---

**Estimated Timeline:** 4 weeks total development effort (Weeks 17-20)  
**Team Required:** 1 senior full-stack developer with payment integration experience  
**Budget Impact:** $25K-35K development + 3-4% ongoing revenue in fees  
**ROI Timeline:** Break-even within 8-12 weeks of launch, 300-500% ROI within 12 months
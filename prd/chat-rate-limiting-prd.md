# PRD: Chat Rate Limiting Implementation

**Created:** August 13, 2025  
**Status:** Draft  
**Priority:** High  
**Estimated Implementation:** 2-3 weeks  

## Executive Summary

Implement comprehensive rate limiting for Skate AI's chat functionality to prevent abuse, control costs, and ensure fair resource allocation across users. This system will protect against spam, prevent API cost overruns, and maintain service quality during high traffic periods.

## Problem Statement

Currently, Skate AI has no rate limiting on chat interactions, creating several risks:

1. **Cost Control Risk**: Unlimited AI API calls could result in unexpected high costs
2. **Service Abuse**: No protection against spam or malicious usage patterns
3. **Resource Exhaustion**: Heavy usage could impact performance for all users
4. **Fair Usage**: No mechanism to ensure equitable access during peak times

## Success Metrics

- **Primary**: 99.9% uptime for chat service during peak usage
- **Cost**: AI API costs remain within 10% of projected budget
- **User Experience**: <3% of legitimate requests blocked by rate limiting
- **Abuse Prevention**: 100% reduction in sustained spam/abuse patterns

## Solution Overview

Implement a multi-layered rate limiting system using token bucket algorithm with progressive user feedback and graceful degradation.

### Architecture Components

1. **Edge Middleware Rate Limiting** (Vercel Edge + Upstash Redis)
2. **API Route Protection** with detailed error responses
3. **Client-Side Rate Limit Awareness** with UI feedback
4. **Token Usage Tracking** for cost control
5. **Progressive Degradation** with queue system

## Detailed Requirements

### Phase 1: Basic Rate Limiting (Week 1)

#### 1.1 Edge Middleware Implementation
- **Requirement**: Implement Vercel Edge middleware with @upstash/ratelimit
- **Rate Limits**: 
  - 10 messages per minute per IP (sliding window)
  - 100 messages per hour per IP (token bucket)
- **Response Headers**: Include X-RateLimit-* headers for client awareness
- **Acceptance Criteria**:
  - [✅] Middleware blocks requests exceeding limits
  - [✅] Proper rate limit headers returned
  - [✅] 429 status code for blocked requests

#### 1.2 API Route Protection
- **Requirement**: Protect `/api/chat/*` endpoints with rate limiting
- **Implementation**: Token bucket algorithm (100 tokens, 10/10s refill rate)
- **Error Handling**: Structured JSON error responses with retry information
- **Acceptance Criteria**:
  - [✅] API routes return proper error responses
  - [✅] Rate limit info included in response headers
  - [✅] Logging for rate limit events

### Phase 2: User Experience Enhancement (Week 1-2)

#### 2.1 Client-Side Rate Limit Awareness
- **Requirement**: Display rate limit status to users
- **Components**:
  - Rate limit indicator showing remaining requests
  - Warning when approaching limits (at 20% remaining)
  - Blocked state UI with reset timer
- **Acceptance Criteria**:
  - [✅] Users see remaining request count
  - [✅] Clear messaging when rate limited
  - [✅] Reset timer shows countdown

#### 2.2 Progressive Degradation
- **Requirement**: Graceful handling of rate-limited requests
- **Implementation**:
  - Queue system for burst requests
  - Delayed processing with progress indicators
  - Fallback responses for less critical features
- **Acceptance Criteria**:
  - [✅] Queued requests processed when rate limit resets
  - [✅] Users informed of queue status
  - [✅] No lost messages due to rate limiting

### Phase 3: Advanced Features (Week 2-3)

#### 3.1 Token-Based Rate Limiting
- **Requirement**: Limit based on actual AI token usage
- **Implementation**:
  - Track estimated tokens per request
  - Monthly token budgets per user
  - Cost-based rate limiting
- **Limits**:
  - 100,000 tokens per month per user
  - 10,000 tokens per hour burst capacity
- **Acceptance Criteria**:
  - [✅] Token usage tracked accurately
  - [✅] Users blocked when exceeding token budget
  - [✅] Token usage displayed to users

#### 3.2 Monitoring and Analytics
- **Requirement**: Track rate limiting effectiveness
- **Metrics**:
  - Rate limit hit frequency
  - User behavior patterns
  - Cost per user analysis
  - Service performance during limits
- **Acceptance Criteria**:
  - [✅] Dashboard showing rate limit metrics
  - [✅] Alerts for unusual patterns
  - [✅] Cost tracking per user

## Technical Implementation

### Technology Stack
- **Rate Limiting**: @upstash/ratelimit v2.0+
- **Storage**: Vercel KV (Upstash Redis)
- **Queue System**: Bull Queue with Redis
- **Monitoring**: Custom analytics + Vercel Analytics

### Environment Configuration
```bash
# Required environment variables
KV_URL="rediss://..."
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."
REDIS_URL="redis://..." # For queue system
```

### Rate Limit Configuration
```typescript
// Proposed rate limits
const RATE_LIMITS = {
  messages_per_minute: 10,    // Prevent spam
  messages_per_hour: 100,     // Fair usage
  tokens_per_month: 100000,   // Cost control
  burst_capacity: 50          // Allow natural conversation
};
```

## User Experience Design

### Rate Limit States
1. **Normal**: Green indicator, shows remaining requests
2. **Warning**: Orange indicator at 20% remaining
3. **Limited**: Red indicator with reset timer
4. **Queued**: Blue indicator showing queue position

### Error Messages
- **Friendly**: "You're chatting quite a bit! Please wait [X] seconds before your next message."
- **Informative**: Include reset time and remaining quota
- **Actionable**: Suggest alternatives (review previous responses, export chat)

## Risk Assessment & Mitigation

### High Risks
1. **Legitimate Users Blocked**: 
   - *Mitigation*: Conservative limits, burst capacity, user feedback
2. **Poor User Experience**:
   - *Mitigation*: Progressive degradation, clear messaging
3. **Implementation Complexity**:
   - *Mitigation*: Phased approach, start with simple limits

### Medium Risks
1. **Cost Overruns**: Upstash Redis costs at scale
2. **Performance Impact**: Additional latency from rate checking
3. **User Churn**: Frustration with limits

## Success Criteria

### Phase 1 Success Metrics
- ✅ 100% of API endpoints protected
- ✅ 429 errors properly handled in UI
- ✅ Rate limit headers included in all responses
- ✅ No service degradation for normal usage patterns

### Phase 2 Success Metrics
- ✅ <5% user complaints about rate limiting UX
- ✅ 95% of rate-limited users understand why
- ✅ Queue system handles 100% of burst traffic

### Phase 3 Success Metrics
- ✅ Token usage tracking within 5% accuracy
- ✅ Monthly AI costs stay within budget
- ✅ Monitoring dashboard provides actionable insights

## Questions & Assumptions

### Questions Requiring Clarification - RESOLVED
1. **User Tiers**: ✅ Single-user MVP model continues
2. **Geographic Limits**: ✅ No geographic differentiation needed
3. **Business Hours**: ✅ Standard limits apply 24/7
4. **Study Context**: ✅ Limits per user, not per study

### Current Assumptions - CONFIRMED
- ✅ Single-user MVP model continues short-term
- ✅ Current Anthropic API costs are predictable
- ✅ Users primarily access from single devices
- ✅ Research sessions are typically 10-20 messages
- ✅ Budget: ~$20/month for Redis is acceptable
- ✅ Appeals via email to support

## Implementation Timeline

**Week 1**: Basic rate limiting + client awareness  
**Week 2**: Progressive degradation + token tracking  
**Week 3**: Monitoring + optimization  

## Appendix: Technical Specifications

### API Endpoints Affected
- `POST /api/chat/stream` - Primary chat endpoint
- `POST /api/chat/tools` - Tool calling endpoint  
- `GET /api/chat/history` - Chat history (lower limits)

### Database Schema Changes
```sql
-- New table for tracking rate limits
CREATE TABLE user_rate_limits (
  user_id UUID REFERENCES users(id),
  month INTEGER,
  year INTEGER,
  tokens_used INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```
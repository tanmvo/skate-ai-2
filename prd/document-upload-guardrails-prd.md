# PRD: Document Upload Security & Safety Guardrails

**Created:** August 13, 2025  
**Status:** Draft  
**Priority:** High  
**Estimated Implementation:** 3-4 weeks  

## Executive Summary

Implement comprehensive security and safety guardrails for document uploads to protect Skate AI against malicious files, inappropriate content, privacy violations, and legal compliance issues. This system will ensure user safety while maintaining research workflow efficiency.

## Problem Statement

Currently, Skate AI's document upload system lacks security guardrails, creating several critical risks:

1. **Security Vulnerabilities**: No protection against malware or malicious files
2. **Privacy Violations**: Risk of processing PII without proper handling
3. **Legal Compliance**: No GDPR/privacy law compliance mechanisms
4. **Content Safety**: No protection against inappropriate or harmful content
5. **Resource Abuse**: No limits on upload size, frequency, or storage usage

## Success Metrics

- **Security**: 100% of uploaded files scanned for malware before processing
- **Privacy**: 99%+ accuracy in PII detection and redaction
- **Compliance**: Full GDPR Article 15 (export) and 17 (deletion) support
- **User Experience**: <5 second average processing time for typical documents
- **Cost Control**: Document processing costs remain under $0.10 per document

## Solution Overview

Implement a multi-layered security system with file validation, content scanning, PII protection, and compliance features using both cloud services and self-hosted components.

### Architecture Components

1. **File Validation Pipeline** (client + server-side)
2. **Security Scanning** (ClamAV + cloud services)
3. **Content Safety & PII Detection** (AWS Comprehend)
4. **Sandboxed Processing** (Docker containers)
5. **Compliance & Audit Logging** (GDPR compliance)

## Detailed Requirements

### Phase 1: Basic File Security (Week 1)

#### 1.1 File Validation System
- **Requirement**: Comprehensive file validation before processing
- **Validations**:
  - File extension whitelist: PDF, DOCX, DOC, TXT only
  - MIME type verification matching extensions
  - Magic byte validation for file integrity
  - File size limits: 50MB maximum per file
  - Filename sanitization and path traversal protection
- **Acceptance Criteria**:
  - [✅] Only allowed file types accepted
  - [✅] File content matches declared type
  - [✅] Malicious filenames rejected
  - [✅] Size limits enforced

#### 1.2 Basic Malware Scanning
- **Requirement**: Scan all uploaded files for malware
- **Implementation**: ClamAV integration with automatic signature updates
- **Process**:
  - Files saved to temporary quarantine directory
  - ClamAV scan before processing
  - Infected files quarantined and deleted
  - Clean files moved to processing queue
- **Acceptance Criteria**:
  - [✅] All files scanned before processing
  - [✅] Infected files blocked and logged
  - [✅] Clean files processed normally

### Phase 2: Content Safety & Privacy (Week 2)

#### 2.1 PII Detection and Redaction
- **Requirement**: Detect and handle personally identifiable information
- **Implementation**: AWS Comprehend PII detection service
- **Protected Data Types**:
  - Social Security Numbers
  - Credit card numbers
  - Phone numbers
  - Email addresses
  - Physical addresses
  - Names (when in sensitive contexts)
- **Actions**:
  - Detection with confidence scoring
  - Automatic redaction for high-risk PII
  - User notification for potential PII found
  - Option to proceed with redacted version
- **Acceptance Criteria**:
  - [✅] 99%+ accuracy in PII detection
  - [✅] Automatic redaction of high-risk PII
  - [✅] User consent flow for PII handling

#### 2.2 Content Moderation
- **Requirement**: Screen uploaded content for inappropriate material
- **Implementation**: Google Cloud AutoML content classification
- **Screening Categories**:
  - Explicit sexual content
  - Violence and graphic content
  - Hate speech and discrimination
  - Illegal content
  - Copyright-infringing material
- **Process**:
  - Text extraction and analysis
  - Content classification with confidence scores
  - Human review queue for borderline cases
  - User notification for rejected content
- **Acceptance Criteria**:
  - [✅] Inappropriate content blocked
  - [✅] Clear user feedback on rejections
  - [✅] Appeals process for false positives

### Phase 3: Advanced Security & Processing (Week 3)

#### 3.1 Sandboxed File Processing
- **Requirement**: Process files in isolated environment
- **Implementation**: Docker containers with limited resources
- **Security Measures**:
  - Isolated filesystem with no network access
  - Memory and CPU limits (512MB RAM, 1 CPU core)
  - Temporary processing directory per document
  - Automatic cleanup after processing
  - Process timeout (5 minutes maximum)
- **Container Specifications**:
  - Node.js runtime with document processing libraries
  - ClamAV for additional scanning
  - No external network access
  - Read-only base filesystem
- **Acceptance Criteria**:
  - [✅] All file processing occurs in sandbox
  - [✅] Resource limits enforced
  - [✅] Automatic cleanup prevents data leaks

#### 3.2 Upload Rate Limiting
- **Requirement**: Prevent abuse through upload frequency limits
- **Implementation**: Redis-backed rate limiting
- **Limits**:
  - 10 uploads per hour per user
  - 100MB total upload size per day per user
  - 5 concurrent uploads maximum
- **User Experience**:
  - Progress indicators for large files
  - Queue position display
  - Estimated processing time
- **Acceptance Criteria**:
  - [✅] Rate limits prevent abuse
  - [✅] Clear user feedback on limits
  - [✅] Graceful handling of limit breaches

### Phase 4: Compliance & Monitoring (Week 4)

#### 4.1 Privacy Compliance Features (GDPR + CCPA)
- **Requirement**: GDPR-compliant by default (covers most privacy laws)
- **Core Data Subject Rights**:
  - **Data Export**: Machine-readable JSON format
  - **Data Deletion**: Complete erasure with verification
  - **Transparency**: Clear privacy policy and data usage
- **Implementation**:
  - User data export API endpoint
  - Secure data deletion with verification
  - Basic audit logs for compliance
  - Email-based request handling
- **Acceptance Criteria**:
  - [✅] Complete user data export in JSON format
  - [✅] Verified data deletion (not just soft delete)
  - [✅] Email workflow for handling requests
  - [✅] Privacy policy covers GDPR + CCPA basics

#### 4.2 Audit Logging & Monitoring
- **Requirement**: Comprehensive logging for security and compliance
- **Log Events**:
  - File upload attempts (success/failure)
  - Security scan results
  - PII detection events
  - Content moderation decisions
  - Data access and deletion
  - Rate limiting events
- **Storage**: Separate secure database with 7-year retention
- **Monitoring**: Real-time alerts for security events
- **Acceptance Criteria**:
  - [✅] All security events logged
  - [✅] Real-time monitoring dashboard
  - [✅] Automated alerts for threats

## Technical Implementation

### Technology Stack
- **File Validation**: Zod schemas + custom validation
- **Malware Scanning**: ClamAV (self-hosted) + VirusTotal API
- **PII Detection**: AWS Comprehend
- **Content Moderation**: Google Cloud AutoML
- **Sandboxing**: Docker containers
- **Rate Limiting**: Upstash Redis
- **Audit Logging**: PostgreSQL dedicated schema

### Environment Configuration
```bash
# Security Services
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
GOOGLE_CLOUD_PROJECT_ID="..."
GOOGLE_CLOUD_KEY_FILE="service-account.json"
VIRUSTOTAL_API_KEY="..." # Optional

# Storage
SECURE_UPLOAD_PATH="/app/secure-uploads"
QUARANTINE_PATH="/app/quarantine"
PROCESSING_TEMP_PATH="/app/temp-processing"

# Rate Limiting
REDIS_URL="redis://..."
MAX_FILE_SIZE_MB=50
MAX_DAILY_UPLOADS=10
```

### File Processing Pipeline
```typescript
// Proposed processing flow
const PROCESSING_PIPELINE = [
  'file_validation',      // Extension, MIME, size checks
  'malware_scan',         // ClamAV + VirusTotal
  'content_extraction',   // Text extraction in sandbox
  'pii_detection',        // AWS Comprehend
  'content_moderation',   // Google Cloud AutoML
  'final_processing',     // Vector embedding generation
  'cleanup'              // Temp file removal
];
```

## User Experience Design

### Upload Flow States
1. **File Selection**: Drag/drop or file picker with validation
2. **Uploading**: Progress bar with speed and ETA
3. **Security Scanning**: "Checking file safety..." with estimated time
4. **Content Processing**: "Analyzing document..." with progress steps
5. **PII Warning**: If PII detected, show redaction options
6. **Success/Failure**: Clear messaging with next steps

### Error Handling
- **File Rejected**: Specific reason with suggested fixes
- **Security Issue**: "File failed security scan" without details
- **PII Detected**: Option to redact and continue or cancel
- **Rate Limited**: Clear message with reset time

## Risk Assessment & Mitigation

### High Risks
1. **False Positives in Scanning**: 
   - *Mitigation*: Multi-engine scanning, human review queue
2. **Performance Impact**: 
   - *Mitigation*: Asynchronous processing, progress indicators
3. **Privacy Violations**: 
   - *Mitigation*: PII redaction, secure processing, audit logs

### Medium Risks
1. **Service Costs**: AWS/Google Cloud API costs at scale
2. **Processing Delays**: Security scanning adds latency
3. **Compliance Complexity**: GDPR implementation complexity

### Low Risks
1. **False Negatives**: Advanced threats bypassing detection
2. **Service Dependencies**: Cloud service outages
3. **Storage Costs**: Audit log and quarantine storage

## Cost Analysis

### Implementation Costs
- **Development**: 3-4 weeks @ $150/hour = $18,000-24,000
- **Cloud Services Setup**: $500 initial setup
- **Security Tools**: ClamAV (free), VirusTotal ($100/month)

### Operational Costs (per 1,000 documents)
- **AWS Comprehend PII Detection**: ~$1.00
- **Google Cloud AutoML**: ~$2.00  
- **VirusTotal API**: ~$0.50
- **Storage & Compute**: ~$0.50
- **Total per 1,000 docs**: ~$4.00 ($0.004/document)

### ROI Calculation
- **Risk Prevention Value**: $50,000+ (single major security incident)
- **Compliance Cost Avoidance**: $25,000+ (GDPR fine prevention)
- **Implementation Cost**: $24,000 maximum
- **Break-even**: 1 prevented incident or compliance issue

## Success Criteria

### Phase 1 Success Metrics
- ✅ 100% of uploads pass security validation
- ✅ 0 malware files reach processing stage
- ✅ File processing completes within SLA times
- ✅ User upload success rate >95%

### Phase 2 Success Metrics  
- ✅ PII detection accuracy >99%
- ✅ Content moderation false positive rate <2%
- ✅ User satisfaction with safety features >90%
- ✅ Zero privacy violations reported

### Phase 3 Success Metrics
- ✅ All file processing occurs in sandbox
- ✅ Rate limiting prevents 100% of abuse attempts
- ✅ Processing resource usage stays within limits
- ✅ Zero security breaches from file uploads

### Phase 4 Success Metrics
- ✅ Full GDPR compliance verification
- ✅ Audit logs capture 100% of required events
- ✅ Data export/deletion requests completed within 30 days
- ✅ Security monitoring catches threats in real-time

## Questions & Assumptions

### Questions Requiring Clarification - RESOLVED
1. **Geographical Compliance**: ✅ GDPR-compliant by default (covers CCPA + most others)
2. **Content Types**: ✅ Keep current: PDF, DOCX, DOC, TXT only
3. **Human Review**: ✅ Appeals via email to support
4. **Data Retention**: ✅ 7 years for audit logs (standard compliance)
5. **Multi-language**: ✅ English focus for MVP, expand later if needed

### Current Assumptions - CONFIRMED
- ✅ Research documents are primarily in English
- ✅ Users upload legitimate research materials
- ✅ Processing latency of 5-10 seconds is acceptable
- ✅ Cloud service costs scale linearly with usage
- ✅ Single-user MVP model continues short-term
- ✅ Budget: ~$4 per 1,000 documents is acceptable
- ✅ Minimal compliance approach (GDPR-by-default)

## Implementation Timeline

**Week 1**: File validation + basic malware scanning  
**Week 2**: PII detection + content moderation  
**Week 3**: Sandboxed processing + rate limiting  
**Week 4**: GDPR compliance + monitoring  

## Appendix: Technical Specifications

### API Endpoints
```typescript
POST /api/upload/validate    // Pre-upload validation
POST /api/upload/document   // Main upload endpoint  
GET  /api/upload/status/:id  // Processing status
POST /api/data/export        // GDPR data export
DELETE /api/data/delete      // GDPR data deletion
```

### Database Schema Changes
```sql
-- Security audit logs
CREATE TABLE security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  document_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Upload rate limiting
CREATE TABLE upload_rate_limits (
  user_id UUID REFERENCES users(id),
  date DATE,
  uploads_count INTEGER DEFAULT 0,
  total_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

-- Document security metadata
ALTER TABLE documents ADD COLUMN security_scan_results JSONB;
ALTER TABLE documents ADD COLUMN pii_detected BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN content_rating VARCHAR(20);
ALTER TABLE documents ADD COLUMN processing_sandbox_id VARCHAR(50);
```
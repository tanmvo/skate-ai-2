# PRD: Missing CRUD Operations Implementation
## Skate AI - Complete Document and Study Management

**Document Version:** 1.0  
**Last Updated:** 2025-08-12  
**Status:** Draft  
**Priority:** High - Critical UX Gaps  

---

## Executive Summary

This PRD addresses critical missing CRUD operations in Skate AI's document and study management system. While the foundation is solid with proper user scoping and security, key user experience features are missing, including document deletion, renaming, and file storage cleanup. These gaps create frustration and prevent users from effectively managing their research workflows.

**Confidence Score:** 99% - Clear implementation path with existing patterns and comprehensive codebase analysis.

## Current State Analysis

### ✅ **What Works Well**
- **Study Management:** Complete CRUD operations implemented
- **Document Upload:** Robust upload with processing pipeline
- **Security:** Proper user ownership validation throughout
- **Data Scoping:** All operations correctly scoped to current user
- **File Storage:** Working development and production storage systems

### ❌ **Critical Gaps Identified**
- **Document Deletion:** API endpoint missing (hook calls non-existent endpoint)
- **Document Renaming:** No ability to rename uploaded documents
- **File Storage Cleanup:** Deleted documents don't clean up physical files
- **Document Metadata:** No individual document editing capabilities
- **User Experience:** Missing confirmation dialogs and batch operations

## Business Impact

### User Experience Problems
- **Frustration:** Users cannot rename or delete documents after upload
- **Storage Waste:** Deleted documents leave orphaned files consuming storage
- **Workflow Interruption:** No way to correct upload mistakes or organize documents
- **Trust Issues:** Broken functionality (useDocuments hook expects working DELETE endpoint)

### Technical Debt Impact
- **File Storage Costs:** Orphaned files accumulate in production storage
- **User Support:** Increased support tickets for basic document management
- **Development Velocity:** Missing foundations slow feature development
- **Data Integrity:** Inconsistent state between database and file storage

## Goals & Success Criteria

### Primary Goals
1. **Complete Document CRUD:** Full create, read, update, delete operations
2. **File Storage Integration:** Automatic cleanup when documents are deleted
3. **User Experience:** Intuitive document management with confirmations
4. **Batch Operations:** Multi-select and bulk actions for power users
5. **Data Consistency:** Synchronized database and file storage states

### Success Metrics
- [ ] 100% of document operations work without errors
- [ ] File storage cleanup working for 100% of deletions
- [ ] Document renaming success rate >95%
- [ ] User satisfaction with document management >4.5/5
- [ ] Zero orphaned files in production after 30 days

## Technical Requirements

### Missing API Endpoints

#### 1. Document Individual Operations ✅
```typescript
// app/api/documents/[documentId]/route.ts
export async function GET(
  request: NextRequest, 
  { params }: { params: { documentId: string } }
) {
  // Return document details with processing status
  // Include chunk count, metadata, processing history
}

export async function PUT(
  request: NextRequest, 
  { params }: { params: { documentId: string } }
) {
  // Support fileName updates (rename)
  // Support description/metadata updates
  // Validate ownership and input
}

export async function DELETE(
  request: NextRequest, 
  { params }: { params: { documentId: string } }
) {
  // Validate document ownership
  // Delete document record and chunks (cascade)
  // Delete physical file using deleteFile()
  // Return success/error status
}
```

#### 2. Document Retry Operations ✅
```typescript
// app/api/documents/[documentId]/retry/route.ts
export async function POST(
  request: NextRequest, 
  { params }: { params: { documentId: string } }
) {
  // Retry failed document processing
  // Reset processing status
  // Re-queue for text extraction and embedding
}
```

#### 3. Batch Operations ✅
```typescript
// app/api/studies/[studyId]/documents/batch/route.ts
export async function DELETE(request: NextRequest) {
  // Bulk delete multiple documents
  // Validate ownership for all documents
  // Clean up files in batch
  // Return detailed results
}

export async function PUT(request: NextRequest) {
  // Batch update document metadata
  // Support rename operations
  // Validate all operations before executing
}
```

### Enhanced File Storage Integration

#### Integrated Cleanup System ✅
```typescript
// lib/file-storage/cleanup.ts
export async function deleteDocumentFiles(
  documentId: string, 
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete from development storage
    if (process.env.NODE_ENV === 'development') {
      await deleteFile(storagePath)
    }
    
    // Delete from Vercel Blob storage
    if (process.env.BLOB_READ_WRITE_TOKEN && storagePath.includes('blob.vercel-storage.com')) {
      await del(storagePath)
    }
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function cleanupOrphanedFiles(): Promise<{
  deletedCount: number;
  errors: string[];
}> {
  // Find files without corresponding database records
  // Delete orphaned files from both storage systems
  // Return cleanup results
}
```

### Frontend Component Enhancements

#### Document Actions Interface ✅
```typescript
// components/document/document-actions-menu.tsx
interface DocumentActionsMenuProps {
  document: Document;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onRetry?: () => void; // For failed processing
  onDownload?: () => void;
}

export function DocumentActionsMenu({ 
  document, 
  onRename, 
  onDelete, 
  onRetry,
  onDownload 
}: DocumentActionsMenuProps) {
  // Dropdown menu with actions
  // Rename modal with validation
  // Delete confirmation dialog
  // Retry option for failed documents
}
```

#### Enhanced DocumentPanel ✅
```typescript
// components/document/document-panel.tsx
// Add to existing component:
- Document multi-select checkboxes
- Bulk action toolbar
- Individual document action menus
- Processing status indicators
- Retry buttons for failed documents
```

#### Study Management Enhancements ✅
```typescript
// components/study/study-card.tsx
// Connect existing dropdown actions:
- Study rename functionality (API exists, UI missing)
- Study export options
- Study duplication (future)
```

## Implementation Specifications

### Phase 1: Core Document CRUD (Priority 1)

#### Document DELETE Endpoint
```typescript
// app/api/documents/[documentId]/route.ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const userId = await getCurrentUserId()
    const documentId = params.documentId

    // Validate ownership
    const document = await validateDocumentOwnership(documentId, userId)
    
    // Delete chunks first (cascade should handle this)
    await prisma.documentChunk.deleteMany({
      where: { documentId }
    })

    // Delete document record
    await prisma.document.delete({
      where: { id: documentId }
    })

    // Clean up physical file
    const cleanup = await deleteDocumentFiles(documentId, document.storagePath)
    
    if (!cleanup.success) {
      console.error(`File cleanup failed for document ${documentId}:`, cleanup.error)
      // Continue - database cleanup succeeded
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Document deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' }, 
      { status: 500 }
    )
  }
}
```

#### Document UPDATE Endpoint
```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const userId = await getCurrentUserId()
    const documentId = params.documentId
    const { fileName, description } = await request.json()

    // Validate ownership and input
    await validateDocumentOwnership(documentId, userId)
    
    if (fileName) {
      // Validate filename
      if (!fileName.trim() || fileName.length > 255) {
        return NextResponse.json(
          { error: 'Invalid filename' }, 
          { status: 400 }
        )
      }
    }

    // Update document
    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        ...(fileName && { fileName: fileName.trim() }),
        ...(description && { description }),
        updatedAt: new Date(),
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Document update error:', error)
    return NextResponse.json(
      { error: 'Failed to update document' }, 
      { status: 500 }
    )
  }
}
```

### Phase 2: User Experience Enhancements (Priority 2)

#### Confirmation Dialogs
```typescript
// components/ui/confirmation-dialog.tsx
interface ConfirmationDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'danger' | 'warning' | 'info'
}

// Usage in document deletion
const handleDelete = (document: Document) => {
  setConfirmDialog({
    isOpen: true,
    title: 'Delete Document',
    description: `Are you sure you want to delete "${document.fileName}"? This action cannot be undone.`,
    confirmText: 'Delete',
    type: 'danger',
    onConfirm: () => deleteDocument(document.id),
    onCancel: () => setConfirmDialog({ ...confirmDialog, isOpen: false })
  })
}
```

#### Document Rename Modal
```typescript
// components/document/rename-document-modal.tsx
interface RenameDocumentModalProps {
  document: Document
  isOpen: boolean
  onClose: () => void
  onRename: (newName: string) => void
}

export function RenameDocumentModal({ 
  document, 
  isOpen, 
  onClose, 
  onRename 
}: RenameDocumentModalProps) {
  const [newName, setNewName] = useState(document.fileName)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || newName === document.fileName) return
    
    setIsSubmitting(true)
    try {
      await onRename(newName.trim())
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  // Modal with form validation and loading states
}
```

### Phase 3: Advanced Features (Priority 3)

#### Batch Operations
```typescript
// hooks/use-batch-operations.ts
export function useBatchOperations() {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const selectDocument = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    )
  }

  const selectAll = (documentIds: string[]) => {
    setSelectedDocuments(documentIds)
  }

  const clearSelection = () => {
    setSelectedDocuments([])
  }

  const deleteBatch = async (studyId: string) => {
    if (selectedDocuments.length === 0) return
    
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/studies/${studyId}/documents/batch`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: selectedDocuments })
      })
      
      if (!response.ok) throw new Error('Batch deletion failed')
      
      clearSelection()
      return await response.json()
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    selectedDocuments,
    selectDocument,
    selectAll,
    clearSelection,
    deleteBatch,
    isProcessing
  }
}
```

## Database Schema Changes

### No Schema Changes Required ✅
The current database schema supports all required operations:
- Document model has all necessary fields
- Cascade deletes properly configured
- File storage paths tracked in storagePath/storageUrl
- Processing status tracking exists
- User ownership relationships established

## File Organization

### New Files to Create
```
/Users/tanmvo/Documents/skate-ai-2/
├── app/api/documents/[documentId]/
│   ├── route.ts              # GET, PUT, DELETE operations
│   └── retry/
│       └── route.ts          # Retry failed processing
├── components/document/
│   ├── document-actions-menu.tsx
│   ├── rename-document-modal.tsx
│   └── batch-operations-toolbar.tsx
├── lib/file-storage/
│   └── cleanup.ts            # Enhanced file cleanup
└── hooks/
    ├── use-batch-operations.ts
    └── use-document-actions.ts
```

### Files to Modify
```
├── components/document/
│   └── document-panel.tsx    # Add action menus and batch selection
├── components/study/
│   └── study-card.tsx        # Connect rename functionality
├── hooks/
│   └── use-documents.ts      # Ensure proper error handling
```

## Implementation Timeline

### Week 1: Critical Fixes (Phase 1)
- [ ] **Day 1-2:** Document DELETE endpoint implementation
- [ ] **Day 3-4:** File storage cleanup integration
- [ ] **Day 5:** Document UPDATE endpoint (rename)

### Week 2: User Experience (Phase 2)  
- [ ] **Day 1-2:** Confirmation dialogs and rename modal
- [ ] **Day 3-4:** Document actions menu integration
- [ ] **Day 5:** Study rename UI connection

### Week 3: Advanced Features (Phase 3)
- [ ] **Day 1-3:** Batch operations implementation
- [ ] **Day 4-5:** Testing and polish

### Week 4: Quality Assurance
- [ ] **Day 1-2:** Comprehensive testing
- [ ] **Day 3-4:** Bug fixes and optimization
- [ ] **Day 5:** Documentation and deployment

## Risk Assessment

### Low Risk Items ✅
- **Document DELETE API:** Simple endpoint following existing patterns
- **File cleanup integration:** Using existing deleteFile() function
- **Document rename:** Basic metadata update operation
- **UI component additions:** Following established component patterns

### Medium Risk Items ⚠️
- **Batch operations:** More complex transaction handling needed
- **File storage edge cases:** Network failures during cleanup
- **User experience testing:** Need to validate UX flows

### Mitigation Strategies
- **Comprehensive error handling:** Graceful degradation for file cleanup failures
- **Transaction safety:** Database operations in try-catch with rollback
- **User feedback:** Clear loading states and error messages
- **Testing:** Integration tests for all CRUD operations

## Success Metrics

### Technical Metrics
- [ ] Document DELETE endpoint 100% success rate
- [ ] File cleanup working for >95% of deletions
- [ ] Document rename <2 second response time
- [ ] Zero API errors in production after deployment

### User Experience Metrics
- [ ] Document management task completion rate >90%
- [ ] User satisfaction with document operations >4.5/5
- [ ] Support tickets for document issues reduced by 80%
- [ ] Feature usage: >50% of users rename documents within first week

### Business Impact Metrics
- [ ] Reduced storage costs from orphaned file cleanup
- [ ] Decreased support burden for document management
- [ ] Improved user retention from better UX
- [ ] Foundation for advanced collaboration features

---

**Estimated Timeline:** 4 weeks for complete implementation  
**Team Required:** 1-2 developers familiar with existing codebase  
**Complexity:** Low-Medium - Following existing patterns with clear requirements  
**Impact:** High - Fixes critical user experience gaps and technical debt
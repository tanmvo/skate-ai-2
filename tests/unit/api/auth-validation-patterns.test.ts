import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    study: {
      findFirst: vi.fn()
    },
    document: {
      findFirst: vi.fn()
    }
  }
}));

// Mock Auth.js
vi.mock('@/auth', () => ({
  auth: vi.fn()
}));

// Import the actual auth functions to test
import { getCurrentUserId, validateStudyOwnership, validateDocumentOwnership } from '@/lib/auth';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// Get typed mocks
const mockPrismaStudyFindFirst = vi.mocked(prisma.study.findFirst);
const mockPrismaDocumentFindFirst = vi.mocked(prisma.document.findFirst);
const mockAuth = vi.mocked(auth);

describe('Auth Validation Patterns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default auth mock
    mockAuth.mockResolvedValue({
      user: { id: 'test-user-123' }
    } as any);
  });

  describe('getCurrentUserId', () => {
    it('should return the authenticated user ID from Auth.js session', async () => {
      const userId = await getCurrentUserId();

      expect(userId).toBe('test-user-123');
      expect(mockAuth).toHaveBeenCalled();
    });

    it('should return null when no session exists', async () => {
      mockAuth.mockResolvedValue(null);

      const userId = await getCurrentUserId();

      expect(userId).toBe(null);
    });

    it('should provide consistent user scoping for rate limiting', async () => {
      const userId = await getCurrentUserId();
      const studyId = 'study_123';

      // Test rate limiting key pattern used across routes
      const rateLimitKey = `chat:${userId}:${studyId}`;

      expect(rateLimitKey).toBe('chat:test-user-123:study_123');
    });
  });

  describe('validateStudyOwnership', () => {
    it('should validate study ownership correctly', async () => {
      mockPrismaStudyFindFirst.mockResolvedValue({
        id: 'study_123',
        userId: 'test-user-123',
        name: 'Test Study'
      } as any);

      const isValid = await validateStudyOwnership('study_123');

      expect(isValid).toBe(true);
      expect(mockPrismaStudyFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'study_123',
          userId: 'test-user-123'
        }
      });
    });

    it('should reject access to non-existent studies', async () => {
      mockPrismaStudyFindFirst.mockResolvedValue(null);

      const isValid = await validateStudyOwnership('nonexistent_study');

      expect(isValid).toBe(false);
      expect(mockPrismaStudyFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'nonexistent_study',
          userId: 'test-user-123'
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaStudyFindFirst.mockRejectedValue(new Error('Database connection failed'));

      const isValid = await validateStudyOwnership('study_123');

      expect(isValid).toBe(false);
    });

    it('should enforce user scoping to prevent data leakage', async () => {
      // Simulate a study that exists but belongs to a different user
      mockPrismaStudyFindFirst.mockResolvedValue(null); // Query with userId returns null

      const isValid = await validateStudyOwnership('study_owned_by_other_user');

      expect(isValid).toBe(false);
      expect(mockPrismaStudyFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'study_owned_by_other_user',
          userId: 'test-user-123' // Must match current user
        }
      });
    });
  });

  describe('validateDocumentOwnership', () => {
    it('should validate document ownership through study relationship', async () => {
      mockPrismaDocumentFindFirst.mockResolvedValue({
        id: 'doc_123',
        fileName: 'test.pdf',
        study: {
          userId: 'test-user-123'
        }
      });

      const isValid = await validateDocumentOwnership('doc_123');

      expect(isValid).toBe(true);
      expect(mockPrismaDocumentFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'doc_123',
          study: {
            userId: 'test-user-123'
          }
        }
      });
    });

    it('should reject access to documents in studies owned by other users', async () => {
      mockPrismaDocumentFindFirst.mockResolvedValue(null);

      const isValid = await validateDocumentOwnership('doc_owned_by_other_user');

      expect(isValid).toBe(false);
      expect(mockPrismaDocumentFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'doc_owned_by_other_user',
          study: {
            userId: 'test-user-123'
          }
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaDocumentFindFirst.mockRejectedValue(new Error('Database error'));

      const isValid = await validateDocumentOwnership('doc_123');

      expect(isValid).toBe(false);
    });
  });

  describe('Cross-Route Security Patterns', () => {
    it('should use consistent error responses for unauthorized access', async () => {
      mockPrismaStudyFindFirst.mockResolvedValue(null);
      mockPrismaDocumentFindFirst.mockResolvedValue(null);

      const studyValid = await validateStudyOwnership('unauthorized_study');
      const docValid = await validateDocumentOwnership('unauthorized_doc');

      // Both should fail securely (return false, not throw errors)
      expect(studyValid).toBe(false);
      expect(docValid).toBe(false);
    });

    it('should maintain user scoping consistency across validation methods', async () => {
      const userId = await getCurrentUserId();

      // Mock successful validations
      mockPrismaStudyFindFirst.mockResolvedValue({ id: 'study_123' } as any);
      mockPrismaDocumentFindFirst.mockResolvedValue({ id: 'doc_123' } as any);

      await validateStudyOwnership('study_123');
      await validateDocumentOwnership('doc_123');

      // Both should use the same userId from getCurrentUserId()
      expect(mockPrismaStudyFindFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: userId
        })
      });

      expect(mockPrismaDocumentFindFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          study: { userId: userId }
        })
      });
    });

    it('should follow the standard API route pattern', async () => {
      // Test the common pattern used across API routes:
      // 1. Get userId
      // 2. Validate ownership  
      // 3. Return 404 if not authorized (not 403, to avoid data leakage)
      
      const userId = await getCurrentUserId();
      mockPrismaStudyFindFirst.mockResolvedValue(null);

      expect(userId).toBe('test-user-123');
      
      const isAuthorized = await validateStudyOwnership('study_123');
      expect(isAuthorized).toBe(false);
      
      // This pattern prevents revealing whether the resource exists
      // by returning the same error for both "doesn't exist" and "not authorized"
    });
  });

  describe('Auth.js Security Considerations', () => {
    it('should use Auth.js session for user authentication', async () => {
      const userId = await getCurrentUserId();

      expect(userId).toBe('test-user-123');
      expect(mockAuth).toHaveBeenCalled();
    });

    it('should scope all database queries by current user', async () => {
      mockPrismaStudyFindFirst.mockResolvedValue({ id: 'study_123' });
      
      await validateStudyOwnership('study_123');
      
      // Verify that the query includes userId filter
      const call = mockPrismaStudyFindFirst.mock.calls[0][0];
      expect(call.where).toHaveProperty('userId');
      expect(call.where.userId).toBe('test-user-123');
    });

    it('should prevent cross-user data access with Auth.js', async () => {
      // Auth.js ensures validation logic prevents access to other users' data
      mockPrismaStudyFindFirst.mockResolvedValue(null);
      
      const result = await validateStudyOwnership('study_from_different_user');
      
      expect(result).toBe(false);
      expect(mockPrismaStudyFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'study_from_different_user',
          userId: 'test-user-123' // Still enforces user scoping
        }
      });
    });
  });
});
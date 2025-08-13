import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma - moved inside vi.mock to avoid hoisting issues
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

// Mock constants
vi.mock('@/lib/constants', () => ({
  DEFAULT_USER_ID: 'usr_mvp_dev_2025',
  DEFAULT_USER: {
    id: 'usr_mvp_dev_2025',
    name: 'MVP User',
    email: 'mvp@example.com'
  }
}));

// Import the actual auth functions to test
import { getCurrentUserId, validateStudyOwnership, validateDocumentOwnership } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Get typed mocks
const mockPrismaStudyFindFirst = vi.mocked(prisma.study.findFirst);
const mockPrismaDocumentFindFirst = vi.mocked(prisma.document.findFirst);

describe('Auth Validation Patterns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentUserId', () => {
    it('should return the default user ID consistently', () => {
      const userId1 = getCurrentUserId();
      const userId2 = getCurrentUserId();
      
      expect(userId1).toBe('usr_mvp_dev_2025');
      expect(userId2).toBe('usr_mvp_dev_2025');
      expect(userId1).toBe(userId2);
    });

    it('should provide consistent user scoping for rate limiting', () => {
      const userId = getCurrentUserId();
      const studyId = 'study_123';
      
      // Test rate limiting key pattern used across routes
      const rateLimitKey = `chat:${userId}:${studyId}`;
      
      expect(rateLimitKey).toBe('chat:usr_mvp_dev_2025:study_123');
    });
  });

  describe('validateStudyOwnership', () => {
    it('should validate study ownership correctly', async () => {
      mockPrismaStudyFindFirst.mockResolvedValue({
        id: 'study_123',
        userId: 'usr_mvp_dev_2025',
        name: 'Test Study'
      });

      const isValid = await validateStudyOwnership('study_123');

      expect(isValid).toBe(true);
      expect(mockPrismaStudyFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'study_123',
          userId: 'usr_mvp_dev_2025'
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
          userId: 'usr_mvp_dev_2025'
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
          userId: 'usr_mvp_dev_2025' // Must match current user
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
          userId: 'usr_mvp_dev_2025'
        }
      });

      const isValid = await validateDocumentOwnership('doc_123');

      expect(isValid).toBe(true);
      expect(mockPrismaDocumentFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'doc_123',
          study: {
            userId: 'usr_mvp_dev_2025'
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
            userId: 'usr_mvp_dev_2025'
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
      const userId = getCurrentUserId();

      // Mock successful validations
      mockPrismaStudyFindFirst.mockResolvedValue({ id: 'study_123' });
      mockPrismaDocumentFindFirst.mockResolvedValue({ id: 'doc_123' });

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
      
      const userId = getCurrentUserId();
      mockPrismaStudyFindFirst.mockResolvedValue(null);

      expect(userId).toBe('usr_mvp_dev_2025');
      
      const isAuthorized = await validateStudyOwnership('study_123');
      expect(isAuthorized).toBe(false);
      
      // This pattern prevents revealing whether the resource exists
      // by returning the same error for both "doesn't exist" and "not authorized"
    });
  });

  describe('MVP Mode Security Considerations', () => {
    it('should use hardcoded user ID for MVP development', () => {
      const userId = getCurrentUserId();
      
      expect(userId).toBe('usr_mvp_dev_2025');
      // In production, this would validate against session/JWT tokens
    });

    it('should scope all database queries by current user', async () => {
      mockPrismaStudyFindFirst.mockResolvedValue({ id: 'study_123' });
      
      await validateStudyOwnership('study_123');
      
      // Verify that the query includes userId filter
      const call = mockPrismaStudyFindFirst.mock.calls[0][0];
      expect(call.where).toHaveProperty('userId');
      expect(call.where.userId).toBe('usr_mvp_dev_2025');
    });

    it('should prevent cross-user data access even in MVP mode', async () => {
      // Even though we use a hardcoded user, the validation logic
      // should still prevent access to other users' data
      mockPrismaStudyFindFirst.mockResolvedValue(null);
      
      const result = await validateStudyOwnership('study_from_different_user');
      
      expect(result).toBe(false);
      expect(mockPrismaStudyFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'study_from_different_user',
          userId: 'usr_mvp_dev_2025' // Still enforces user scoping
        }
      });
    });
  });
});
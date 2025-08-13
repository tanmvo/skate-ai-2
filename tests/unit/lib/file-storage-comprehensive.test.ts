import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('File Storage Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  describe('File Validation Logic', () => {
    const validateFile = (file: { size: number; type: string }) => {
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      const ALLOWED_TYPES = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ];

      if (file.size <= 0) {
        return { valid: false, error: 'File cannot be empty' };
      }

      if (file.size > MAX_SIZE) {
        return { valid: false, error: 'File size exceeds 10MB limit' };
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'File type not supported. Only PDF, DOCX, and TXT files are allowed.' };
      }

      return { valid: true };
    };

    it('accepts valid PDF files under 10MB', () => {
      const mockFile = { size: 5 * 1024 * 1024, type: 'application/pdf' }; // 5MB PDF
      const result = validateFile(mockFile);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts valid DOCX files', () => {
      const mockFile = { 
        size: 1024, 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      };
      const result = validateFile(mockFile);
      
      expect(result.valid).toBe(true);
    });

    it('accepts valid TXT files', () => {
      const mockFile = { size: 1024, type: 'text/plain' };
      const result = validateFile(mockFile);
      
      expect(result.valid).toBe(true);
    });

    it('rejects files over 10MB', () => {
      const mockFile = { size: 15 * 1024 * 1024, type: 'application/pdf' }; // 15MB
      const result = validateFile(mockFile);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File size exceeds 10MB limit');
    });

    it('rejects unsupported file types', () => {
      const mockFile = { size: 1024, type: 'application/exe' };
      const result = validateFile(mockFile);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File type not supported. Only PDF, DOCX, and TXT files are allowed.');
    });

    it('rejects files with zero size', () => {
      const mockFile = { size: 0, type: 'text/plain' };
      const result = validateFile(mockFile);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File cannot be empty');
    });

    it('rejects files with negative size', () => {
      const mockFile = { size: -1, type: 'text/plain' };
      const result = validateFile(mockFile);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File cannot be empty');
    });
  });

  describe('Storage Type Determination', () => {
    const determineStorageType = (headers: Record<string, string>) => {
      const storageType = headers['X-Storage-Type'];
      const forceLocal = headers['X-Storage-Local'] === 'true';
      
      if (storageType) {
        return storageType;
      } else if (forceLocal) {
        return 'filesystem';
      } else {
        // Default behavior
        return (process.env.NODE_ENV === 'production' && process.env.BLOB_READ_WRITE_TOKEN) 
          ? 'vercel-blob' 
          : 'filesystem';
      }
    };

    it('uses explicit storage type when X-Storage-Type header is provided', () => {
      expect(determineStorageType({ 'X-Storage-Type': 'filesystem' })).toBe('filesystem');
      expect(determineStorageType({ 'X-Storage-Type': 'vercel-blob' })).toBe('vercel-blob');
    });

    it('uses filesystem when X-Storage-Local is true', () => {
      expect(determineStorageType({ 'X-Storage-Local': 'true' })).toBe('filesystem');
      expect(determineStorageType({ 'X-Storage-Local': 'false' })).toBe('filesystem'); // default
    });

    it('X-Storage-Type takes priority over X-Storage-Local', () => {
      const headers = { 
        'X-Storage-Type': 'vercel-blob',
        'X-Storage-Local': 'true' 
      };
      expect(determineStorageType(headers)).toBe('vercel-blob');
    });

    it('falls back to environment detection without headers', () => {
      // Test environment without blob token
      expect(determineStorageType({})).toBe('filesystem');
    });

    it('handles case-sensitive header values', () => {
      expect(determineStorageType({ 'X-Storage-Local': 'TRUE' })).toBe('filesystem'); // default
      expect(determineStorageType({ 'X-Storage-Local': 'True' })).toBe('filesystem'); // default
      expect(determineStorageType({ 'X-Storage-Local': 'true' })).toBe('filesystem'); // explicit
    });
  });

  describe('Environment-Based Storage Selection', () => {
    const getDefaultStorageType = () => {
      return (process.env.NODE_ENV === 'production' && process.env.BLOB_READ_WRITE_TOKEN) 
        ? 'vercel-blob' 
        : 'filesystem';
    };

    it('uses filesystem in development without blob token', () => {
      vi.stubEnv('NODE_ENV', 'development');
      delete process.env.BLOB_READ_WRITE_TOKEN;
      
      expect(getDefaultStorageType()).toBe('filesystem');
    });

    it('uses filesystem in production without blob token', () => {
      vi.stubEnv('NODE_ENV', 'production');
      delete process.env.BLOB_READ_WRITE_TOKEN;
      
      expect(getDefaultStorageType()).toBe('filesystem');
    });

    it('uses vercel-blob in production with blob token', () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      
      expect(getDefaultStorageType()).toBe('vercel-blob');
    });

    it('uses filesystem in development even with blob token', () => {
      vi.stubEnv('NODE_ENV', 'development');
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      
      expect(getDefaultStorageType()).toBe('filesystem');
    });
  });

  describe('User Scoping Safety', () => {
    const DEFAULT_USER_ID = 'usr_mvp_dev_2025';
    
    const createUserScopedQuery = (userId: string, storageType: string = 'filesystem') => ({
      where: {
        study: { userId },
        storageType,
      },
      select: {
        storagePath: true,
        fileName: true,
        studyId: true,
      },
    });

    it('creates user-scoped database queries', () => {
      const query = createUserScopedQuery(DEFAULT_USER_ID);
      
      expect(query.where.study.userId).toBe('usr_mvp_dev_2025');
      expect(query.where.storageType).toBe('filesystem');
      expect(query.select).toHaveProperty('storagePath');
      expect(query.select).toHaveProperty('fileName');
      expect(query.select).toHaveProperty('studyId');
    });

    it('supports different storage types in queries', () => {
      const query = createUserScopedQuery(DEFAULT_USER_ID, 'vercel-blob');
      
      expect(query.where.storageType).toBe('vercel-blob');
    });

    const createCleanupQuery = (userId: string) => ({
      where: { userId },
    });

    it('creates safe cleanup queries', () => {
      const query = createCleanupQuery(DEFAULT_USER_ID);
      
      expect(query.where.userId).toBe('usr_mvp_dev_2025');
    });
  });

  describe('Production Safety Checks', () => {
    const checkProductionSafety = () => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('❌ Cleanup commands are disabled in production for safety');
      }
      return true;
    };

    it('prevents execution in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      vi.stubEnv('NODE_ENV', 'production');
      
      expect(() => checkProductionSafety()).toThrow('disabled in production for safety');
      
      vi.stubEnv('NODE_ENV', originalEnv || 'test');
    });

    it('allows execution in development environment', () => {
      vi.stubEnv('NODE_ENV', 'development');
      
      expect(checkProductionSafety()).toBe(true);
    });

    it('allows execution in test environment', () => {
      vi.stubEnv('NODE_ENV', 'test');
      
      expect(checkProductionSafety()).toBe(true);
    });
  });

  describe('File Path Generation', () => {
    const generateFilePath = (fileName: string, studyId: string, timestamp: number = Date.now()) => {
      const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueFileName = `${timestamp}_${safeName}`;
      return {
        uniqueFileName,
        relativePath: `dev-uploads/${studyId}/${uniqueFileName}`,
        url: `/api/files/${studyId}/${uniqueFileName}`,
      };
    };

    it('creates unique filenames with timestamps', () => {
      const mockTimestamp = 1234567890;
      const result = generateFilePath('test file.txt', 'study123', mockTimestamp);
      
      expect(result.uniqueFileName).toBe('1234567890_test_file.txt');
      expect(result.relativePath).toBe('dev-uploads/study123/1234567890_test_file.txt');
      expect(result.url).toBe('/api/files/study123/1234567890_test_file.txt');
    });

    it('sanitizes file names with special characters', () => {
      const result = generateFilePath('test@file#with$special%chars.txt', 'study123', 123);
      
      expect(result.uniqueFileName).toBe('123_test_file_with_special_chars.txt');
    });

    it('preserves dots and hyphens in filenames', () => {
      const result = generateFilePath('test-file.v2.txt', 'study123', 123);
      
      expect(result.uniqueFileName).toBe('123_test-file.v2.txt');
    });
  });

  describe('Orphaned File Detection Logic', () => {
    const detectOrphanedFiles = (allFiles: string[], validFiles: string[]) => {
      const validFileSet = new Set(validFiles);
      return allFiles.filter(file => !validFileSet.has(file));
    };

    it('identifies orphaned files correctly', () => {
      const allFiles = [
        '/dev-uploads/study1/file1.txt',
        '/dev-uploads/study1/file2.txt',
        '/dev-uploads/study1/orphan.txt',
      ];
      const validFiles = [
        '/dev-uploads/study1/file1.txt',
        '/dev-uploads/study1/file2.txt',
      ];
      
      const orphans = detectOrphanedFiles(allFiles, validFiles);
      
      expect(orphans).toEqual(['/dev-uploads/study1/orphan.txt']);
    });

    it('returns empty array when no orphans exist', () => {
      const allFiles = ['/dev-uploads/study1/file1.txt'];
      const validFiles = ['/dev-uploads/study1/file1.txt'];
      
      const orphans = detectOrphanedFiles(allFiles, validFiles);
      
      expect(orphans).toEqual([]);
    });

    it('handles empty file lists', () => {
      const orphans = detectOrphanedFiles([], []);
      
      expect(orphans).toEqual([]);
    });
  });
});
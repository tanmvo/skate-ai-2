import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/citations/[messageId]/route';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { CitationMap } from '@/lib/types/citations';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    chatMessage: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}));

describe('GET /api/citations/[messageId]', () => {
  const mockUserId = 'user_123';
  const mockMessageId = 'msg_456';
  const mockCitations: CitationMap = {
    '1': { documentId: 'doc_1', documentName: 'Document1.pdf' },
    '2': { documentId: 'doc_2', documentName: 'Document2.pdf' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(mockUserId);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful Requests', () => {
    it('should return citations for valid message', async () => {
      vi.mocked(prisma.chatMessage.findFirst).mockResolvedValue({
        id: mockMessageId,
        citations: mockCitations,
      } as any);

      const request = new NextRequest('http://localhost/api/citations/msg_456');
      const params = Promise.resolve({ messageId: mockMessageId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCitations);
      expect(prisma.chatMessage.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockMessageId,
          study: {
            userId: mockUserId,
          },
        },
        select: {
          citations: true,
        },
      });
    });

    it('should return empty object when message has no citations', async () => {
      vi.mocked(prisma.chatMessage.findFirst).mockResolvedValue({
        id: mockMessageId,
        citations: null,
      } as any);

      const request = new NextRequest('http://localhost/api/citations/msg_456');
      const params = Promise.resolve({ messageId: mockMessageId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({});
    });

    it('should parse JSON citations from database', async () => {
      // Simulate citations stored as JSON in database
      vi.mocked(prisma.chatMessage.findFirst).mockResolvedValue({
        id: mockMessageId,
        citations: JSON.parse(JSON.stringify(mockCitations)),
      } as any);

      const request = new NextRequest('http://localhost/api/citations/msg_456');
      const params = Promise.resolve({ messageId: mockMessageId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCitations);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest('http://localhost/api/citations/msg_456');
      const params = Promise.resolve({ messageId: mockMessageId });

      const response = await GET(request, { params });

      expect(response.status).toBe(500);
    });
  });

  describe('Authorization', () => {
    it('should return 404 when message does not exist', async () => {
      vi.mocked(prisma.chatMessage.findFirst).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/citations/msg_456');
      const params = Promise.resolve({ messageId: mockMessageId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        error: 'Message not found or access denied',
      });
    });

    it('should return 404 when user does not own the message', async () => {
      // Message exists but query filters it out via study.userId check
      vi.mocked(prisma.chatMessage.findFirst).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/citations/msg_456');
      const params = Promise.resolve({ messageId: mockMessageId });

      const response = await GET(request, { params });

      expect(response.status).toBe(404);
      expect(prisma.chatMessage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            study: { userId: mockUserId },
          }),
        })
      );
    });
  });

  describe('Validation', () => {
    it('should return 400 when messageId is empty', async () => {
      const request = new NextRequest('http://localhost/api/citations/');
      const params = Promise.resolve({ messageId: '' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Message ID is required',
      });
    });

    it('should return 400 when messageId is only whitespace', async () => {
      const request = new NextRequest('http://localhost/api/citations/   ');
      const params = Promise.resolve({ messageId: '   ' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Message ID is required',
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on database error', async () => {
      vi.mocked(prisma.chatMessage.findFirst).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost/api/citations/msg_456');
      const params = Promise.resolve({ messageId: mockMessageId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Internal server error',
      });
    });

    it('should handle malformed citations data gracefully', async () => {
      // Citations field contains invalid data
      vi.mocked(prisma.chatMessage.findFirst).mockResolvedValue({
        id: mockMessageId,
        citations: 'invalid json string' as any,
      });

      const request = new NextRequest('http://localhost/api/citations/msg_456');
      const params = Promise.resolve({ messageId: mockMessageId });

      const response = await GET(request, { params });

      // Should still return 200 with the invalid data (let client handle)
      // or could add validation here
      expect(response.status).toBe(200);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single citation', async () => {
      const singleCitation: CitationMap = {
        '1': { documentId: 'doc_1', documentName: 'Single.pdf' },
      };

      vi.mocked(prisma.chatMessage.findFirst).mockResolvedValue({
        id: mockMessageId,
        citations: singleCitation,
      } as any);

      const request = new NextRequest('http://localhost/api/citations/msg_456');
      const params = Promise.resolve({ messageId: mockMessageId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(singleCitation);
    });

    it('should handle large citation maps', async () => {
      const largeCitations: CitationMap = {};
      for (let i = 1; i <= 100; i++) {
        largeCitations[i.toString()] = {
          documentId: `doc_${i}`,
          documentName: `Document${i}.pdf`,
        };
      }

      vi.mocked(prisma.chatMessage.findFirst).mockResolvedValue({
        id: mockMessageId,
        citations: largeCitations,
      } as any);

      const request = new NextRequest('http://localhost/api/citations/msg_456');
      const params = Promise.resolve({ messageId: mockMessageId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Object.keys(data).length).toBe(100);
    });

    it('should handle citations with special characters', async () => {
      const specialCitations: CitationMap = {
        '1': {
          documentId: 'doc_1',
          documentName: 'File (Copy) [2024].pdf',
        },
        '2': {
          documentId: 'doc_2',
          documentName: "User's Document.pdf",
        },
      };

      vi.mocked(prisma.chatMessage.findFirst).mockResolvedValue({
        id: mockMessageId,
        citations: specialCitations,
      } as any);

      const request = new NextRequest('http://localhost/api/citations/msg_456');
      const params = Promise.resolve({ messageId: mockMessageId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(specialCitations);
    });
  });

  describe('Security', () => {
    it('should validate ownership through study relationship', async () => {
      vi.mocked(prisma.chatMessage.findFirst).mockResolvedValue({
        id: mockMessageId,
        citations: mockCitations,
      } as any);

      const request = new NextRequest('http://localhost/api/citations/msg_456');
      const params = Promise.resolve({ messageId: mockMessageId });

      await GET(request, { params });

      // Verify ownership check via study relationship
      expect(prisma.chatMessage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: mockMessageId,
            study: {
              userId: mockUserId,
            },
          },
        })
      );
    });

    it('should only select citations field (no data leakage)', async () => {
      vi.mocked(prisma.chatMessage.findFirst).mockResolvedValue({
        citations: mockCitations,
      } as any);

      const request = new NextRequest('http://localhost/api/citations/msg_456');
      const params = Promise.resolve({ messageId: mockMessageId });

      await GET(request, { params });

      // Verify only citations field is selected
      expect(prisma.chatMessage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            citations: true,
          },
        })
      );
    });
  });
});

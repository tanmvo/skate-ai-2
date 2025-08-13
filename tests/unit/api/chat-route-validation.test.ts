import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockValidateStudyOwnership = vi.fn();
const mockGetCurrentUserId = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockPrismaFindUnique = vi.fn();

vi.mock('@/lib/auth', () => ({
  validateStudyOwnership: mockValidateStudyOwnership,
  getCurrentUserId: mockGetCurrentUserId,
}));

vi.mock('@/lib/error-handling', () => ({
  checkRateLimit: mockCheckRateLimit,
  sanitizeError: vi.fn((error) => ({ 
    message: error.message, 
    code: 'UNKNOWN', 
    retryable: true 
  })),
  ServiceUnavailableError: class extends Error {
    constructor(service: string) {
      super(`${service} service unavailable`);
    }
  },
  RateLimitError: class extends Error {
    retryAfter?: number;
    constructor(retryAfter?: number) {
      super('Rate limit exceeded');
      this.retryAfter = retryAfter;
    }
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    chat: {
      findUnique: mockPrismaFindUnique
    }
  }
}));

// Mock request object helpers
function createMockRequest(body: any): Request {
  return {
    json: () => Promise.resolve(body),
    headers: new Headers()
  } as Request;
}

// Simulate core validation logic from chat route
async function validateChatRequest(request: Request) {
  const { message, id: chatId } = await request.json();

  // Validate required fields
  if (!message) {
    return { error: 'Message is required', status: 400 };
  }

  if (!chatId) {
    return { error: 'Chat ID is required', status: 400 };
  }

  // Check API key availability
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('AI service unavailable');
  }

  // Get chat and validate
  const chat = await mockPrismaFindUnique({
    where: { id: chatId },
    include: { study: true }
  });

  if (!chat) {
    return { error: 'Chat not found', status: 404 };
  }

  const studyId = chat.studyId;

  // Rate limiting check
  const userId = mockGetCurrentUserId();
  const rateLimitKey = `chat:${userId}:${studyId}`;
  const rateCheck = mockCheckRateLimit(rateLimitKey, 20, 60000);
  
  if (!rateCheck.allowed) {
    throw new Error('Rate limit exceeded');
  }

  // Validate ownership
  const isOwner = await mockValidateStudyOwnership(studyId);
  if (!isOwner) {
    return { error: 'Study not found', status: 404 };
  }

  // Validate message role
  if (message.role !== 'user') {
    return { error: 'Message must be from user', status: 400 };
  }

  return { success: true, studyId, chatId };
}

describe('Chat Route Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful mocks
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    mockGetCurrentUserId.mockReturnValue('user_123');
    mockCheckRateLimit.mockReturnValue({ allowed: true });
    mockValidateStudyOwnership.mockResolvedValue(true);
    mockPrismaFindUnique.mockResolvedValue({
      id: 'chat_123',
      studyId: 'study_123',
      study: { id: 'study_123' }
    });
  });

  it('should validate successful request', async () => {
    const request = createMockRequest({
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'What are the themes?' }]
      },
      id: 'chat_123'
    });

    const result = await validateChatRequest(request);

    expect(result).toEqual({
      success: true,
      studyId: 'study_123',
      chatId: 'chat_123'
    });
  });

  it('should reject request without message', async () => {
    const request = createMockRequest({
      id: 'chat_123'
    });

    const result = await validateChatRequest(request);

    expect(result).toEqual({
      error: 'Message is required',
      status: 400
    });
  });

  it('should reject request without chat ID', async () => {
    const request = createMockRequest({
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'Test message' }]
      }
    });

    const result = await validateChatRequest(request);

    expect(result).toEqual({
      error: 'Chat ID is required',
      status: 400
    });
  });

  it('should reject request when API key is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const request = createMockRequest({
      message: { role: 'user', parts: [] },
      id: 'chat_123'
    });

    await expect(validateChatRequest(request)).rejects.toThrow('AI service unavailable');
  });

  it('should reject request for non-existent chat', async () => {
    mockPrismaFindUnique.mockResolvedValue(null);

    const request = createMockRequest({
      message: { role: 'user', parts: [] },
      id: 'nonexistent_chat'
    });

    const result = await validateChatRequest(request);

    expect(result).toEqual({
      error: 'Chat not found',
      status: 404
    });
  });

  it('should reject request when rate limit exceeded', async () => {
    mockCheckRateLimit.mockReturnValue({
      allowed: false,
      retryAfter: 30000
    });

    const request = createMockRequest({
      message: { role: 'user', parts: [] },
      id: 'chat_123'
    });

    await expect(validateChatRequest(request)).rejects.toThrow('Rate limit exceeded');
  });

  it('should reject request when user does not own study', async () => {
    mockValidateStudyOwnership.mockResolvedValue(false);

    const request = createMockRequest({
      message: { role: 'user', parts: [] },
      id: 'chat_123'
    });

    const result = await validateChatRequest(request);

    expect(result).toEqual({
      error: 'Study not found',
      status: 404
    });
  });

  it('should reject non-user messages', async () => {
    const request = createMockRequest({
      message: {
        role: 'assistant',
        parts: [{ type: 'text', text: 'I am an assistant message' }]
      },
      id: 'chat_123'
    });

    const result = await validateChatRequest(request);

    expect(result).toEqual({
      error: 'Message must be from user',
      status: 400
    });
  });

  it('should call rate limiter with correct parameters', async () => {
    mockGetCurrentUserId.mockReturnValue('test_user_456');
    
    const request = createMockRequest({
      message: { role: 'user', parts: [] },
      id: 'chat_123'
    });

    await validateChatRequest(request);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      'chat:test_user_456:study_123',
      20,
      60000
    );
  });
});
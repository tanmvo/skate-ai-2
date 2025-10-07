/**
 * Realistic LLM response fixtures for testing
 * Based on actual responses from the Skate AI application
 */

export const mockLLMResponses = {
  // Standard document analysis response
  documentAnalysis: {
    content: `# Key Findings from Document Analysis

## Main Themes Identified:

1. **User Experience Challenges**
   - Navigation confusion mentioned 12 times
   - Users struggle with current interface design
   - Mobile responsiveness issues reported

2. **Performance Concerns**
   - Loading times averaging 3.2 seconds
   - Users abandoning tasks due to slow response
   - Need for optimization identified

3. **Feature Gap Analysis**
   - 85% of users want mobile app functionality
   - Export features requested frequently
   - Integration with existing tools needed

## Key Quotes:
- "The current navigation is confusing and hard to use"
- "I wish this worked better on my phone"
- "Loading takes too long, I usually give up"

*Based on analysis of 15 user interview documents*`
  },

  // Empty/no results response
  emptyResponse: {
    content: "I couldn't find relevant information about this topic in the uploaded documents. You might want to try rephrasing your question or uploading additional documents that contain the information you're looking for."
  },

  // Error/problematic response
  errorResponse: {
    content: "I apologize, but I encountered an issue while analyzing your documents. Please try your question again."
  },

  // Tool call response with search results
  toolCallResponse: {
    parts: [
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-search-123',
        state: 'output-available' as const,
        input: { query: 'user pain points feedback' },
        output: 'Found 8 relevant passages across 4 documents about user pain points and feedback'
      },
      {
        type: 'text',
        text: `Based on my search of your documents, I found several key pain points that users consistently mention:

## Top User Pain Points:

1. **Navigation Issues** (mentioned in 4 documents)
   - Users can't find key features
   - Menu structure is unclear
   - Search functionality is hidden

2. **Performance Problems** (mentioned in 3 documents)  
   - Slow loading times
   - Unresponsive interface
   - Frequent timeouts

3. **Mobile Experience** (mentioned in 2 documents)
   - Poor mobile responsiveness  
   - Touch targets too small
   - Content doesn't fit screen

These insights come from user interviews, feedback surveys, and support tickets in your uploaded documents.`
      }
    ]
  },

  // Large content response for performance testing
  largeResponse: {
    content: `# Comprehensive Analysis Results

${'## Section '.repeat(50)}

${Array.from({ length: 100 }, (_, i) => 
  `### Finding ${i + 1}
This is a detailed finding with substantial content that includes multiple paragraphs of analysis. The content is designed to test how the application handles large responses from the LLM.

Key points for this finding:
- Point A with detailed explanation
- Point B with supporting evidence  
- Point C with actionable insights

**Evidence:** Multiple references across documents support this finding.

`).join('\n')}

*This analysis is based on extensive document review and contains ${100} individual findings.*`
  },

  // Malformed response for error testing
  malformedResponse: {
    content: null as any // Intentionally malformed
  },

  // Simple question response
  simpleQuestion: {
    content: `The main themes in these documents are:

1. **User Experience** - Focus on improving navigation and interface design
2. **Performance** - Need to optimize loading times and responsiveness  
3. **Mobile Support** - Users want better mobile experience

These themes appear consistently across multiple user feedback documents.`
  }
};

/**
 * Helper to create streaming simulation data
 */
export const createStreamingData = (response: typeof mockLLMResponses.documentAnalysis) => [
  { type: 'text-delta', content: 'Based on' },
  { type: 'text-delta', content: ' your documents' },
  { type: 'text-delta', content: ', I found' },
  { type: 'text-delta', content: ' several key themes...' },
  { type: 'finish', content: response.content }
];

/**
 * Mock message structures for different scenarios
 */
export const mockMessages = {
  userMessage: {
    id: 'msg-user-1',
    role: 'user' as const,
    content: 'What are the main themes in these documents?',
    createdAt: new Date('2024-01-15T10:30:00Z'),
  },

  assistantMessage: {
    id: 'msg-assistant-1', 
    role: 'assistant' as const,
    content: mockLLMResponses.documentAnalysis.content,
    createdAt: new Date('2024-01-15T10:30:30Z'),
  },

  assistantWithToolCalls: {
    id: 'msg-tool-calls-1',
    role: 'assistant' as const,
    parts: mockLLMResponses.toolCallResponse.parts,
    createdAt: new Date('2024-01-15T10:31:00Z'),
  },

  conversation: [
    {
      id: 'msg-user-1',
      role: 'user' as const,
      content: 'What are the main themes in these documents?',
      createdAt: new Date('2024-01-15T10:30:00Z'),
    },
    {
      id: 'msg-assistant-1',
      role: 'assistant' as const,
      content: mockLLMResponses.documentAnalysis.content,
      createdAt: new Date('2024-01-15T10:30:30Z'),
    }
  ]
};
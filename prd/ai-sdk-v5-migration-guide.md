# AI SDK v5 Migration Guide: Complete Implementation Reference

> **Based on production codebase analysis** - This guide extracts patterns from a working AI SDK v5 beta implementation to answer critical migration questions.

## Table of Contents
1. [useChat Hook API (v5)](#1-usechat-hook-api-v5)
2. [streamText API Changes](#2-streamtext-api-changes)
3. [Message Structure Changes](#3-message-structure-changes)
4. [Tool Integration Patterns](#4-tool-integration-patterns)
5. [Real Migration Examples](#5-real-migration-examples)
6. [Error Handling Patterns](#6-error-handling-patterns)
7. [Advanced Streaming Features](#7-advanced-streaming-features)

## 1. useChat Hook API (v5)

### Complete v5 API

```typescript
const {
  messages,           // ChatMessage[] - Array of messages
  setMessages,        // Function to update messages
  sendMessage,        // Function to send new message
  status,            // 'submitted' | 'streaming' | 'idle' | 'error'
  stop,              // Function to stop streaming
  regenerate,        // Function to regenerate last response
  resumeStream,      // Function to resume interrupted streams
} = useChat<ChatMessage>({
  id,                           // Chat session ID
  messages: initialMessages,    // Initial message array
  experimental_throttle: 100,   // Throttle updates (ms)
  generateId: generateUUID,     // ID generator function
  transport: new DefaultChatTransport({
    api: '/api/chat',
    fetch: fetchWithErrorHandlers,
    prepareSendMessagesRequest({ messages, id, body }) {
      return {
        body: {
          id,
          message: messages.at(-1),  // Last message
          selectedChatModel: 'gpt-4',
          // ... other config
          ...body,
        },
      };
    },
  }),
  onData: (dataPart) => {
    // Handle streaming data parts
    setDataStream((ds) => (ds ? [...ds, dataPart] : []));
  },
  onFinish: () => {
    // Handle completion
    mutate(cacheKey);
  },
  onError: (error) => {
    // Handle errors
    if (error instanceof ChatSDKError) {
      toast({ type: 'error', description: error.message });
    }
  },
});
```

### Key Changes from v4

| v4 Property | v5 Equivalent | Notes |
|-------------|---------------|-------|
| `input` | Manual state | Use `useState` for input |
| `handleInputChange` | Manual handler | Use `setInput` |
| `handleSubmit` | `sendMessage` | Different API - pass message object |
| `isLoading` | `status` | Check `status === 'streaming'` |
| `error` | `onError` callback | Error handling via callback |
| `reload` | `regenerate` | Same concept, different name |
| `append` | `sendMessage` | New message format required |

### Form Submission Pattern (v5)

```typescript
// v5 Form handling
const [input, setInput] = useState<string>('');

const handleSubmit = useCallback((event: FormEvent) => {
  event.preventDefault();
  
  if (status === 'streaming' || !input.trim()) return;

  sendMessage({
    role: 'user',
    parts: [{ type: 'text', text: input.trim() }],
  });
  
  setInput('');
}, [input, sendMessage, status]);
```

## 2. streamText API Changes

### Complete v5 streamText Configuration

```typescript
const result = streamText({
  model: myProvider.languageModel(modelId),
  system: systemPrompt,
  messages: convertToModelMessages(uiMessages),
  
  // Tool configuration
  tools: {
    getWeather,
    createDocument: createDocument({ session, dataStream }),
    updateDocument: updateDocument({ session, dataStream }),
  },
  
  // Tool control (replaces maxSteps/maxToolRoundtrips)
  stopWhen: stepCountIs(5),                    // Max 5 tool steps
  experimental_activeTools: ['getWeather'],    // Enable specific tools
  
  // Streaming optimizations
  experimental_transform: smoothStream({ 
    chunking: 'word'    // Word-level chunking for smooth rendering
  }),
  
  // Telemetry
  experimental_telemetry: {
    isEnabled: true,
    functionId: 'stream-text',
  },
});
```

### Response Methods (v5)

```typescript
// Available response methods
result.consumeStream();                    // Start consuming
result.toUIMessageStream({                // Convert to UI stream
  sendReasoning: true,                    // Include reasoning steps
});
result.toTextStreamResponse();            // Convert to Response object
```

### Key Changes from v4

| v4 Parameter | v5 Equivalent | Notes |
|-------------|---------------|-------|
| `maxSteps` | `stopWhen: stepCountIs(n)` | More flexible condition system |
| `maxToolRoundtrips` | `stopWhen` | Same as maxSteps |
| `onStepFinish` | Use `dataStream.write()` | Handle via tool implementations |
| `experimental_streamMode` | Removed | Always streams in v5 |

## 3. Message Structure Changes

### v5 Message Types

```typescript
// Core message type (from lib/types.ts)
export type ChatMessage = UIMessage<
  MessageMetadata,      // { createdAt: string }
  CustomUIDataTypes,    // Stream data types
  ChatTools            // Available tools
>;

// Message structure
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: MessagePart[];     // NEW: Parts-based structure
  metadata?: MessageMetadata;
}

// Message parts (v5 structure)
type MessagePart = 
  | { type: 'text'; text: string }
  | { type: 'file'; url: string; filename?: string; mediaType: string }
  | { type: 'reasoning'; text: string }
  | { type: 'tool-getWeather'; toolCallId: string; state: 'input-available' | 'output-available'; input?: any; output?: any }
  | { type: 'tool-createDocument'; toolCallId: string; state: 'input-available' | 'output-available'; input?: any; output?: any }
  // ... other tool types
```

### Tool Call Structure (v5)

```typescript
// Tool invocation in message parts
{
  type: 'tool-createDocument',
  toolCallId: 'call_123',
  state: 'input-available',
  input: {
    title: 'My Document',
    kind: 'text'
  }
}

// Tool result in message parts
{
  type: 'tool-createDocument', 
  toolCallId: 'call_123',
  state: 'output-available',
  output: {
    id: 'doc_456',
    url: '/documents/doc_456'
  }
}
```

### v4 vs v5 Comparison

```typescript
// v4 Message
{
  id: 'msg_1',
  role: 'assistant',
  content: 'Hello world',
  tool_calls: [{
    id: 'call_1',
    function: { name: 'getWeather', arguments: '{"city":"SF"}' }
  }]
}

// v5 Message  
{
  id: 'msg_1',
  role: 'assistant',
  parts: [
    { type: 'text', text: 'Hello world' },
    { 
      type: 'tool-getWeather',
      toolCallId: 'call_1',
      state: 'input-available',
      input: { city: 'SF' }
    }
  ]
}
```

## 4. Tool Integration Patterns

### Tool Definition (v5)

```typescript
import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';

export const createDocument = ({ session, dataStream }: {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}) =>
  tool({
    description: 'Create a document for writing activities',
    inputSchema: z.object({
      title: z.string(),
      kind: z.enum(['text', 'code', 'image']),
    }),
    execute: async ({ title, kind }) => {
      const id = generateUUID();
      
      // Stream intermediate data
      dataStream.write({
        type: 'data-kind',
        data: kind,
        transient: true,  // Won't be saved in message history
      });
      
      dataStream.write({
        type: 'data-title', 
        data: title,
        transient: true,
      });
      
      // Actual tool logic
      const document = await createNewDocument({ title, kind, userId: session.user.id });
      
      return { id: document.id, url: document.url };
    },
  });
```

### Tool Registration (v5)

```typescript
// In streamText configuration
const result = streamText({
  model: provider.languageModel('gpt-4'),
  tools: {
    getWeather,                                           // Simple tool
    createDocument: createDocument({ session, dataStream }), // Parameterized tool
    updateDocument: updateDocument({ session, dataStream }),
  },
  experimental_activeTools: ['getWeather', 'createDocument'], // Enable subset
  // ...
});
```

### Tool Error Handling

```typescript
// Tool with error handling
export const riskyTool = tool({
  // ...
  execute: async ({ input }) => {
    try {
      const result = await riskyOperation(input);
      return { success: true, data: result };
    } catch (error) {
      // Return error in tool result - don't throw
      return { 
        error: error.message,
        success: false 
      };
    }
  },
});

// Handle in UI (message.tsx pattern)
if (state === 'output-available') {
  const { output } = part;
  
  if ('error' in output) {
    return (
      <div className="text-red-500 p-2 border rounded">
        Error: {String(output.error)}
      </div>
    );
  }
  
  // Normal result rendering
  return <ToolResult data={output} />;
}
```

## 5. Real Migration Examples

### Complete v4 to v5 Migration

```typescript
// ❌ v4 Pattern
const { 
  messages, 
  input, 
  handleInputChange, 
  handleSubmit, 
  isLoading,
  error,
  reload 
} = useChat({
  api: '/api/chat',
  onError: (error) => console.error(error)
});

// ✅ v5 Equivalent
const [input, setInput] = useState<string>('');

const {
  messages,
  setMessages,
  sendMessage,
  status,
  stop,
  regenerate,
} = useChat<ChatMessage>({
  id: chatId,
  messages: initialMessages,
  experimental_throttle: 100,
  generateId: generateUUID,
  transport: new DefaultChatTransport({
    api: '/api/chat',
    fetch: fetchWithErrorHandlers,
    prepareSendMessagesRequest({ messages, id, body }) {
      return {
        body: {
          id,
          message: messages.at(-1),
          ...body,
        },
      };
    },
  }),
  onData: (dataPart) => {
    // Handle streaming data
    setDataStream((prev) => [...(prev || []), dataPart]);
  },
  onFinish: () => {
    // Handle completion
    console.log('Streaming finished');
  },
  onError: (error) => {
    // Handle errors
    toast.error(error.message);
  },
});

// Form submission
const handleSubmit = useCallback((event: FormEvent) => {
  event.preventDefault();
  
  if (status === 'streaming' || !input.trim()) return;

  sendMessage({
    role: 'user',
    parts: [{ type: 'text', text: input.trim() }],
  });
  
  setInput('');
}, [input, sendMessage, status]);

// Loading state check
const isLoading = status === 'streaming';
```

### Backend API Route Migration

```typescript
// ❌ v4 Backend Pattern
export async function POST(request: Request) {
  const { messages } = await request.json();
  
  const result = await streamText({
    model: openai('gpt-4'),
    messages,
    onFinish: (result) => {
      // Save to database
    }
  });
  
  return result.toAIStreamResponse();
}

// ✅ v5 Backend Pattern  
export async function POST(request: Request) {
  const { message, id } = await request.json();
  
  const stream = createUIMessageStream({
    execute: ({ writer: dataStream }) => {
      const result = streamText({
        model: myProvider.languageModel('gpt-4'),
        messages: convertToModelMessages(messages),
        stopWhen: stepCountIs(5),
        experimental_transform: smoothStream({ chunking: 'word' }),
        tools: {
          getWeather,
          createDocument: createDocument({ session, dataStream }),
        },
      });
      
      result.consumeStream();
      dataStream.merge(result.toUIMessageStream());
    },
    generateId: generateUUID,
    onFinish: async ({ messages }) => {
      // Save to database
      await saveMessages(messages);
    },
    onError: () => 'An error occurred!',
  });
  
  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}
```

## 6. Error Handling Patterns

### Client-Side Error Handling

```typescript
// Comprehensive error handling setup
const {
  messages,
  sendMessage,
  status,
  // ...
} = useChat<ChatMessage>({
  // ...
  transport: new DefaultChatTransport({
    api: '/api/chat',
    fetch: async (url, options) => {
      try {
        const response = await fetch(url, options);
        
        // Handle HTTP errors
        if (!response.ok) {
          if (response.status === 401) {
            throw new ChatSDKError('unauthorized:chat');
          }
          if (response.status === 429) {
            throw new ChatSDKError('rate_limit:chat'); 
          }
          throw new ChatSDKError('server_error:chat');
        }
        
        return response;
      } catch (error) {
        // Network errors
        if (error instanceof ChatSDKError) throw error;
        throw new ChatSDKError('network_error:chat');
      }
    },
  }),
  onError: (error) => {
    // Centralized error handling
    if (error instanceof ChatSDKError) {
      toast({
        type: 'error',
        description: error.message,
      });
    } else {
      toast({
        type: 'error', 
        description: 'Something went wrong. Please try again.',
      });
    }
  },
});
```

### Server-Side Error Handling  

```typescript
// API route error handling
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
  
  try {
    // Main logic
    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        // Stream logic
      },
      onError: () => {
        return 'Oops, an error occurred!';  // User-friendly message
      },
    });
    
    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    console.error('Unexpected error:', error);
    return new ChatSDKError('internal_server_error:api').toResponse();
  }
}
```

### Connection Recovery

```typescript
// Resumable streams for connection recovery
const streamContext = getStreamContext(); // Redis-backed context

if (streamContext) {
  return new Response(
    await streamContext.resumableStream(streamId, () =>
      stream.pipeThrough(new JsonToSseTransformStream()),
    ),
  );
} else {
  // Fallback without resumability
  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}
```

## 7. Advanced Streaming Features

### Throttled Rendering (60fps)

```typescript
const { messages } = useChat<ChatMessage>({
  experimental_throttle: 16, // ~60fps (1000ms / 60fps = 16.67ms)
  // ...
});
```

### Smooth Stream Transform

```typescript
// Backend: Word-level chunking for natural reading
const result = streamText({
  experimental_transform: smoothStream({ 
    chunking: 'word'  // Options: 'word' | 'line' | 'sentence'
  }),
  // ...
});
```

### createUIMessageStream Usage

```typescript
// Complete streaming setup with UI optimizations  
const stream = createUIMessageStream({
  execute: ({ writer: dataStream }) => {
    const result = streamText({
      model: provider.languageModel('gpt-4'),
      messages,
      experimental_transform: smoothStream({ chunking: 'word' }),
    });
    
    result.consumeStream();
    
    // Merge AI stream with UI message stream
    dataStream.merge(
      result.toUIMessageStream({
        sendReasoning: true,  // Include reasoning steps
      })
    );
  },
  generateId: generateUUID,
  onFinish: async ({ messages }) => {
    // Save final messages
    await saveMessages(messages);
  },
  onError: () => 'Stream error occurred',
});
```

### Progressive Rendering with Framer Motion

```typescript
// Component with streaming animations
import { AnimatePresence, motion } from 'framer-motion';

export const StreamingMessage = ({ message }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="streaming-message"
      >
        {message.parts.map((part, index) => {
          if (part.type === 'text') {
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Markdown>{part.text}</Markdown>
              </motion.div>
            );
          }
        })}
      </motion.div>
    </AnimatePresence>
  );
};
```

### Data Stream Handling

```typescript
// Advanced data stream management
export function DataStreamHandler() {
  const { dataStream } = useDataStream();
  const lastProcessedIndex = useRef(-1);

  useEffect(() => {
    if (!dataStream?.length) return;

    // Process only new deltas for performance
    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    newDeltas.forEach((delta) => {
      switch (delta.type) {
        case 'data-title':
          setArtifact(draft => ({ ...draft, title: delta.data }));
          break;
        case 'data-kind':
          setArtifact(draft => ({ ...draft, kind: delta.data }));
          break;
        case 'data-finish':
          setArtifact(draft => ({ ...draft, status: 'idle' }));
          break;
      }
    });
  }, [dataStream]);

  return null;
}
```

## Migration Checklist

### Critical Steps

- [ ] Replace `useChat` properties: `input` → manual state, `isLoading` → `status`
- [ ] Update `handleSubmit` to use `sendMessage` with parts structure
- [ ] Convert messages to parts-based structure
- [ ] Update `streamText` to use `stopWhen` instead of `maxSteps`
- [ ] Replace tool callbacks with `dataStream.write()` pattern
- [ ] Add `createUIMessageStream` wrapper for backend
- [ ] Update error handling to use callbacks instead of returned errors

### Advanced Features

- [ ] Add `experimental_throttle` for smooth rendering
- [ ] Implement `smoothStream` for word-level chunking  
- [ ] Set up resumable streams with Redis
- [ ] Add data stream handling for real-time UI updates
- [ ] Integrate Framer Motion for streaming animations

### Testing

- [ ] Test stream interruption and recovery
- [ ] Verify tool calling and error handling
- [ ] Check message format compatibility
- [ ] Validate performance with throttling settings
- [ ] Test error scenarios and user feedback

This guide provides the complete migration path from AI SDK v4 to v5 based on a production implementation. All code examples are extracted from working v5 beta codebase.
import { VoyageAIClient } from 'voyageai';

if (!process.env.VOYAGE_API_KEY) {
  throw new Error('VOYAGE_API_KEY environment variable is required');
}

const voyage = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY,
});

const EMBEDDING_MODEL = 'voyage-large-2';
const MAX_BATCH_SIZE = 128; // Voyage AI batch limit
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export interface EmbeddingResult {
  embedding: number[];
  index?: number;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  usage: {
    totalTokens: number;
  };
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateEmbedding(
  text: string,
  retries: number = MAX_RETRIES
): Promise<EmbeddingResult> {
  try {
    const response = await voyage.embed({
      input: [text],
      model: EMBEDDING_MODEL,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No embedding data returned from Voyage AI');
    }

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error('No embedding in response data');
    }

    return {
      embedding,
    };
  } catch (error) {
    if (retries > 0 && error instanceof Error) {
      console.warn(`Embedding generation failed, retrying... (${retries} attempts left)`);
      console.warn(`Error: ${error.message}`);
      
      await delay(RETRY_DELAY);
      return generateEmbedding(text, retries - 1);
    }
    
    console.error('Failed to generate embedding:', error);
    throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateBatchEmbeddings(
  texts: string[],
  retries: number = MAX_RETRIES
): Promise<BatchEmbeddingResult> {
  if (texts.length === 0) {
    return { embeddings: [], usage: { totalTokens: 0 } };
  }

  // Split large batches into smaller chunks
  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    batches.push(texts.slice(i, i + MAX_BATCH_SIZE));
  }

  try {
    const allEmbeddings: number[][] = [];
    let totalTokens = 0;

    for (const batch of batches) {
      const response = await voyage.embed({
        input: batch,
        model: EMBEDDING_MODEL,
      });

      if (!response.data || response.data.length !== batch.length) {
        throw new Error('Mismatch between input batch size and embedding response');
      }

      // Collect embeddings in order
      for (const item of response.data) {
        if (!item.embedding) {
          throw new Error('Missing embedding in batch response item');
        }
        allEmbeddings.push(item.embedding);
      }

      // Sum up token usage
      if (response.usage?.totalTokens) {
        totalTokens += response.usage.totalTokens;
      }
    }

    return {
      embeddings: allEmbeddings,
      usage: { totalTokens },
    };
  } catch (error) {
    if (retries > 0 && error instanceof Error) {
      console.warn(`Batch embedding generation failed, retrying... (${retries} attempts left)`);
      console.warn(`Error: ${error.message}`);
      
      await delay(RETRY_DELAY);
      return generateBatchEmbeddings(texts, retries - 1);
    }
    
    console.error('Failed to generate batch embeddings:', error);
    throw new Error(`Batch embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function serializeEmbedding(embedding: number[]): Buffer {
  // Convert float32 array to binary buffer
  const buffer = Buffer.allocUnsafe(embedding.length * 4);
  for (let i = 0; i < embedding.length; i++) {
    buffer.writeFloatLE(embedding[i], i * 4);
  }
  return buffer;
}

export function deserializeEmbedding(buffer: Buffer | Uint8Array): number[] {
  // Convert binary buffer back to float32 array
  const embedding: number[] = [];
  
  // Convert Uint8Array to Buffer if necessary
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  
  for (let i = 0; i < buf.length; i += 4) {
    embedding.push(buf.readFloatLE(i));
  }
  return embedding;
}

export { EMBEDDING_MODEL };
export interface DocumentChunk {
  content: string;
  chunkIndex: number;
  startPosition?: number;
  endPosition?: number;
}

export interface ChunkingOptions {
  chunkSize: number;
  overlapSize: number;
  preserveParagraphs: boolean;
  minChunkSize: number;
}

export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  chunkSize: 1000, // characters per chunk
  overlapSize: 200, // character overlap between chunks
  preserveParagraphs: true, // try to keep paragraphs intact
  minChunkSize: 100, // minimum chunk size to avoid tiny fragments
};

export function chunkText(
  text: string,
  options: Partial<ChunkingOptions> = {}
): DocumentChunk[] {
  const config = { ...DEFAULT_CHUNKING_OPTIONS, ...options };
  const chunks: DocumentChunk[] = [];
  
  if (!text || text.trim().length === 0) {
    return chunks;
  }

  // Clean and normalize the text
  const cleanText = text
    .replace(/\r\n/g, '\n') // normalize line endings
    .replace(/\r/g, '\n')
    .trim();

  if (cleanText.length <= config.chunkSize) {
    // Text is small enough to be a single chunk
    return [{
      content: cleanText,
      chunkIndex: 0,
      startPosition: 0,
      endPosition: cleanText.length,
    }];
  }

  let currentPosition = 0;
  let chunkIndex = 0;

  while (currentPosition < cleanText.length) {
    let chunkEnd = Math.min(currentPosition + config.chunkSize, cleanText.length);
    
    // If we're not at the end of the text and preserveParagraphs is enabled,
    // try to end the chunk at a natural boundary
    if (chunkEnd < cleanText.length && config.preserveParagraphs) {
      chunkEnd = findOptimalChunkBoundary(
        cleanText,
        currentPosition,
        chunkEnd,
        config.chunkSize
      );
    }

    const chunkContent = cleanText.slice(currentPosition, chunkEnd).trim();
    
    // Only create chunk if it meets minimum size requirement
    if (chunkContent.length >= config.minChunkSize) {
      chunks.push({
        content: chunkContent,
        chunkIndex: chunkIndex++,
        startPosition: currentPosition,
        endPosition: chunkEnd,
      });
    }

    // Calculate next starting position with overlap
    if (chunkEnd >= cleanText.length) {
      break; // We've reached the end
    }

    // Move forward, accounting for overlap
    const overlapStart = Math.max(
      currentPosition + config.chunkSize - config.overlapSize,
      currentPosition + config.minChunkSize // ensure we make progress
    );
    
    currentPosition = overlapStart;
  }

  return chunks;
}

function findOptimalChunkBoundary(
  text: string,
  start: number,
  idealEnd: number,
  maxChunkSize: number
): number {
  const searchWindow = Math.min(200, Math.floor(maxChunkSize * 0.2)); // 20% of chunk size or 200 chars
  const minEnd = idealEnd - searchWindow;

  // Priority order for boundary detection
  const boundaries = [
    '\n\n', // paragraph breaks
    '. ',   // sentence endings
    '! ',   // exclamation sentence endings
    '? ',   // question sentence endings
    '\n',   // line breaks
    ', ',   // clause breaks
    '; ',   // semicolon breaks
    ' ',    // word boundaries
  ];

  // Search for the best boundary within the window
  for (const boundary of boundaries) {
    // Look for the boundary closest to (but before) the ideal end
    let bestPosition = -1;
    let searchPos = idealEnd;

    while (searchPos >= minEnd) {
      const boundaryPos = text.lastIndexOf(boundary, searchPos);
      if (boundaryPos >= minEnd && boundaryPos < idealEnd) {
        bestPosition = boundaryPos + boundary.length;
        break;
      }
      searchPos = boundaryPos - 1;
    }

    if (bestPosition > minEnd) {
      return bestPosition;
    }
  }

  // If no good boundary found, use the ideal end
  return idealEnd;
}

export function validateChunks(chunks: DocumentChunk[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (chunks.length === 0) {
    return { valid: true, errors: [] }; // Empty chunks are valid
  }

  // Check chunk indices are sequential
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i].chunkIndex !== i) {
      errors.push(`Chunk ${i} has incorrect index: expected ${i}, got ${chunks[i].chunkIndex}`);
    }
  }

  // Check for empty chunks
  chunks.forEach((chunk, index) => {
    if (!chunk.content || chunk.content.trim().length === 0) {
      errors.push(`Chunk ${index} is empty`);
    }
  });

  // Check position consistency (if positions are provided)
  chunks.forEach((chunk, index) => {
    if (chunk.startPosition !== undefined && chunk.endPosition !== undefined) {
      if (chunk.startPosition >= chunk.endPosition) {
        errors.push(`Chunk ${index} has invalid positions: start ${chunk.startPosition} >= end ${chunk.endPosition}`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function mergeOverlappingChunks(
  chunks: DocumentChunk[],
  overlapThreshold: number = 0.8
): DocumentChunk[] {
  if (chunks.length <= 1) {
    return chunks;
  }

  const merged: DocumentChunk[] = [];
  let currentChunk = chunks[0];

  for (let i = 1; i < chunks.length; i++) {
    const nextChunk = chunks[i];
    const overlap = calculateTextOverlap(currentChunk.content, nextChunk.content);
    
    if (overlap > overlapThreshold) {
      // Merge chunks
      currentChunk = {
        content: currentChunk.content + '\n\n' + nextChunk.content,
        chunkIndex: currentChunk.chunkIndex,
        startPosition: currentChunk.startPosition,
        endPosition: nextChunk.endPosition,
      };
    } else {
      merged.push(currentChunk);
      currentChunk = nextChunk;
    }
  }

  merged.push(currentChunk);
  
  // Reindex the merged chunks
  return merged.map((chunk, index) => ({
    ...chunk,
    chunkIndex: index,
  }));
}

function calculateTextOverlap(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(word => set2.has(word)));
  const union = new Set([...set1, ...set2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}
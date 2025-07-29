import * as mammoth from 'mammoth';

export interface ProcessingResult {
  text: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    language?: string;
  };
}

export interface ProcessingError {
  success: false;
  error: string;
  details?: string;
}

export type DocumentProcessingResult = ProcessingResult | ProcessingError;

export async function extractTextFromPDF(): Promise<DocumentProcessingResult> {
  // PDF support temporarily disabled for Phase 2.2 testing
  // Will be re-enabled in Phase 2.3 with a more reliable library
  return {
    success: false,
    error: 'PDF processing temporarily disabled',
    details: 'PDF support will be added in the next phase. Please use TXT or DOCX files for now.'
  };
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<DocumentProcessingResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    
    if (!result.value || result.value.trim().length === 0) {
      return {
        success: false,
        error: 'DOCX contains no extractable text',
        details: 'The document may be empty or corrupted'
      };
    }

    // Clean up the extracted text
    const cleanText = result.value
      .replace(/\n{3,}/g, '\n\n') // Reduce excessive line breaks
      .replace(/[ \t]{2,}/g, ' ') // Reduce excessive spaces
      .trim();

    // Log any warnings from mammoth
    if (result.messages.length > 0) {
      console.warn('DOCX extraction warnings:', result.messages);
    }

    return {
      text: cleanText,
      metadata: {
        wordCount: cleanText.split(/\s+/).length,
      }
    };
  } catch (error) {
    console.error('DOCX extraction error:', error);
    return {
      success: false,
      error: 'Failed to extract text from DOCX',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function extractTextFromTXT(buffer: Buffer): Promise<DocumentProcessingResult> {
  try {
    // Try different encodings
    const encodings = ['utf8', 'ascii', 'latin1'];
    let text = '';

    for (const enc of encodings) {
      try {
        text = buffer.toString(enc as BufferEncoding);
        break;
      } catch {
        continue;
      }
    }

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: 'Text file is empty or unreadable',
        details: `Tried encodings: ${encodings.join(', ')}`
      };
    }

    // Clean up the text
    const cleanText = text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n') // Reduce excessive line breaks
      .trim();

    return {
      text: cleanText,
      metadata: {
        wordCount: cleanText.split(/\s+/).length,
      }
    };
  } catch (error) {
    console.error('TXT extraction error:', error);
    return {
      success: false,
      error: 'Failed to read text file',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<DocumentProcessingResult> {
  try {
    // Determine file type from MIME type or extension
    const fileExtension = fileName.toLowerCase().split('.').pop() || '';
    
    if (mimeType.includes('pdf') || fileExtension === 'pdf') {
      return await extractTextFromPDF();
    }
    
    if (mimeType.includes('officedocument.wordprocessingml') || 
        mimeType.includes('msword') || 
        fileExtension === 'docx' || 
        fileExtension === 'doc') {
      return await extractTextFromDOCX(buffer);
    }
    
    if (mimeType.includes('text/') || 
        fileExtension === 'txt' || 
        fileExtension === 'md' ||
        fileExtension === 'markdown') {
      return await extractTextFromTXT(buffer);
    }

    return {
      success: false,
      error: 'Unsupported file type',
      details: `File type: ${mimeType}, Extension: ${fileExtension}`
    };
  } catch (error) {
    console.error('Document processing error:', error);
    return {
      success: false,
      error: 'Document processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function getSupportedMimeTypes(): string[] {
  return [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown',
  ];
}

export function getSupportedExtensions(): string[] {
  return ['pdf', 'docx', 'doc', 'txt', 'md', 'markdown'];
}

export function isFileTypeSupported(mimeType: string, fileName: string): boolean {
  const extension = fileName.toLowerCase().split('.').pop() || '';
  return getSupportedMimeTypes().some(type => mimeType.includes(type)) ||
         getSupportedExtensions().includes(extension);
}
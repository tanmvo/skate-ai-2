import * as mammoth from 'mammoth';
import PDFParser from 'pdf2json';

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

interface PDFErrorData {
  parserError?: string;
}

interface PDFTextRun {
  T?: string;
}

interface PDFTextItem {
  R?: PDFTextRun[];
}

interface PDFPage {
  Texts?: PDFTextItem[];
}

interface PDFData {
  Pages?: PDFPage[];
}

export async function extractTextFromPDF(buffer: Buffer): Promise<DocumentProcessingResult> {
  return new Promise((resolve) => {
    console.log('Attempting PDF extraction with pdf2json...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParser = new (PDFParser as any)(null, 1);

    pdfParser.on('pdfParser_dataError', (errData: PDFErrorData) => {
      console.error('PDF parsing error:', errData);
      resolve({
        success: false,
        error: 'Failed to parse PDF',
        details: `This PDF may contain custom fonts (Type3), be scanned, or be image-based. Consider using OCR tools to extract text first. Error: ${errData.parserError || 'Unknown PDF parsing error'}`
      });
    });

    pdfParser.on('pdfParser_dataReady', (pdfData: PDFData) => {
      try {
        // Extract text from all pages
        let extractedText = '';

        if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
          for (const page of pdfData.Pages) {
            if (page.Texts && Array.isArray(page.Texts)) {
              for (const textItem of page.Texts) {
                if (textItem.R && Array.isArray(textItem.R)) {
                  for (const textRun of textItem.R) {
                    if (textRun.T) {
                      // Decode URI component and add space
                      try {
                        extractedText += decodeURIComponent(textRun.T) + ' ';
                      } catch {
                        // If decoding fails, use the raw text
                        extractedText += textRun.T + ' ';
                      }
                    }
                  }
                }
              }
            }
            // Add page break
            extractedText += '\n\n';
          }
        }

        if (!extractedText || extractedText.trim().length === 0) {
          resolve({
            success: false,
            error: 'PDF contains no extractable text',
            details: 'This PDF may contain custom fonts (Type3), be scanned, or be image-based. Consider using OCR tools to extract text first.'
          });
          return;
        }

        // Clean up the extracted text
        const cleanText = extractedText
          .replace(/\n{3,}/g, '\n\n') // Reduce excessive line breaks
          .replace(/[ \t]{2,}/g, ' ') // Reduce excessive spaces
          .trim();

        console.log(`Successfully extracted ${cleanText.length} characters from PDF`);
        resolve({
          text: cleanText,
          metadata: {
            pageCount: pdfData.Pages ? pdfData.Pages.length : 0,
            wordCount: cleanText.split(/\s+/).length,
          }
        });
      } catch (error) {
        console.error('PDF text extraction error:', error);
        resolve({
          success: false,
          error: 'Failed to extract text from PDF',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Parse the PDF buffer
    pdfParser.parseBuffer(buffer);
  });
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
      return await extractTextFromPDF(buffer);
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
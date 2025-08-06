// Re-export types from synthesis schema for backward compatibility
export type { 
  Citation, 
  DocumentCitation,
  StructuredResponse 
} from '../schemas/synthesis-schema';

export { 
  structuredResponseSchema 
} from '../schemas/synthesis-schema';

// Import types for use in local interface
import type { DocumentCitation, StructuredResponse } from '../schemas/synthesis-schema';

/**
 * Message interface with citation support
 */
export interface MessageWithCitations {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  citations?: DocumentCitation[];
  structuredResponse?: StructuredResponse;
  timestamp: Date;
  studyId: string;
}
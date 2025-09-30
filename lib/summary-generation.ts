import { prisma } from './prisma';
import { getStudyRepresentativeContent } from './study-summary-search';
import { buildSummaryPrompt } from './prompts/templates/study-summary-prompt';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

/**
 * Summary generation result with metadata
 */
export interface SummaryResult {
  summary: string;
  metadata: {
    totalChunks: number;
    documentCount: number;
    generationTimeMs: number;
  };
}

/**
 * Generate a study summary from all documents
 * Includes race condition prevention and validation
 *
 * @param studyId - The study to generate summary for
 * @returns Summary result or null if study has no documents or state changed during generation
 */
export async function generateStudySummary(studyId: string): Promise<SummaryResult | null> {
  const startTime = Date.now();

  try {
    // Check initial document count
    const initialDocCount = await prisma.document.count({
      where: {
        studyId,
        status: 'READY', // Only count processed documents
      },
    });

    if (initialDocCount === 0) {
      console.log(`Study ${studyId} has no processed documents, skipping summary generation`);
      return null;
    }

    // Get representative content from all documents
    const representativeContent = await getStudyRepresentativeContent(studyId);

    let summaryText: string;

    if (representativeContent.formattedContent === '') {
      // Fallback: Generate basic summary when no search results
      const study = await prisma.study.findUnique({
        where: { id: studyId },
        select: { name: true },
      });

      summaryText = await generateBasicSummary(study?.name || 'Untitled Study', initialDocCount);
    } else {
      // Generate summary using Claude with semantic search results
      summaryText = await generateSummaryWithClaude(representativeContent.formattedContent);
    }

    // Validate document count hasn't changed during generation
    const finalDocCount = await prisma.document.count({
      where: {
        studyId,
        status: 'READY',
      },
    });

    if (finalDocCount !== initialDocCount) {
      console.log(
        `Document count changed during summary generation for study ${studyId} ` +
        `(${initialDocCount} -> ${finalDocCount}), aborting save to prevent stale summary`
      );
      return null;
    }

    const generationTimeMs = Date.now() - startTime;

    return {
      summary: summaryText,
      metadata: {
        totalChunks: representativeContent.totalChunks,
        documentCount: representativeContent.documentCount,
        generationTimeMs,
      },
    };

  } catch (error) {
    console.error(`Summary generation failed for study ${studyId}:`, error);
    throw error;
  }
}

/**
 * Generate summary using Claude with semantic search results
 */
async function generateSummaryWithClaude(content: string): Promise<string> {
  const systemPrompt = await buildSummaryPrompt();

  const userPrompt = `${systemPrompt}

Here are representative excerpts from the study documents:

${content}

Generate ONLY the summary text (maximum 500 characters). Do not include any thinking, analysis, or follow-up questions. Return only the summary paragraph.`;

  const { text } = await generateText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    temperature: 0.7,
    prompt: userPrompt,
  });

  // Clean up the response - remove any thinking tags or follow-up questions
  let cleanText = text.trim();

  // Remove thinking tags if present
  cleanText = cleanText.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();

  // Remove common follow-up patterns
  cleanText = cleanText.replace(/Would you like.*?\?[\s\S]*$/m, '').trim();
  cleanText = cleanText.replace(/Let me (analyze|know).*$/m, '').trim();

  // Ensure summary doesn't exceed 500 characters with smart truncation
  if (cleanText.length > 500) {
    // Try to truncate at a sentence boundary
    const truncated = cleanText.slice(0, 497);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastExclamation = truncated.lastIndexOf('!');
    const lastQuestion = truncated.lastIndexOf('?');

    const sentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);

    // If we found a sentence boundary within reasonable distance, use it
    if (sentenceEnd > 400) {
      return cleanText.slice(0, sentenceEnd + 1);
    }

    // Otherwise truncate at last complete word
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 450) {
      return truncated.slice(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  return cleanText;
}

/**
 * Generate basic fallback summary when no search results available
 */
async function generateBasicSummary(
  studyName: string,
  documentCount: number
): Promise<string> {
  const docWord = documentCount === 1 ? 'document' : 'documents';
  return `This study "${studyName}" contains ${documentCount} ${docWord} ready for analysis. Start asking questions to explore the content and uncover insights.`;
}
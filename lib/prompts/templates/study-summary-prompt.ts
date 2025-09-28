import { createPromptBuilder, loadPromptSection } from '../prompt-builder';

/**
 * Study summary prompt template
 * Generates concise, conversational summaries after document upload
 */
export async function buildSummaryPrompt(): Promise<string> {
  const builder = createPromptBuilder();

  // Load all 10 sections for complete summary generation
  const [
    taskContext,           // Section 1: WHO & WHAT
    toneContext,           // Section 2: HOW to communicate
    backgroundData,        // Section 3: Available context & tools
    rulesBoundaries,       // Section 4: Detailed behavioral rules
    examples,              // Section 5: Show good output
    conversationHistory,   // Section 6: Ongoing context
    immediateTask,         // Section 7: Current task focus
    thinkingProcess,       // Section 8: Step-by-step reasoning
    outputFormatting,      // Section 9: Structure requirements
    prefilledResponse      // Section 10: Guide output style
  ] = await Promise.all([
    loadPromptSection('task-context', 'study-summary-prompt'),
    loadPromptSection('tone-context', 'study-summary-prompt'),
    loadPromptSection('background-data', 'study-summary-prompt'),
    loadPromptSection('rules-boundaries', 'study-summary-prompt'),
    loadPromptSection('examples', 'study-summary-prompt'),
    loadPromptSection('conversation-history', 'study-summary-prompt'),
    loadPromptSection('immediate-task', 'study-summary-prompt'),
    loadPromptSection('thinking-process', 'study-summary-prompt'),
    loadPromptSection('output-formatting', 'study-summary-prompt'),
    loadPromptSection('prefilled-response', 'study-summary-prompt')
  ]);

  return builder
    .addSection(taskContext)
    .addSection(toneContext)
    .addSection(backgroundData)
    .addSection(rulesBoundaries)
    .addSection(examples)
    .addSection(conversationHistory)
    .addSection(immediateTask)
    .addSection(thinkingProcess)
    .addSection(outputFormatting)
    .addSection(prefilledResponse)
    .build();
}
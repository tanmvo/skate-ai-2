import { createPromptBuilder, loadPromptSection } from '../prompt-builder';

/**
 * Main system prompt template for Skate AI chat
 * Follows Anthropic's 10-section framework for optimal AI performance
 */
export async function buildSystemPrompt(variables: {
  studyContext: string;
}): Promise<string> {
  const builder = createPromptBuilder();

  // Load all Anthropic framework sections in order
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
    loadPromptSection('task-context', 'main-system-prompt'),
    loadPromptSection('tone-context', 'main-system-prompt'),
    loadPromptSection('background-data', 'main-system-prompt'),
    loadPromptSection('rules-boundaries', 'main-system-prompt'),
    loadPromptSection('examples', 'main-system-prompt'),
    loadPromptSection('conversation-history', 'main-system-prompt'),
    loadPromptSection('immediate-task', 'main-system-prompt'),
    loadPromptSection('thinking-process', 'main-system-prompt'),
    loadPromptSection('output-formatting', 'main-system-prompt'),
    loadPromptSection('prefilled-response', 'main-system-prompt')
  ]);

  // Build the complete prompt following Anthropic framework
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
    .setVariables(variables)
    .build();
}

/**
 * Simplified version for cases where we need just the core identity
 */
export async function buildCorePrompt(): Promise<string> {
  const builder = createPromptBuilder();
  const taskContext = await loadPromptSection('task-context', 'main-system-prompt');

  return builder
    .addSection(taskContext)
    .build();
}

/**
 * Context-free version for testing or when study context isn't available
 */
export async function buildSystemPromptWithoutContext(): Promise<string> {
  const builder = createPromptBuilder();

  const [
    taskContext,
    toneContext,
    rulesBoundaries,
    examples,
    thinkingProcess
  ] = await Promise.all([
    loadPromptSection('task-context', 'main-system-prompt'),
    loadPromptSection('tone-context', 'main-system-prompt'),
    loadPromptSection('rules-boundaries', 'main-system-prompt'),
    loadPromptSection('examples', 'main-system-prompt'),
    loadPromptSection('thinking-process', 'main-system-prompt')
  ]);

  return builder
    .addSection(taskContext)
    .addSection(toneContext)
    .addSection(rulesBoundaries)
    .addSection(examples)
    .addSection(thinkingProcess)
    .build();
}
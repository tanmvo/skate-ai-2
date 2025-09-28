# Skate AI Prompt System

## Overview
Modular prompt templating system based on Anthropic's internal framework for optimal AI performance.

## Structure

### Framework (10 Sections)
1. **Task Context** - WHO the AI is and WHAT role it plays
2. **Tone Context** - HOW to communicate (specific tone guidance)
3. **Background Data** - Available context, documents, and tools
4. **Rules & Boundaries** - Detailed behavioral constraints and requirements
5. **Examples** - Show good output format and style
6. **Conversation History** - Context from ongoing chat sessions
7. **Immediate Task** - What to do RIGHT NOW
8. **Thinking Process** - Step-by-step reasoning framework
9. **Output Formatting** - Exact structure requirements
10. **Prefilled Response** - Guide output style and flow

### File Organization
```
lib/prompts/
├── prompt-builder.ts              # Core templating engine
├── templates/
│   ├── main-system-prompt.ts      # Main chat system prompt
│   └── study-summary-prompt.ts    # Post-upload summary prompt
└── components/
    ├── main-system-prompt/         # Main chat prompt components
    │   ├── 01-task-context.ts      # Section 1: WHO & WHAT
    │   ├── 02-tone-context.ts      # Section 2: HOW to communicate
    │   ├── 03-background-data.ts   # Section 3: Available context & tools
    │   ├── 04-rules-boundaries.ts  # Section 4: Detailed behavioral rules
    │   ├── 05-examples.ts          # Section 5: Show good output
    │   ├── 06-conversation-history.ts # Section 6: Ongoing context
    │   ├── 07-immediate-task.ts    # Section 7: Current task focus
    │   ├── 08-thinking-process.ts  # Section 8: Step-by-step reasoning
    │   ├── 09-output-formatting.ts # Section 9: Structure requirements
    │   └── 10-prefilled-response.ts # Section 10: Guide output style
    └── study-summary-prompt/       # Study summary prompt components
        ├── 01-task-context.ts      # Section 1: WHO & WHAT
        ├── 02-tone-context.ts      # Section 2: HOW to communicate
        ├── 03-background-data.ts   # Section 3: Available context & tools
        ├── 04-rules-boundaries.ts  # Section 4: Detailed behavioral rules
        ├── 05-examples.ts          # Section 5: Show good output
        ├── 06-conversation-history.ts # Section 6: Ongoing context
        ├── 07-immediate-task.ts    # Section 7: Current task focus
        ├── 08-thinking-process.ts  # Section 8: Step-by-step reasoning
        ├── 09-output-formatting.ts # Section 9: Structure requirements
        └── 10-prefilled-response.ts # Section 10: Guide output style
```

## Usage

### In Code
```typescript
// Main chat system prompt
const { buildSystemPrompt } = await import('@/lib/prompts/templates/main-system-prompt');
const prompt = await buildSystemPrompt({ studyContext });

// Study summary prompt
const { buildSummaryPrompt } = await import('@/lib/prompts/templates/study-summary-prompt');
const summaryPrompt = await buildSummaryPrompt();
```

### Adding Variables
```typescript
// In component file
const component: PromptSection = {
  id: 'example',
  content: 'Hello ${userName}, your study is ${studyName}',
  variables: ['userName', 'studyName']
};

// In template
const prompt = await builder
  .addSection(component)
  .setVariables({ userName: 'John', studyName: 'UX Research' })
  .build();
```

## Contributing

### Best Practices
- **One concept per component** - Keep sections focused and modular
- **Follow framework order** - Don't mix section types
- **Use clear variables** - `${variableName}` syntax with descriptive names
- **Test changes** - Run `npx tsx test-prompt-system.js` after edits

### Making Changes
1. **Edit components** in `lib/prompts/components/[prompt-name]/` for content changes
2. **Edit templates** in `lib/prompts/templates/` for structure changes
3. **Use Anthropic framework** - Reference [this Reddit guide](https://www.reddit.com/r/PromptEngineering/comments/1n08dpp/anthropic_just_revealed_their_internal_prompt/) for principles

### Component Naming Convention
- **Folder**: `components/[prompt-name]-prompt/` (e.g., `main-system-prompt/`, `study-summary-prompt/`)
- **Files**: `01-task-context.ts` through `10-prefilled-response.ts` (numbered for order)
- **Template**: `templates/[prompt-name]-prompt.ts` (e.g., `main-system-prompt.ts`, `study-summary-prompt.ts`)

### Tool Instructions
Split across framework sections:
- **Section 3**: What tools are available
- **Section 4**: Rules for when/how to use tools
- **Section 8**: Strategic thinking about tool selection

### Creating New Prompt Types
1. **Create component folder**: `components/new-prompt-name-prompt/`
2. **Add all 10 sections**: `01-task-context.ts` through `10-prefilled-response.ts`
3. **Create template**: `templates/new-prompt-name-prompt.ts`

```typescript
// Example: templates/document-analysis-prompt.ts
export async function buildDocumentAnalysisPrompt(variables: {...}): Promise<string> {
  const builder = createPromptBuilder();

  const [
    taskContext,
    toneContext,
    // ... all 10 sections
  ] = await Promise.all([
    loadPromptSection('task-context', 'document-analysis-prompt'),
    loadPromptSection('tone-context', 'document-analysis-prompt'),
    // ... load all 10 sections
  ]);

  return builder
    .addSection(taskContext)
    .addSection(toneContext)
    // ... add all 10 sections
    .setVariables(variables)
    .build();
}
```

## References
- [Anthropic Prompt Framework](https://www.reddit.com/r/PromptEngineering/comments/1n08dpp/anthropic_just_revealed_their_internal_prompt/)
- Framework improves consistency and quality by following psychological flow of AI processing
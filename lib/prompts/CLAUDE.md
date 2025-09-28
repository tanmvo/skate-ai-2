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
│   └── main-system-prompt.ts      # Assembles components into final prompt
└── components/
    ├── identity.ts                # Task context (Section 1)
    ├── study-context.ts           # Background data (Section 3)
    ├── constraints.ts             # Rules & boundaries (Section 4)
    ├── role-identification.ts     # Examples (Section 5)
    ├── reasoning-framework.ts     # Thinking process (Section 8)
    └── tools.ts                   # Tool capabilities (Section 3)
```

## Usage

### In Code
```typescript
const { buildSystemPrompt } = await import('@/lib/prompts/templates/main-system-prompt');
const prompt = await buildSystemPrompt({ studyContext });
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
1. **Edit components** in `lib/prompts/components/` for content changes
2. **Edit templates** in `lib/prompts/templates/` for structure changes
3. **Use Anthropic framework** - Reference [this Reddit guide](https://www.reddit.com/r/PromptEngineering/comments/1n08dpp/anthropic_just_revealed_their_internal_prompt/) for principles

### Tool Instructions
Split across framework sections:
- **Section 3**: What tools are available
- **Section 4**: Rules for when/how to use tools
- **Section 8**: Strategic thinking about tool selection

### Creating New Templates
```typescript
export async function buildCustomPrompt(variables: {...}): Promise<string> {
  const builder = createPromptBuilder();

  return builder
    .addSection(await loadPromptSection('identity'))
    .addSection(await loadPromptSection('custom-section'))
    .setVariables(variables)
    .build();
}
```

## References
- [Anthropic Prompt Framework](https://www.reddit.com/r/PromptEngineering/comments/1n08dpp/anthropic_just_revealed_their_internal_prompt/)
- Framework improves consistency and quality by following psychological flow of AI processing
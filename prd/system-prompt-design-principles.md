# System Prompt Design Principles

**Status**: Research Document  
**Created**: 2025-08-08  
**Type**: Design Guidelines

## Overview

This document outlines key techniques, heuristics, and design principles for constructing effective system prompts, extracted from analysis of ChatGPT's system prompt architecture.

## Complete Techniques Inventory

### Core Identity and Framing
- **Clear persona establishment**: Define the AI's identity, model version, and training source
- **Personality definition**: Explicitly define personality traits and interaction style
- **Knowledge boundaries**: Specify knowledge cutoff dates and temporal context

### Behavioral Control Mechanisms

#### Directive Language Patterns
- **Absolute prohibitions**: Use clear "Do not" statements for hard boundaries
- **Specific anti-patterns**: List exact phrases and behaviors to avoid
- **Positive alternatives**: Provide good/bad example pairs for clarity

#### Response Shaping
- **Question limitation**: Constrain when and how many clarifying questions to ask
- **Action orientation**: Encourage proactive behavior when next steps are obvious
- **Confidence building**: Include instructions to foster user self-assurance

### Tool Integration Architecture

#### Tool Definition Structure
- **Namespace organization**: Group related tools under clear organizational structures
- **Function-specific instructions**: Provide detailed usage guidelines and constraints per tool
- **Context-aware triggers**: Define specific scenarios that should activate tool usage
- **Error handling**: Include instructions for graceful failure recovery

#### Tool Usage Heuristics
- **Conditional logic**: Use "when to use this tool" decision trees
- **Negative constraints**: Define "when NOT to use" scenarios explicitly
- **Example-driven learning**: Provide concrete usage examples and patterns

### Content Safety and Boundaries
- **Implicit safety**: Reference content policies without detailed explanation
- **Professional boundaries**: Maintain clear capability and limitation separation
- **Privacy protection**: Include guidelines for handling sensitive information

### Formatting and Structure Techniques

#### Hierarchical Organization
- **Nested sections**: Use clear heading hierarchy for different instruction types
- **Bulleted constraints**: Create scannable lists of requirements and prohibitions
- **Categorized examples**: Group examples by type and scenario

#### Specification Patterns
- **JSON schema definitions**: Provide precise parameter specifications for structured outputs
- **Format examples**: Include concrete formatting templates and patterns
- **Pattern matching**: Use regular expressions for consistent output formatting

### Meta-Cognitive Instructions
- **Decision trees**: Implement if-then logic for complex scenario handling
- **Priority ordering**: Establish clear precedence when multiple rules conflict
- **Context sensitivity**: Enable behavior adjustment based on user expertise and context

### Advanced Techniques

#### Conditional Complexity Management
- **Scenario-based branching**: Different instruction sets for different contexts
- **Progressive disclosure**: Reveal complex instructions only when needed
- **Context inheritance**: Tool-specific behaviors inherit from general principles

#### User Experience Optimization
- **Friction reduction**: Minimize unnecessary back-and-forth interactions
- **Expectation management**: Provide clear capability and limitation statements
- **Adaptive verbosity**: Adjust response length based on scenario requirements

#### Quality Control Mechanisms
- **Self-verification**: Include instructions for self-checking and reasoning validation
- **Consistency enforcement**: Repeat emphasis on key behavioral patterns
- **Failure mode prevention**: Identify and prevent common mistake patterns

## Top 20% Priority Elements

The following five elements provide the highest leverage for creating effective system prompts:

### 1. Clear Identity & Role Definition
**Why Critical**: Without clear identity, the AI lacks consistent behavioral foundation.

**Implementation**:
- Define who the AI is and its primary function in the opening lines
- Specify personality traits explicitly rather than hoping they emerge naturally
- Include model version, training organization, and knowledge boundaries

**Example Pattern**:
```
You are [Name], a [type] based on [model] and trained by [organization].
Personality: [specific traits]
Knowledge cutoff: [date]
```

### 2. Explicit Behavioral Constraints
**Why Critical**: Prevents the most common and problematic failure modes.

**Implementation**:
- Use "Do NOT" statements with specific examples
- List exact phrases and behaviors to avoid
- Provide contrasting good/bad example pairs

**Example Pattern**:
```
Do NOT say: "would you like me to", "want me to do that"
Instead say: "Here are three examples..." [direct action]
```

### 3. Example-Driven Specification
**Why Critical**: Concrete examples are more effective than abstract descriptions.

**Implementation**:
- Show concrete examples rather than abstract behavioral descriptions
- Use before/after patterns to demonstrate expected transformations
- Include edge cases and failure scenarios in examples

**Example Pattern**:
```
<example>
user: [input]
assistant: [expected response]
</example>
```

### 4. Tool Integration Architecture
**Why Critical**: Most advanced AI systems require sophisticated tool usage coordination.

**Implementation**:
- Define clear "when to use" and "when NOT to use" criteria for each capability
- Specify trigger conditions that activate different behaviors
- Include error handling instructions for tool failures

**Example Pattern**:
```
Use [tool] when:
- [specific condition 1]
- [specific condition 2]

Do NOT use [tool] when:
- [specific constraint 1]
- [specific constraint 2]
```

### 5. Negative Space Definition
**Why Critical**: Defining boundaries is as important as defining capabilities.

**Implementation**:
- Explicitly state what the AI should refuse or avoid
- Use anti-patterns to prevent common failure modes
- Define capability limits clearly to manage user expectations

**Example Pattern**:
```
You MUST NOT:
- [specific prohibition 1]
- [specific prohibition 2]

If asked to [prohibited action], instead [alternative response].
```

## Implementation Guidelines

### Start With Foundation
1. Begin with identity and role definition
2. Establish core behavioral constraints
3. Add example-driven specifications

### Layer Complexity Gradually
1. Add tool integration after core behavior is solid
2. Include negative constraints throughout
3. Test each layer before adding the next

### Validate With Edge Cases
1. Test boundary conditions explicitly
2. Verify tool usage in failure scenarios
3. Confirm consistent personality across contexts

## Success Metrics

- **Behavioral consistency**: AI maintains character across all interactions
- **Boundary respect**: Clear adherence to defined constraints and limitations
- **Tool usage accuracy**: Appropriate tool selection based on defined criteria
- **Example alignment**: Outputs match provided example patterns
- **Failure recovery**: Graceful handling of error conditions and edge cases

## Anti-Patterns to Avoid

- Vague personality descriptions without concrete behavioral guidance
- Tool instructions without clear usage boundaries
- Abstract constraints without specific examples
- Missing error handling for tool failures
- Conflicting instructions without clear priority ordering
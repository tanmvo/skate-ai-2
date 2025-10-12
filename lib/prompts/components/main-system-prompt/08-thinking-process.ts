import { PromptSection } from '../../prompt-builder';

const thinkingProcess: PromptSection = {
  id: 'thinking-process',
  content: `## 8. Thinking Step-by-Step (REASONING PROCESS)

## Internal Analysis Framework

IMPORTANT: The steps below are for YOUR internal reasoning only. Do NOT include these tags or meta-commentary in your response to the user.

### Step 1: Question Decomposition
<thinking>
- What is the user actually asking?
- How many distinct insights will answer this?
- Which documents are most relevant?
- How many searches do I need? (Prefer 1-2 broad searches over 5+ narrow ones)
</thinking>

### Step 2: Evidence Gathering
<searching>
- Execute searches with appropriate parameters
- Note key findings and document sources
- Identify patterns across results
</searching>

### Step 3: Insight Synthesis
<analyzing>
- What are the 2-3 most important findings?
- What evidence supports each finding?
- Which documents contain this evidence?
</analyzing>

### Step 4: Response Compression (CRITICAL)
<compressing>
Before responding, apply these compression rules:

1. **Delete filler phrases:**
   - Remove "Based on my analysis..."
   - Remove "I've identified that..."
   - Remove "Overall..." / "In summary..."
   - Remove "This suggests that..." / "This indicates..."

2. **Eliminate redundancy:**
   - Scan for sentences that repeat the same idea
   - Delete any sentence that doesn't add NEW information
   - Combine related points into single sentences

3. **Directness check:**
   - Does your first sentence state the main finding?
   - Are you starting with buildup instead of insight?
   - Can you delete your first 1-2 sentences without losing meaning? (If yes, do it)

4. **Length check:**
   - Count sentences per insight (target: 2-3 max)
   - Count total paragraphs (most queries need only 1-2)
   - If over target, identify what can be cut

5. **Citation efficiency:**
   - Are citations inline and minimal?
   - Are you over-explaining where citations come from?
   - Use ^[Doc.pdf] syntax, not "According to Doc.pdf..."
</compressing>

### Step 5: Final Response
Deliver your compressed, information-dense response following all formatting rules.`,
  variables: []
};

export default thinkingProcess;
import { PromptSection } from '../../prompt-builder';

const examples: PromptSection = {
  id: 'examples',
  content: `## 5. Examples

## Response Compression Examples

### ❌ VERBOSE (Old Pattern):
"Based on my analysis of three interview transcripts, I've identified a key pattern around mobile banking frustrations. Sarah (UX Designer, from Sarah-Interview.txt) mentioned that 'the login process takes forever,' while Mike (Product Manager, from Mike-Interview.txt) noted similar concerns about 'authentication delays.' This suggests a systemic usability issue affecting multiple user types."

**Word count:** 58 words
**Issues:** Unnecessary preamble, redundant transitions, obvious synthesis statements

### ✅ CONCISE (New Pattern):
"Mobile login speed is a consistent pain point^[Sarah-Interview.txt]^[Mike-Interview.txt]. Sarah said 'the login process takes forever'^[Sarah-Interview.txt], while Mike noted similar authentication delays^[Mike-Interview.txt]."

**Word count:** 30 words (48% reduction)
**Improvement:** Same information + direct quote, half the length, direct insight delivery

---

## Role Identification Examples

### ✅ Good - Explicit Role Found:
"Amy Pan is a UX Designer^[Amy-Pan-Interview-Report.txt]."

### ✅ Good - No Explicit Role:
"Rajiv's role isn't stated, but he manages product roadmaps^[Rajiv-Interview.txt]."

---

## Search Strategy Examples

**Multi-document study (10+ docs):**
- Use ONE broad search with limit=15, minSimilarity=0.05
- NOT 5+ narrow searches with limit=3

**Focused query (1-2 docs):**
- Use default parameters (limit=3)

**Comparison query:**
- ONE search covering all topics > multiple narrow searches`,
  variables: []
};

export default examples;
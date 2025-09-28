import { PromptSection } from '../prompt-builder';

const examples: PromptSection = {
  id: 'examples',
  content: `## 5. Examples

## Role Identification Examples

### Good Example - Explicit Role Found:
"Amy Pan is a UX Designer (from Amy-Pan-Interview-Report.txt)"

### Good Example - No Explicit Role:
"Rajiv's specific role isn't stated, but based on the information provided, he appears to work in [brief description of activities based on interview content]"

### Search Strategy Examples:
- For one person: Search "PersonName role" - done
- For multiple people: Search "participant roles" or "all roles" - done
- Look for "**Role:**" or "**Title:**" in results first
- SILENTLY EXCLUDE interviewers/moderators - only list actual participants

### Analysis Response Example:
**Good format:**
"Based on my analysis of three interview transcripts, I've identified a key pattern around mobile banking frustrations. Sarah (UX Designer, from Sarah-Interview.txt) mentioned that 'the login process takes forever,' while Mike (Product Manager, from Mike-Interview.txt) noted similar concerns about 'authentication delays.' This suggests a systemic usability issue affecting multiple user types."

**Bad format:**
"I found the following information: [search results]. Here are the search results."`,
  variables: []
};

export default examples;
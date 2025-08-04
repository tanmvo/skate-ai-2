Absolutely. Below is a tailored version of the **Prompting System Guide** specifically for a **User Research Agent performing analysis**—not conducting interviews.

This version focuses on helping your agent **read participant responses**, **identify themes**, **summarize insights**, and **decide what to do next**, autonomously and reliably.

---

# 🧠 Prompting System for Agentic Research Analysis

## 🔧 What This Is

A practical guide to help you **design and evolve prompts** for an agent that analyzes qualitative user research data (e.g. survey answers, interview transcripts) and produces meaningful outputs: themes, summaries, and insights.

---

## 1. 🧭 Principles: When & Why To Use an Agent

Use an agent if:

* The task is **complex** (e.g. drawing patterns across many messy responses).
* It’s **valuable** (e.g. generating insights for product strategy).
* You can **give it tools** (summarization, thematic clustering, etc.).
* You can **detect/correct errors** (manual review, human-in-the-loop).
* You can loop until completion (e.g., refine analysis until themes are stable).

---

## 2. 🧱 Agent Architecture

* **Environment**: A set of documents or structured answers from participants.

* **System Prompt**: An instruction describing the goal, such as:

  > “You are a user researcher analyzing participant responses to a study. Extract themes, identify pain points, and suggest key insights.”

* **Tools** the agent can call:

  * `clusterResponses(responses)`
  * `extractTheme(cluster)`
  * `summarizeThemes(themes)`
  * `generateInsight(theme)`
  * `checkForNewPatterns(responses, knownThemes)`

---

## 3. 🧠 Think Like the Agent

Put yourself in the agent’s shoes:

* If you were only given these tool names and a blob of text, would *you* know what to do?
* Can you simulate a step-by-step process using just those tools?
* If not, clarify the instructions or tool descriptions.

---

## 4. 📐 Prompt Structure for Analysis Agents

### 1. **Start Simple**

```plaintext
You are a research analyst. Analyze participant responses to identify recurring themes. Output a list of themes with a short description for each.
```

### 2. **Add Heuristics**

```plaintext
- Group related responses into clusters first.
- Prioritize clarity and conciseness.
- Avoid generic themes like “User experience” unless you can define them precisely.
- Label each theme with 2–5 words and a 1–2 sentence description.
```

### 3. **Add Thinking Steps**

```plaintext
Before analyzing:
- Reflect on what the study was about.
- What kind of insights would help the product team?

During:
- After processing each cluster, check: is this theme truly distinct?
- If unsure, mark as “tentative” for later human review.

After:
- Summarize top 3 most important themes.
- Suggest 1–2 product opportunities or next research questions.
```

---

## 5. 🛠 Tool Design Guidelines

**Good tools are:**

* **Clearly named**: `extractPainPoints`, not `function_5`
* **Well described**: “Extracts pain points from a list of user responses”
* **Distinct in function**: Don’t give three versions of “summarize insight”
* **Field-tested**: Use real data and verify that tools return useful outputs

---

## 6. 📏 Evaluation Methods

### Manual Evals (Early Stage)

* Review outputs: Are the themes real? Actionable?
* Ask: “Would a researcher or PM find this useful?”

### Use LLM-as-Judge with Rubrics

Example rubric:

```plaintext
- ✅ Themes are distinct and clearly labeled
- ✅ Descriptions reflect actual user sentiment
- ✅ Insights are grounded in evidence
- ✅ No hallucinations or unjustified assumptions
```

### Check for:

* Tool usage correctness (e.g. used `clusterResponses` before `extractTheme`)
* Final outputs (e.g. 5–7 themes + 3 insights + summary)
* Human readability

---

## 7. 🌀 Avoiding Pitfalls & Side Effects

* Don’t tell it “be thorough” without limits — it may overanalyze.
* Prevent loops with caps: e.g., “max 3 passes through the data”
* If insights are weak, add heuristics like:

  ```plaintext
  Only generate an insight if it’s clearly supported by 3 or more unique responses.
  ```

---

## 8. 🧵 Managing Context

If analyzing large datasets:

* Add a `summarizeChunk` tool for batched processing
* Use a scratchpad (e.g. external memory file) to retain key points
* Compact interim results:

  ```plaintext
  Every 100 responses, compress themes and re-cluster.
  ```

---

## 9. 🔄 Development Flow

```
1. Start with a simple goal (e.g., “Extract 5 themes”)
2. Test with real study data
3. Identify where the agent fails (e.g. too broad, too few insights)
4. Add heuristics + clarify tool descriptions
5. Build a small eval set
6. Tune prompt + tools iteratively
```

---

## 🔎 Concrete Example Prompt Template

```plaintext
You are a user research analyst.

Your goal: Analyze the following participant responses and extract recurring themes. Label each theme with a short phrase and describe it clearly in 1–2 sentences.

Guidelines:
- First cluster related responses together
- Then identify what unifies them (the theme)
- Avoid overly broad categories
- Highlight quotes if helpful
- Generate 5–7 themes max
- At the end, summarize the top 3 most actionable insights

Use your tools thoughtfully and avoid repeating analysis. 
```

---

## 🧪 Example Eval Task

**Input**: 100 user survey answers to “Why did you choose this hotel?”

**Expected Agent Output**:

* 5–7 labeled themes like:

  * `Price Sensitivity`: “Many users chose hotels primarily for their affordability.”
  * `Proximity to Events`: “Several responses mentioned location near a concert or venue.”

* 3 product insights:

  * “Offer price-based filtering more prominently”
  * “Highlight distance from local events”

* Meta check:

  * Did the agent use clustering?
  * Did it avoid duplicating themes?

---

Let me know if you'd like this packaged into a PDF, Markdown, Notion format, or integrated into your own app’s documentation.

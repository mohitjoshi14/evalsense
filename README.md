[![Evalsense logo](./brand/evalsense.png)](https://www.evalsense.com)

[![npm version](https://img.shields.io/npm/v/evalsense.svg)](https://www.npmjs.com/package/evalsense)
[![CI](https://github.com/evalsense/evalsense/actions/workflows/ci.yml/badge.svg)](https://github.com/evalsense/evalsense/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> **Jest for LLM Evaluation.** Pass/fail quality gates for your LLM-powered code.

evalsense runs your code across many inputs, measures quality statistically, and gives you a clear **pass / fail** result — locally or in CI.

```bash
npm install --save-dev evalsense
```

## Quick Start

Create `sentiment.eval.js`:

```javascript
import { describe, evalTest, expectStats } from "evalsense";
import { readFileSync } from "fs";

function classifySentiment(text) {
  return /love|great|amazing/.test(text.toLowerCase()) ? "positive" : "negative";
}

describe("Sentiment classifier", () => {
  evalTest("accuracy above 80%", async () => {
    const groundTruth = JSON.parse(readFileSync("./sentiment.json", "utf-8"));

    const predictions = groundTruth.map((record) => ({
      id: record.id,
      sentiment: classifySentiment(record.text),
    }));

    expectStats(predictions, groundTruth)
      .field("sentiment")
      .accuracy.toBeAtLeast(0.8)
      .recall("positive")
      .toBeAtLeast(0.7)
      .precision("positive")
      .toBeAtLeast(0.7)
      .displayConfusionMatrix();
  });
});
```

Run it:

```bash
npx evalsense run sentiment.eval.js
```

Output:

```
EvalSense v0.4.1
Running 1 eval file(s)...

  Sentiment classifier

    ✓ accuracy above 80% (12ms)
      Field: sentiment | Accuracy: 90.0% | F1: 89.5%
        negative: P=88.0% R=92.0% F1=90.0% (n=25)
        positive: P=91.0% R=87.0% F1=89.0% (n=25)
      ✓ Accuracy 90.0% >= 80.0%
      ✓ Recall for 'positive' 87.0% >= 70.0%
      ✓ Precision for 'positive' 91.0% >= 70.0%

  Summary

    Tests: 1 passed, 0 failed, 0 errors, 0 skipped
    Duration: 12ms

  All tests passed!
```

## Key Features

- **Jest-like API** — `describe`, `evalTest`, `expectStats` feel familiar
- **Statistical assertions** — accuracy, precision, recall, F1, MAE, RMSE, R²
- **Confusion matrices** — built-in display with `.displayConfusionMatrix()`
- **Distribution monitoring** — `percentageAbove` / `percentageBelow` without ground truth
- **LLM-as-judge** — built-in hallucination, relevance, faithfulness, toxicity metrics
- **CI/CD ready** — structured exit codes, JSON reporter, bail mode
- **Zero config** — works with any JS data loading and model execution

## Two Ways to Use It

### With ground truth (classification / regression)

```javascript
expectStats(predictions, groundTruth)
  .field("label")
  .accuracy.toBeAtLeast(0.9)
  .recall("positive")
  .toBeAtLeast(0.8)
  .f1.toBeAtLeast(0.85);
```

### Without ground truth (distribution monitoring)

```javascript
expectStats(llmOutputs).field("toxicity_score").percentageBelow(0.3).toBeAtLeast(0.95); // 95% of outputs must be non-toxic
```

## LLM-Based Metrics

```javascript
import { setLLMClient, createAnthropicAdapter } from "evalsense/metrics";
import { hallucination, relevance } from "evalsense/metrics/opinionated";

setLLMClient(
  createAnthropicAdapter(process.env.ANTHROPIC_API_KEY, {
    model: "claude-haiku-4-5-20251001",
  })
);

const scores = await hallucination({
  outputs: [{ id: "1", output: "Paris has 50 million people." }],
  context: ["Paris has approximately 2.1 million residents."],
});
// scores[0].score → 0.9 (high hallucination)
// scores[0].reasoning → "Output claims 50M, context says 2.1M"
```

Built-in providers: OpenAI, Anthropic, OpenRouter, or bring your own adapter.
See [LLM Metrics Guide](./docs/llm-metrics.md) and [Adapters Guide](./docs/llm-adapters.md).

## Using with Claude Code (Vibe Check)

evalsense includes an example [Claude Code skill](./skill.md) that acts as an automated LLM quality gate. To set it up in your project:

1. Install evalsense as a dev dependency
2. Copy [`skill.md`](./skill.md) into your project at `.claude/skills/llm-quality-gate/SKILL.md`
3. After building any LLM feature, run `/llm-quality-gate` in Claude Code

Claude will automatically create a `.eval.js` file with a real dataset and meaningful thresholds, run `npx evalsense run`, and give you a **ship / no-ship** decision.

## Documentation

| Guide                                              | Description                                      |
| -------------------------------------------------- | ------------------------------------------------ |
| [API Reference](./docs/api-reference.md)           | Full API — all assertions, matchers, metrics     |
| [CLI Reference](./docs/cli.md)                     | All CLI flags, exit codes, CI integration        |
| [LLM Metrics](./docs/llm-metrics.md)               | Hallucination, relevance, faithfulness, toxicity |
| [LLM Adapters](./docs/llm-adapters.md)             | OpenAI, Anthropic, OpenRouter, custom adapters   |
| [Custom Metrics](./docs/custom-metrics-guide.md)   | Pattern and keyword metrics                      |
| [Agent Judges](./docs/agent-judges.md)             | Design patterns for evaluating agent systems     |
| [Regression Metrics](./docs/regression-metrics.md) | MAE, RMSE, R² usage                              |
| [Examples](./examples/)                            | Working code examples                            |

## Dataset Format

Records must have an `id` or `_id` field:

```json
[
  { "id": "1", "text": "sample input", "label": "positive" },
  { "id": "2", "text": "another input", "label": "negative" }
]
```

## Exit Codes

| Code | Meaning                   |
| ---- | ------------------------- |
| `0`  | All tests passed          |
| `1`  | Assertion failure         |
| `2`  | Dataset integrity failure |
| `3`  | Execution error           |
| `4`  | Configuration error       |

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, coding standards, and the PR process.

## License

[Apache 2.0](./LICENSE)

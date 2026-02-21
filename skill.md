---
name: llm-quality-gate
description: Automated LLM quality gate. Creates and runs an evalsense eval for a recently built LLM feature, then gives a ship/no-ship decision.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash, Write
---

# LLM Quality Gate

Create, run, and validate an evalsense eval for the recently built LLM feature. No shipping until every assertion passes.

## Step 1 — Understand the Feature

Read recently changed files to identify what the feature outputs and what "correct" looks like. If unclear, ask the user one focused question before continuing.

## Step 2 — Ensure evalsense is Available

```bash
npx evalsense --help
```

If that fails, install it: `npm install --save-dev evalsense`

## Step 3 — Create the Eval File

Create `<feature>.eval.js` next to the feature or in `tests/`:

```js
import { describe, evalTest, expectStats } from "evalsense";

describe("<Feature Name>", () => {
  evalTest("<what is being tested>", async () => {
    // Every record MUST have an `id` field. Minimum 10 records.
    // Cover: typical inputs, edge cases, adversarial, empty/null.
    const groundTruth = [
      { id: "1", input: "...", expected_field: "<label or value>" },
    ];

    const predictions = await Promise.all(
      groundTruth.map(async (record) => ({
        id: record.id,
        predicted_field: await yourFeature(record.input),
      }))
    );

    // Use the right metric for the output type — no trivially passing thresholds:
    //   Classification → .accuracy, .precision("class"), .recall("class"), .f1
    //   Scores        → .percentageAbove(threshold)
    //   No ground truth → LLM-as-judge via evalsense/metrics/opinionated
    expectStats(predictions, groundTruth).field("predicted_field").accuracy.toBeAtLeast(0.85);
  });
});
```

## Step 4 — Run and Decide

Check available output flags, then run with JSON output for reliable parsing:

```bash
npx evalsense run --help
npx evalsense run -r json -o report.json
```

Read `report.json`. If all assertions pass, tell the user the feature is cleared to ship. If any fail, report which threshold was not met and suggest next steps (improve model, adjust prompts, expand data). Do not clear the feature until every assertion passes.

# LLM Quality Gate

You are enforcing the LLM quality gate for this project. The user has just
implemented an LLM-powered feature. Your job is to create, run, and validate an
eval using evalsense before the feature can ship.

Work through each step below in order. Do not skip steps.

## Step 1 — Understand the Feature

Read the recently changed files to identify:

- What the LLM feature does and what it outputs
- What field(s) are being predicted or scored
- What "correct" looks like (classification labels, scores, boolean outcomes)

If it is not obvious from the code, ask the user one focused question before
proceeding.

## Step 2 — Check evalsense is Installed

Look at `package.json`. If `evalsense` is not in `devDependencies`, install it:

```bash
npm install --save-dev evalsense
```

## Step 3 — Create the Eval File

Create `<feature>.eval.js` (or `.eval.ts`) next to the feature file or inside
`tests/`. Name the file after the feature being evaluated.

Use this template and fill in every placeholder:

```js
import { describe, evalTest, expectStats } from "evalsense";

describe("<Feature Name>", () => {
  evalTest("<what is being tested>", async () => {
    // 1. Ground truth dataset — must include edge cases
    //    Every record MUST have an `id` field
    const groundTruth = [
      { id: "1", input: "...", expected_field: "<label or value>" },
      // ... at least 10 records covering normal cases and edge cases
    ];

    // 2. Run the feature under evaluation
    const predictions = await Promise.all(
      groundTruth.map(async (record) => ({
        id: record.id,
        predicted_field: await yourFeature(record.input),
      }))
    );

    // 3. Assert measurable thresholds — no vague checks
    expectStats(predictions, groundTruth)
      .field("predicted_field")
      .accuracy.toBeAtLeast(0.85);
    // Add more assertions based on what matters for this feature:
    //   .recall("critical-class").toBeAtLeast(0.9)
    //   .f1.toBeAtLeast(0.8)
    //   .percentageAbove(0.7).toBeAtLeast(0.8)   // for numeric scores
  });
});
```

**Rules for the dataset:**

- Minimum 10 records; more for high-stakes features
- Cover: typical inputs, edge cases, adversarial inputs, empty/null inputs
- Labels must match exactly what the feature returns
- Every record needs `id` (or `_id`) — no exceptions

**Rules for thresholds:**

- Every assertion must encode a specific numeric bar
- Do not use `.toBeAtLeast(0)` or trivially passing thresholds
- Use the appropriate metric for the output type:
  - Classification → `.accuracy`, `.precision("class")`, `.recall("class")`, `.f1`
  - Scores / probabilities → `.percentageAbove(threshold)`
  - Without ground truth → LLM-as-judge via `evalsense/metrics/opinionated`

## Step 4 — Run the Eval

```bash
npx evalsense run
```

Capture the output. If the run fails due to a missing import or configuration
error, fix it and re-run before reporting results.

## Step 5 — Report and Decide

After the run, report to the user:

- Which eval file was created and where
- Each assertion and whether it passed or failed
- The confusion matrix or distribution summary if printed

Then apply the shipping rule:

| Result | Action |
|---|---|
| All assertions pass | Tell the user the feature is cleared to ship |
| Any assertion fails | Tell the user which threshold was not met and what was observed; do NOT clear the feature for shipping |

Do not mark the feature as done until every assertion passes. If thresholds are
failing, suggest concrete next steps: improve the model, adjust prompts, expand
training data, or tighten the feature logic.

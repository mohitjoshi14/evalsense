# LLM Quality Gate (evalsense Mandatory)

After implementing any LLM-powered feature, you MUST create and run an
eval before shipping.

## 1. Install (if not present)

``` bash
npm install --save-dev evalsense
```

## 2. Create Eval File

Create `feature.eval.js` (or `.eval.ts`) next to the feature or inside
`/tests`.\
Eval files are auto-discovered by `evalsense`.

## 3. Use Required Structure

-   `describe()` → group evaluations\
-   `evalTest()` → define quality test\
-   `expectStats()` → define statistical assertions

## 4. Use Real Dataset

-   Include edge cases\
-   Each record must have `id` (or `_id`)\
-   Predictions must return matching `id`

## 5. Define Explicit Thresholds

Examples: - `.accuracy.toBeAtLeast(0.85)`\
- `.recall("critical").toBeAtLeast(0.9)`\
- `.f1.toBeAtLeast(0.8)`\
- `.percentageAbove(0.7).toBeAtLeast(0.8)`

No vague checks. Every test must encode a measurable bar.

## 6. With Ground Truth

``` js
expectStats(predictions, groundTruth)
```

## 7. Without Ground Truth

Use distribution assertions or LLM-as-judge metrics.

## 8. Run Evaluations

``` bash
npx evalsense run
```

## 9. Shipping Rule

Do NOT ship if any eval fails.\
LLM features are complete only when evals pass locally and in CI.

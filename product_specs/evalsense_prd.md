# evalsense — JS‑Native LLM Evaluation Framework

This document defines **what evalsense is**, **what problems it solves**, and **how it is structured**. It is intentionally concise, readable, and opinionated.

---

## 1. What problem are we solving?

LLM evaluation today is fragmented and weak in three important ways:

### 1.1 Metrics without statistics
Most tools produce *scores* (accuracy, relevance, hallucination, etc.) but stop there.
They do **not**:
- compute confusion matrices
- analyze false positives vs false negatives
- show where models fail systematically

This hides regressions and bias.

---

### 1.2 Metrics treated as truth
LLM‑as‑judge metrics (relevance, hallucination, faithfulness) are treated as ground truth.

In reality:
- these metrics are **models themselves**
- they can be biased, noisy, or mis‑calibrated
- almost no tooling evaluates the *quality of the metric*

---

### 1.3 No JS‑native, data‑centric eval system
Existing rigorous eval frameworks:
- are Python‑centric
- are test‑case oriented
- do not fit JS / Node / CI workflows

JS teams lack a **metrics‑first, statistical evaluation engine**.

---

## 2. What is evalsense?

**evalsense** is a JavaScript evaluation framework that:

- runs real application code (like Jest)
- evaluates **datasets**, not single examples
- applies **classical ML statistics** when structure exists
- supports **opinionated LLM metrics** without treating them as truth
- validates **both outputs and metrics statistically**

> Core idea: **metrics are predictions, not facts**.

---

## 3. What evalsense explicitly does

- Executes `.eval.js` files (Jest‑like)
- Runs your real modules on datasets
- Collects structured outputs
- Computes statistics:
  - confusion matrices
  - precision / recall / F1
  - regression error metrics
- Generates opinionated metrics (hallucination, relevance, etc.)
- Evaluates those metrics statistically if reference labels exist
- Produces deterministic, CI‑friendly reports

---

## 4. What evalsense does *not* do (clarified)

- Does not *own* prompt orchestration or provide a hosted LLM API. evalsense may execute user modules which in turn call LLMs, and it can consume those outputs or run the module to produce them. It intentionally does **not** bundle or manage LLM provider integrations, rate limiting, or prompt templating as first‑class features—those remain the responsibility of the calling code or optional adapters.

- Does not automatically determine correctness for unconstrained free‑form text. When outputs are structured (labels, fields, numbers) evalsense computes classical statistics. For free‑form text, evalsense provides opinionated semantic metrics (LLM‑as‑judge or heuristic scorers) but treats those as **weak labels** that must be validated statistically against human references when correctness matters.

## 5. Core concepts (minimal mental model) (minimal mental model)

### 5.1 Eval files

`.eval.js` files are like test files, but operate on **datasets**.

```text
.eval.js ≈ Jest test
record   ≈ test case
metrics  ≈ assertions
```

---

### 5.2 Dataset‑level evaluation

Instead of:
```
input → output → assert
```

We evaluate:
```
dataset → outputs → statistics
```

This preserves error structure.

---

### 5.3 Field typing

Every evaluated field has a type:

- `boolean`
- `categorical`
- `numeric`
- `numeric + threshold`

The type determines the statistics that apply.

---

### 5.4 Opinionated metrics

Built‑in metrics such as:
- relevance
- hallucination
- faithfulness
- refusal correctness

These:
- produce scores or labels
- are **weak labels**
- can themselves be evaluated statistically

---

## 6. High‑level architecture (simple)

```
.eval.js
   ↓
execute real code
   ↓
align actual vs expected
   ↓
field‑level statistics
   ↓
metric validation (optional)
   ↓
report + CI signal
```

---

## 7. Execution model

1. Discover `*.eval.js`
2. Run user code on dataset
3. Collect outputs
4. Apply statistics
5. Fail or pass based on thresholds

This mirrors how Jest runs tests, but at dataset scale.

---

## 8. Why this is different from existing tools

| Tool | Model |
|-----|------|
| Jest | unit tests |
| Promptfoo | prompt regression |
| DeepEval | test‑centric LLM scoring |
| **evalsense** | **data‑centric statistical evaluation** |

---

## 9. When to use evalsense

Use evalsense when:
- outputs are structured
- false positives vs false negatives matter
- you need regression detection
- you want CI‑level guarantees

Do not use evalsense for:
- purely creative text
- stylistic evaluation

---

## 10. One‑sentence summary

**evalsense brings classical ML‑style statistical evaluation to LLM systems in JavaScript, without pretending metrics are truth.**

---

*End of document.*


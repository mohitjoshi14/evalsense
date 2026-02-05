# evalsense — Architecture Document

This document describes the **technical architecture** of the evalsense library: its internal components, execution model, extension points, and distribution strategy. It is intended for maintainers and advanced contributors.

---

## 1. Architectural goals

evalsense is designed to be:

1. **Data-centric** — evaluates datasets and distributions, not individual examples.
2. **Statistically rigorous** — classical ML metrics are first-class outputs.
3. **Metric-agnostic but metric-aware** — opinionated metrics are supported without being treated as truth.
4. **JS-native** — first-class support for Node.js and modern JS toolchains.
5. **CI-friendly** — deterministic execution, machine-readable artifacts, explicit failure semantics.
6. **Composable** — integrates with existing LLM code rather than replacing it.

---

## 2. High-level system overview

At a high level, evalsense consists of:

1. A **runner/CLI** that discovers and executes evaluation suites
2. A **core evaluation engine** that aligns data and computes statistics
3. A **metric layer** (opinionated and custom) that produces weak labels or scores
4. A **validation layer** that evaluates metric outputs statistically
5. A **reporting layer** that emits deterministic artifacts
6. A **distribution layer** that makes the system installable and discoverable

---

## 3. Execution model

The execution model is intentionally similar to Jest, but operates at dataset scale.

### 3.1 Discovery

- The runner scans the project for `**/*.eval.js` files.
- Each file is treated as an evaluation suite.
- Discovery is deterministic and configurable via CLI flags.

### 3.2 Execution

For each `.eval.js` file:

1. The file is loaded in an isolated module context.
2. User-defined evaluation logic executes real application code.
3. The application code may call LLMs, databases, or other services.
4. Structured outputs are collected into in-memory or streamed datasets.

### 3.3 Evaluation

After execution:

1. Outputs are aligned against reference data (ground truth or human labels).
2. Field-level statistics are computed.
3. Metric outputs (e.g. hallucination scores) are treated as predictions.
4. Optional statistical validation of metrics is performed.

### 3.4 Finalization

- Results are aggregated.
- Thresholds are evaluated.
- Reports are written.
- A process exit code is returned for CI consumption.

---

## 4. Core components

### 4.1 Runner / CLI

**Responsibilities**:
- File discovery (`*.eval.js`)
- Parallel or serial execution
- Environment capture (Node version, OS, package hash)
- Exit-code semantics

**Key characteristics**:
- Stateless between runs
- Deterministic by default
- Supports large datasets via batching

---

### 4.2 Execution adapter

The execution adapter abstracts *how* user code is run.

**Responsibilities**:
- Invoke user-defined functions per record or per batch
- Handle async execution, retries, and timeouts
- Capture provenance metadata

**Design constraints**:
- evalsense does not manage prompts or LLM providers
- evalsense executes whatever the user code does

---

### 4.3 Dataset alignment engine

The alignment engine reconciles actual outputs with expected references.

**Responsibilities**:
- Match records using a declared key
- Detect missing, duplicate, or malformed records
- Emit integrity diagnostics

**Alignment strategies**:
- Exact key match (default)
- Index-based fallback
- Optional fuzzy matching (opt-in)

---

### 4.4 Field evaluation engine

The field evaluator computes statistics based on declared field types.

**Supported field types**:
- Boolean (binary classification)
- Categorical (multi-class classification)
- Numeric (regression)
- Numeric with threshold (derived classification)

**Outputs**:
- Confusion matrices
- Precision, recall, F1 (macro/micro)
- Regression error metrics
- Per-class and per-segment summaries

---

### 4.5 Metric layer (opinionated and custom)

Metrics are functions that *produce* labels or scores.

**Opinionated metrics** (shipped with evalsense):
- Relevance
- Hallucination
- Faithfulness / groundedness
- Refusal correctness

**Characteristics**:
- Implemented as pure functions over model outputs and context
- Deterministic at fixed settings
- Explicitly marked as **weak labelers**

Custom metrics follow the same interface and lifecycle.

---

### 4.6 Metric validation layer

This layer evaluates the *quality of metrics themselves*.

**Responsibilities**:
- Compare metric outputs to human references
- Compute confusion matrices for metrics
- Measure agreement and calibration

**Supported analyses**:
- Precision / recall of metric labels
- Inter-annotator agreement (e.g. Cohen’s kappa)
- Calibration error for continuous scores

---

### 4.7 Aggregation & reporting

Results are aggregated into a canonical report.

**Report characteristics**:
- Fully deterministic
- JSON-first
- Suitable for diffing across runs

**Primary contents**:
- Summary statistics
- Dataset integrity diagnostics
- Field-level metrics
- Metric validation results

Optional secondary exports (CSV, NDJSON) are supported.

---

## 5. Failure semantics

Evaluation results can fail for multiple reasons:

- Metric threshold violation
- Dataset integrity failure
- Execution error

Each failure class maps to a distinct exit code to support CI workflows.

---

## 6. Extensibility model

### 6.1 Custom metrics

Users can register custom metrics that:
- Accept outputs and optional context
- Emit structured labels or scores
- Participate in validation like built-in metrics

### 6.2 Custom field types

Advanced users may define new field types with:
- Extraction logic
- Metric computation rules
- Serialization rules

---

## 7. Distribution & packaging

### 7.1 Package structure

The library is distributed as a single npm package:

- **Name**: `evalsense`
- **Module type**: ES modules
- **Language**: TypeScript (compiled to JS)

Logical exports:
- `evalsense` (core engine)
- `evalsense/runner` (CLI entry)
- `evalsense/metrics` (opinionated metrics)

---

### 7.2 Installation

- Installed as a dev dependency in application repositories
- Optional global installation for CLI usage

The CLI is exposed via the package `bin` field.

---

### 7.3 Versioning

- Semantic versioning (semver)
- Separate versioning for report schema
- Backward compatibility guaranteed within a major version

---

## 8. Reproducibility & determinism

To ensure reproducibility:

- Input dataset hashes are recorded
- Eval file checksums are captured
- Environment metadata is embedded in reports
- Randomness is explicitly seeded

---

## 9. Performance & scalability

- Streaming dataset ingestion (NDJSON)
- Batched execution for rate-limited models
- Memory-efficient aggregation
- Parallel execution with controlled concurrency

---

## 10. Security & privacy

- No external network calls by default
- Redaction hooks for sensitive fields
- Designed to run in air-gapped environments

---

## 11. Positioning summary

- **Not** a prompt orchestration tool
- **Not** a hosted evaluation platform
- **Is** a statistical evaluation engine for LLM systems
- **Is** designed to complement existing JS LLM stacks

---

*End of architecture document.*


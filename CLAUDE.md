# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

evalsense is a JavaScript-native LLM evaluation framework that brings classical ML-style statistical evaluation to LLM systems. It provides a Jest-like API for dataset-level evaluation with confusion matrices, precision/recall, and statistical assertions. The core philosophy: **metrics are predictions, not facts**.

## Development Commands

### Build & Test
```bash
npm run build          # Build all packages using tsup
npm run dev            # Build in watch mode
npm test               # Run unit tests with vitest
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage (80% threshold)
```

### Code Quality
```bash
npm run lint           # Lint src/ and tests/ with ESLint
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier
npm run format:check   # Check formatting without changes
npm run typecheck      # Type-check without building
```

### CLI Usage
```bash
npx evalsense run [path]              # Run eval files
npx evalsense run -f "accuracy"       # Filter tests by name
npx evalsense run -o report.json      # Output JSON report
npx evalsense run -r console          # Use console reporter (default)
npx evalsense run -r json             # Use JSON reporter
npx evalsense run -r both             # Use both reporters
npx evalsense run -b                  # Bail on first failure
npx evalsense run -t 60000            # Set timeout (default: 30000ms)
npx evalsense list [path]             # List discovered eval files
```

## Architecture

### Core Execution Flow
```
.eval.js file
  ↓
describe() + evalTest() (Jest-like API)
  ↓
loadDataset() → runModel() → expectStats()
  ↓
field-level statistics (confusion matrix, precision/recall, F1)
  ↓
assertions (toHaveAccuracyAbove, etc.)
  ↓
report + exit code
```

### Module Structure

**Core modules:**
- `src/core/`: Test framework (describe, evalTest, types, context management)
- `src/dataset/`: Data loading, model execution, alignment, integrity checks
- `src/statistics/`: Classification metrics, confusion matrices, regression metrics, calibration
- `src/assertions/`: Statistical assertion API (expectStats chain)
- `src/runner/`: File discovery, test execution, CLI
- `src/report/`: Console and JSON reporters
- `src/metrics/`: Metric utilities and LLM integration
  - `llm/`: LLM client management, utilities, and adapters
  - `llm/prompts/`: Evaluation prompts for each metric (per-row and batch variants)
  - `opinionated/`: LLM-based metrics (hallucination, relevance, faithfulness, toxicity)
  - `custom/`: Custom metric registration and utilities
  - `utils/`: Shared metric utilities

**Key architectural patterns:**
- **Context system**: Global test context tracks current suite, suites, and test results (see `src/core/context.ts`)
- **Aligned records**: Core data structure pairs `actual` (model output) vs `expected` (ground truth)
- **Field selectors**: Fluent API for field-level assertions via `expectStats().field(name)`
- **Metric validation**: Metrics produce scores/labels that are validated statistically against references

### Package Exports

The library exposes multiple entry points:
- `evalsense`: Core API (describe, evalTest, expectStats, etc.)
- `evalsense/metrics`: Metric utilities and custom metric registration
- `evalsense/metrics/opinionated`: Built-in LLM metrics (hallucination, relevance, faithfulness, toxicity)
- Binary: `evalsense` CLI command via bin/evalsense.js

### Building

The project uses `tsup` to build:
- **Format**: Both ESM (`dist/*.js`) and CJS (`dist/*.cjs`)
- **Entry points**: `index.ts`, `metrics/index.ts`, `metrics/opinionated/index.ts`, `runner/cli.ts`
- **Output**: `dist/` with separate .d.ts type definitions for each format

## Writing Eval Files

Eval files use `.eval.js` or `.eval.ts` extension and follow Jest-like patterns:

```javascript
import { describe, evalTest, expectStats, loadDataset, runModel } from "evalsense";

describe("Model name", () => {
  evalTest("test name", async () => {
    // 1. Load dataset (requires 'id' or '_id' field)
    const dataset = loadDataset("./data.json");

    // 2. Run model function (must return { id, ...fields })
    const result = await runModel(dataset, (record) => ({
      id: record.id,
      prediction: yourModel(record)
    }));

    // 3. Assert on statistics
    expectStats(result)
      .field("prediction")
      .toHaveAccuracyAbove(0.8)
      .toHaveRecallAbove("positive", 0.7)
      .toHavePrecisionAbove("positive", 0.7)
      .toHaveF1Above(0.75)
      .toHaveConfusionMatrix();
  });
});
```

**Key constraints:**
- Dataset records MUST have `id` or `_id` field for alignment
- Model functions MUST return predictions with matching `id`
- Evaluation is dataset-level, not per-example
- Use lifecycle hooks: `beforeAll`, `afterAll`, `beforeEach`, `afterEach`

## Test Organization

- **Unit tests**: `tests/unit/**/*.test.ts` - test individual modules with vitest
- **Eval examples**: `examples/basic/*.eval.js` - demonstrate usage patterns
- **Test fixtures**: `tests/fixtures/` - sample datasets for testing

## Exit Codes

The CLI returns specific exit codes for CI integration:
- `0`: Success (all tests passed)
- `1`: Assertion failure (tests failed statistical thresholds)
- `2`: Integrity failure (dataset alignment issues)
- `3`: Execution error (test threw exception)
- `4`: Configuration error (invalid options)

## Field Types & Statistics

evalsense automatically determines statistics based on field values:
- **Boolean**: Binary classification (accuracy, precision, recall, F1, confusion matrix)
- **Categorical**: Multi-class classification (per-class metrics, macro/weighted averages)
- **Numeric**: Regression metrics (MAE, MSE, RMSE, R²)
- **Numeric + threshold**: Binarized classification via threshold

## Important Implementation Notes

### Dataset Alignment
- Alignment happens by matching `id` fields between actual and expected
- Missing IDs, duplicates, or field mismatches are reported as integrity violations
- `filterComplete()` can remove records with missing fields before evaluation

### Model Execution
- `runModel()`: Sequential execution, preserves order
- `runModelParallel()`: Batch execution with configurable concurrency (default: 10)
- Both validate ID matching between input record and prediction

### Context Management
- Test context is global module state (not thread-safe)
- In CLI usage, each run is a fresh Node process
- For programmatic usage, call `resetContext()` between test runs if needed
- `startTestExecution()` / `endTestExecution()` manages assertion collection

### Opinionated Metrics (v0.2.0 - LLM-Based)
- Hallucination, relevance, faithfulness, toxicity use **LLM evaluation**
- Require LLM client configuration via `setLLMClient()` before use
- Support two evaluation modes:
  - **Per-row**: One LLM call per output (higher accuracy, independent evaluations)
  - **Batch**: Single LLM call for all outputs (lower cost, potentially less accurate)
- Return `MetricOutput[]` with `{ id, metric, score, label, reasoning, evaluationMode }`
- `reasoning` field provides LLM's explanation for each evaluation
- Custom prompts can override defaults for domain-specific evaluation
- Prompts follow Ragas patterns with few-shot examples and clear JSON output specs

## Product Vision Context

From PRD and architecture docs:
- evalsense does NOT manage prompts, LLM providers, or orchestration
- It evaluates outputs from user code that may call LLMs
- Statistical rigor over test-case thinking (dataset distributions, not individual examples)
- Deterministic execution for CI/CD workflows (core framework is deterministic; LLM metrics optional)
- Metric validation: evaluate the quality of metrics themselves

## LLM Integration Architecture (v0.2.0)

### LLM Client Abstraction
- Provider-agnostic interface: `LLMClient` with `complete(prompt)` and optional `completeStructured(prompt, schema)`
- Users implement adapters for their LLM provider (OpenAI, Anthropic, Ollama, Azure, etc.)
- Global client singleton (`setLLMClient()`) with per-call override support (`llmClient` in config)
- No built-in provider adapters - users bring their own integration
- Mock client provided for testing (`createMockLLMClient()`)

### Evaluation Modes
- **Per-row mode** (default):
  - Calls LLM for each output individually
  - Higher accuracy (independent evaluations, no cross-contamination)
  - Higher cost (N API calls for N outputs)
  - Better for complex outputs and high-stakes evaluation
- **Batch mode**:
  - Single LLM call for all outputs at once
  - Lower cost (1 API call total)
  - Potentially less accurate (LLM sees all outputs together)
  - Better for cost-sensitive scenarios and simple outputs
- Configurable via `evaluationMode` parameter (default: "per-row")

### Prompt Engineering
- Prompts stored in `src/metrics/llm/prompts/` with separate per-row and batch variants
- Follow Ragas patterns: role definition, clear instructions, few-shot examples, JSON schemas
- Variable substitution: `{context}`, `{output}`, `{query}`, `{source}`, `{items}` (for batch)
- Support custom prompt overrides via `customPrompt` parameter
- Each prompt includes:
  - Task definition and role
  - Input format
  - Evaluation criteria with score ranges
  - Few-shot examples
  - JSON output specification

### Response Parsing
- Prefer structured output (`completeStructured`) when available (e.g., OpenAI JSON mode)
- Fallback to text parsing for providers without JSON mode
- Extract JSON from markdown code blocks if present
- Validate required fields in responses
- Normalize scores to 0-1 range
- Context-rich error messages for debugging

### File Organization
```
src/metrics/
├── llm/
│   ├── client.ts              # LLM client management (setLLMClient, getLLMClient, etc.)
│   ├── utils.ts               # Parsing, validation, prompt filling, error handling
│   ├── prompts/
│   │   ├── hallucination.ts   # Hallucination prompts + schemas
│   │   ├── relevance.ts       # Relevance prompts + schemas
│   │   ├── faithfulness.ts    # Faithfulness prompts + schemas
│   │   └── toxicity.ts        # Toxicity prompts + schemas
│   └── adapters/
│       └── mock.ts            # Mock client for testing
├── opinionated/
│   ├── hallucination.ts       # LLM-based hallucination detection
│   ├── relevance.ts           # LLM-based relevance assessment
│   ├── faithfulness.ts        # LLM-based faithfulness verification
│   └── toxicity.ts            # LLM-based toxicity detection
└── index.ts                   # Exports LLM utilities and metrics
```

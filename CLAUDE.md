# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

evalsense is a JavaScript-native LLM evaluation framework that brings classical ML-style statistical evaluation to LLM systems. It provides a Jest-like API for dataset-level evaluation with confusion matrices, precision/recall, and statistical assertions. The core philosophy: **metrics are predictions, not facts**.

evalsense does NOT manage prompts, LLM providers, or orchestration — it evaluates outputs from user code that may call LLMs. Statistical rigor over test-case thinking (dataset distributions, not individual examples). Core framework is deterministic; LLM metrics are optional.

## Development Commands

```bash
npm run build          # Build all packages using tsup
npm run dev            # Build in watch mode
npm test               # Run unit tests with vitest
npm run test:coverage  # Run tests with coverage (80% threshold)
npm run lint           # Lint src/ and tests/ with ESLint
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier
npm run format:check   # Check formatting without changes
npm run typecheck      # Type-check without building
```

## CLI Usage

```bash
npx evalsense --help                  # Discover all commands and flags
npx evalsense docs                    # Print full assertion API reference
npx evalsense run [path]              # Run eval files
npx evalsense run -f "accuracy"       # Filter tests by name
npx evalsense run -r json -o out.json # JSON report to file
npx evalsense run -b                  # Bail on first failure
npx evalsense run -t 60000            # Set timeout (default: 30000ms)
npx evalsense list [path]             # List discovered eval files
```

## Pre-Push

Run the full check before pushing:

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build
```

**When releasing a new version**, update the version string in all three places:

- `package.json` — `"version"` field
- `src/report/console-reporter.ts` — `EvalSense vX.Y.Z` string in `printHeader()`
- `CHANGELOG.md` — new version entry

**Security scan before pushing:**

```bash
grep -r "sk-or-v1-\|sk-ant-\|sk-proj-" examples/ src/ --exclude-dir=node_modules
```

## Architecture

### Core Execution Flow

```
.eval.js file
  ↓
describe() + evalTest() (Jest-like API)
  ↓
Load data (plain JS) → Run model (plain JS) → expectStats()
  ↓
field-level statistics (confusion matrix, precision/recall, F1)
  ↓
assertions (property + matcher pattern: .accuracy.toBeAtLeast())
  ↓
report + exit code
```

### Module Structure

- `src/core/`: Test framework (describe, evalTest, types, context management)
- `src/dataset/`: Dataset alignment and integrity checks
- `src/statistics/`: Classification metrics, confusion matrices, regression metrics, calibration
- `src/assertions/`: Statistical assertion API (expectStats, field selectors, matchers)
  - `field-selector.ts`: Main assertion chain with property/method-based metric access
  - `metric-matcher.ts`: Jest-like matchers (toBeAtLeast, toBeAbove, etc.)
  - `percentage-matcher.ts`: Distribution assertion matchers
  - `binarize.ts`: Threshold-based binarization for continuous scores
- `src/runner/`: File discovery, test execution, CLI
- `src/report/`: Console and JSON reporters
- `src/metrics/`: Metric utilities and LLM integration
  - `client.ts`: LLM client management (setLLMClient, getLLMClient)
  - `llm-utils.ts`: Parsing, validation, prompt filling, error handling
  - `create-metric.ts`: LLM metric creation utilities
  - `evaluators.ts`: Per-row and batch evaluation logic
  - `custom.ts`: Custom metric registration
  - `utils.ts`: Shared metric utilities
  - `types.ts`: LLM-related type definitions
  - `prompts/`: Evaluation prompts for each metric (per-row and batch variants)
  - `adapters/`: LLM provider adapters (mock, OpenAI, Anthropic, OpenRouter)
  - `opinionated/`: LLM-based metrics (hallucination, relevance, faithfulness, toxicity)

### Key Architectural Patterns

- **Context system**: Global test context tracks current suite and test results (`src/core/context.ts`). Not thread-safe; each CLI run is a fresh Node process. Call `resetContext()` between runs in programmatic usage.
- **Aligned records**: Core data structure pairs `actual` (model output) vs `expected` (ground truth), matched by `id` field. Missing IDs, duplicates, or field mismatches are integrity violations.
- **Field selectors**: Fluent API for field-level assertions via `expectStats().field(name)`
- **Property-based metrics**: Metrics accessed as getters (`.accuracy`, `.f1`) or methods (`.precision(class)`)
- **Matcher pattern**: Jest-like matchers (`.toBeAtLeast()`, `.toBeAbove()`, etc.)

### Package Exports

- `evalsense`: Core API (describe, evalTest, expectStats, etc.)
- `evalsense/metrics`: Metric utilities and custom metric registration
- `evalsense/metrics/opinionated`: Built-in LLM metrics (hallucination, relevance, faithfulness, toxicity)
- Binary: `evalsense` CLI via `bin/evalsense.js`

### Build

Uses `tsup`. Entry points: `index.ts`, `metrics/index.ts`, `metrics/opinionated/index.ts`, `runner/cli.ts`. Output: `dist/` in both ESM (`.js`) and CJS (`.cjs`) with `.d.ts` type definitions.

## Writing Eval Files

Eval files use `.eval.js` or `.eval.ts` extension:

```javascript
import { describe, evalTest, expectStats } from "evalsense";
import { readFileSync } from "fs";

describe("Model name", () => {
  evalTest("test name", async () => {
    // 1. Load ground truth — records MUST have `id` or `_id`
    const groundTruth = JSON.parse(readFileSync("./data.json", "utf-8"));

    // 2. Run model with plain JavaScript
    const predictions = groundTruth.map((record) => ({
      id: record.id,
      prediction: yourModel(record),
    }));

    // 3. Assert on statistics
    expectStats(predictions, groundTruth)
      .field("prediction")
      .accuracy.toBeAtLeast(0.8)
      .recall("positive")
      .toBeAtLeast(0.7)
      .precision("positive")
      .toBeAtLeast(0.7)
      .f1.toBeAtLeast(0.75)
      .displayConfusionMatrix();
  });
});
```

**Constraints:**

- Records MUST have `id` or `_id` for alignment
- Evaluation is dataset-level, not per-example
- Use lifecycle hooks: `beforeAll`, `afterAll`, `beforeEach`, `afterEach`
- For parallel execution, use `Promise.all()` with chunking

## Field Types & Statistics

evalsense automatically determines statistics from field values:

- **Boolean**: Binary classification (accuracy, precision, recall, F1, confusion matrix)
- **Categorical**: Multi-class classification (per-class metrics, macro/weighted averages)
- **Numeric**: Regression metrics (MAE, MSE, RMSE, R²)
- **Numeric + threshold**: Binarized classification via threshold

## Exit Codes

- `0`: All tests passed
- `1`: Assertion failure (statistical thresholds not met)
- `2`: Integrity failure (dataset alignment issues)
- `3`: Execution error (test threw exception)
- `4`: Configuration error

## LLM Integration

### Client Abstraction

Provider-agnostic interface: `LLMClient` with `complete(prompt)` and optional `completeStructured(prompt, schema)`. Users implement adapters for their provider. Global singleton via `setLLMClient()` with per-call override via `llmClient` config. Mock client available via `createMockLLMClient()`.

### Evaluation Modes

- **Per-row** (default): One LLM call per output. Higher accuracy, higher cost. Use for complex/high-stakes outputs.
- **Batch**: Single LLM call for all outputs. Lower cost, potentially less accurate. Use for cost-sensitive scenarios.

Configurable via `evaluationMode` parameter.

### Opinionated Metrics

Hallucination, relevance, faithfulness, toxicity use LLM evaluation. Require `setLLMClient()` before use. Return `MetricOutput[]` with `{ id, metric, score, label, reasoning, evaluationMode }`. Support custom prompts via `customPrompt` parameter. Prompts follow Ragas patterns (few-shot examples, JSON output specs) and are stored in `src/metrics/prompts/`.

Response parsing prefers `completeStructured` when available, falls back to text parsing with JSON extraction from markdown blocks.

## Test Organization

- `tests/unit/**/*.test.ts` — unit tests (vitest)
- `examples/*.eval.js` — usage examples
- `tests/fixtures/` — sample datasets

## CI/CD

- **`ci.yml`**: Runs on push to `main` and all PRs. Jobs: typecheck, lint, format, test (with coverage), build. Matrix: Node 18, 20, 22.
- **`release.yml`**: Triggered on `v*` tags. Runs CI, publishes to npm, creates GitHub Release.

## Other Files

- `skill.md` — example Claude Code skill for users to copy to `.claude/commands/llm-quality-gate.md`. Uses `npx evalsense run --help` to discover flags dynamically and `-r json -o` for machine-readable output.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` — open source governance
- `docs/archive/` — migration guides (v0.2, v0.3)
- `.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md` — GitHub templates

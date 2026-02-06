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

## Pre-Push Checklist

**CRITICAL: Before committing and pushing to GitHub, complete ALL steps in order:**

### 1. Version Number Updates

When releasing a new version, update version numbers in:

- [ ] **`package.json`** - Update `"version"` field
- [ ] **`src/report/console-reporter.ts`** - Update `EvalSense v0.X.Y` string in `printHeader()` method
- [ ] **`CHANGELOG.md`** - Add new version entry with changes
- [ ] **`README.md`** - Update version badge if showing specific version

```bash
# Example: Updating to v0.2.2
# 1. Update package.json version
# 2. Update console-reporter.ts line 48
# 3. Add CHANGELOG.md entry for [0.2.2]
# 4. Check README.md badges/examples
```

### 2. Documentation Updates

Check if documentation needs updates:

- [ ] **`README.md`** - Update if:
  - New features added (add to features list)
  - API changes (update Quick Start or examples)
  - New adapters/providers (update provider examples section)
  - Breaking changes (add warning banner)

- [ ] **`CLAUDE.md`** - Update if:
  - New architecture patterns introduced
  - Build/test commands changed
  - File structure changed significantly
  - New development workflows added

- [ ] **`docs/*.md`** - Update relevant guides if:
  - LLM metrics behavior changed (llm-metrics.md)
  - Adapter interface changed (llm-adapters.md)
  - Migration needed (migration-v0.X.md)

- [ ] **`examples/*.eval.js`** - Update if:
  - API signatures changed
  - New features to demonstrate
  - Better patterns available

### 3. Run Full Test Suite

Verify all tests pass and code quality checks succeed:

```bash
# Run all quality checks in order
npm run typecheck     # TypeScript compilation (must pass)
npm run lint          # ESLint checks (must pass)
npm run format:check  # Prettier formatting (must pass)
npm test              # Unit tests (all must pass)
npm run build         # Build verification (must succeed)
```

**Expected Results:**

- ✅ TypeScript: No errors
- ✅ ESLint: No errors or warnings
- ✅ Prettier: All files formatted
- ✅ Tests: All passing (230+ tests)
- ✅ Build: Success with no errors

### 4. Security Checks

Before pushing, scan for security issues:

- [ ] **No hardcoded API keys** - Search for `sk-`, `api_key`, credentials

  ```bash
  # Quick scan for common API key patterns
  grep -r "sk-or-v1-\|sk-ant-\|sk-proj-" examples/ src/ --exclude-dir=node_modules
  ```

- [ ] **No sensitive data** - Check for `.env` files, credentials, tokens
- [ ] **Dependencies up to date** - Run `npm audit` to check for vulnerabilities
  ```bash
  npm audit --audit-level=moderate
  ```

### 5. Build and Git Status

Final verification before commit:

```bash
# Rebuild to ensure dist/ is up to date
npm run build

# Check git status - only commit intended files
git status

# Review all changes before committing
git diff

# Stage files
git add <specific-files>  # Prefer specific files over git add -A

# Commit with meaningful message
git commit -m "type: description

- Bullet point of changes
- Another change
- Breaking changes clearly marked"
```

### 6. Push to GitHub

After all checks pass:

```bash
git push origin main
```

## Quick Pre-Push Command

Run this single command to verify everything before pushing:

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && echo "✅ All checks passed! Ready to push."
```

If any step fails, fix the issues before pushing.

## Common Pre-Push Issues

**Issue: Version mismatch**

- Check `package.json`, `console-reporter.ts`, and `CHANGELOG.md` have same version

**Issue: Tests failing**

- Run `npm test -- --reporter=verbose` to see detailed error
- Fix failing tests before pushing

**Issue: TypeScript errors**

- Run `npm run typecheck` to see all type errors
- Fix type issues in source files

**Issue: Formatting errors**

- Run `npm run format` to auto-fix formatting
- Then verify with `npm run format:check`

**Issue: Build failures**

- Check `tsup.config.ts` for build configuration
- Ensure all imports are correct
- Verify no circular dependencies

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
      prediction: yourModel(record),
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

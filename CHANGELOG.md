# Changelog

All notable changes to evalsense will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.2] - 2026-02-06

### ✨ Improved

- **Enhanced Assertion Reporting**
  - All assertions (passed and failed) now display expected vs actual values for full transparency
  - Assertions now evaluate completely instead of short-circuiting on first failure
  - Users see all assertion results in a single run, making debugging more efficient
  - Multiple assertion failures are reported together with clear summary

### 🔄 Changed

- **Assertion Execution Behavior**
  - Chained assertions (`toHaveAccuracyAbove().toHaveF1Above()`) now evaluate all assertions before failing
  - Previously: first failure would stop evaluation immediately (Jest-style short-circuit)
  - Now: all assertions are evaluated and all results are displayed
  - Better for statistical evaluation where seeing multiple metrics together provides more context

## [0.3.1] - 2026-02-06

### 🐛 Fixed

- **Alignment Build Issue**: Fixed runtime alignment bug where dist/ was out of sync with source changes
  - ID matching now works correctly after rebuild
  - Resolved issue where aligned records had empty expected values despite matching IDs
  - Ensures `npm run build` properly syncs all alignment logic changes to dist/

## [0.3.0] - 2026-02-06

### ✨ Added

- **Regression Assertions**
  - `toHaveMAEBelow(threshold)`: Assert Mean Absolute Error below threshold
  - `toHaveRMSEBelow(threshold)`: Assert Root Mean Squared Error below threshold
  - `toHaveR2Above(threshold)`: Assert R² (coefficient of determination) above threshold
  - Use cases: rating predictions, price forecasting, numeric score evaluation, LLM judge calibration

- **Flexible ID Matching**
  - `expectStats(predictions, groundTruth, { idField: 'uuid' })`: Custom ID field for alignment
  - Support for non-standard ID fields (MongoDB `_id`, UUIDs, custom identifiers)
  - `strict` mode option for throwing on missing IDs
  - Backwards compatible - defaults to `id` field

- **Comprehensive Test Coverage**
  - Added 100+ new tests (total: 330+ tests)
  - New test suites:
    - `tests/unit/statistics/regression.test.ts` (26 tests)
    - `tests/unit/assertions/regression-assertions.test.ts` (18 tests)
    - `tests/unit/runner/executor.test.ts` (29 tests)
    - `tests/unit/runner/discovery.test.ts` (23 tests)

- **Consolidated Examples (8 → 4 Use Case Patterns)**
  - `examples/uc1-distribution.eval.js`: Distribution monitoring without ground truth
  - `examples/uc2-llm-judge-distribution.eval.js`: LLM judge evaluation (per-row vs batch modes)
  - `examples/uc3-classification.eval.js`: Classification & regression with ground truth
  - `examples/uc4-judge-validation.eval.js`: Judge validation against human labels

- **New Documentation**
  - [Use Case Patterns Guide](./docs/use-case-patterns.md): Complete guide to 4 core evaluation patterns
  - [Regression Metrics Guide](./docs/regression-metrics.md): Detailed regression evaluation documentation
  - [Migration Guide v0.2.1](./docs/migration-v0.2.1.md): Migration guide for v0.2.0 → v0.2.1

### 🔄 Changed

- **Examples Reorganization**
  - Removed 8 example files, replaced with 4 focused use case patterns
  - Each pattern demonstrates a specific evaluation approach
  - Clearer mapping between use cases and assertions

- **Documentation Updates**
  - Updated [Agent Judges Guide](./docs/agent-judges.md) with new example references
  - Updated [LLM Metrics Guide](./docs/llm-metrics.md) with UC2 and UC4 references

### 📚 API Additions

```typescript
// Regression assertions
FieldSelector.toHaveMAEBelow(threshold: number): this
FieldSelector.toHaveRMSEBelow(threshold: number): this
FieldSelector.toHaveR2Above(threshold: number): this

// Flexible ID matching
interface ExpectStatsOptions {
  idField?: string;   // Custom ID field (default: "id")
  strict?: boolean;   // Throw on missing IDs
}

function expectStats(
  actual: Prediction[],
  expected: Array<Record<string, unknown>>,
  options?: ExpectStatsOptions
): ExpectStats;
```

### 🐛 Fixed

- Improved numeric value filtering in regression metrics
- Better error messages for regression assertions
- Enhanced ID field alignment validation

### 📦 No Breaking Changes

All changes are backwards compatible with v0.2.0. Existing code will continue to work without modifications.

### Migration

See [Migration Guide v0.3.0](./docs/migration-v0.3.0.md) for upgrade instructions and new feature examples.

**Quick Examples:**

```javascript
// NEW: Regression assertions
expectStats(predictions, groundTruth)
  .field("rating")
  .toHaveMAEBelow(0.5)
  .toHaveRMSEBelow(0.7)
  .toHaveR2Above(0.75);

// NEW: Custom ID field
expectStats(predictions, groundTruth, { idField: "uuid" }).field("score").toHaveAccuracyAbove(0.9);
```

### 📊 Test Coverage

- **Total tests**: 330+ (up from ~230)
- **New test files**: 4 comprehensive test suites
- **Coverage**: Regression statistics, assertions, runner execution, file discovery

### Changed

- **License**: Changed from MIT to Apache License 2.0

## [0.2.0] - 2026-02-05

### 🚨 BREAKING CHANGES

- **Opinionated metrics now require LLM client configuration**
  - All opinionated metrics (hallucination, relevance, faithfulness, toxicity) are now LLM-based
  - Must call `setLLMClient()` before using metrics, or pass `llmClient` in config
  - Previous heuristic implementations have been completely removed
  - See [Migration Guide](./docs/migration-v0.2.md) for upgrade instructions

- **Removed exports:**
  - `toxicityDetailed()` function - use `toxicity()` instead
  - `ToxicityCategories` constant - categories now in LLM reasoning
  - `DetailedToxicityResult` type - replaced by standard `MetricOutput` with reasoning

### ✨ Added

- **LLM-Based Metrics**
  - Provider-agnostic LLM client interface (`LLMClient`)
  - Global client management (`setLLMClient()`, `getLLMClient()`, `resetLLMClient()`)
  - Support for structured JSON output via `completeStructured()` (optional)

- **Dual Evaluation Modes**
  - **Per-row mode**: Evaluate each output independently (default)
    - Higher accuracy with independent evaluations
    - N API calls for N outputs
    - Best for production monitoring and complex outputs
  - **Batch mode**: Evaluate all outputs in single call
    - Lower cost with single API call
    - Potentially less accurate (LLM sees all outputs)
    - Best for development and cost-sensitive scenarios

- **Enhanced Metric Outputs**
  - `reasoning` field: LLM's explanation for each evaluation
  - `evaluationMode` field: Tracks which mode was used ("per-row" | "batch")
  - Explainable results for debugging and transparency

- **Custom Prompts**
  - Override default prompts for domain-specific evaluation
  - Variable substitution: `{context}`, `{output}`, `{query}`, `{source}`
  - Support for specialized prompts (medical, legal, customer service, etc.)

- **Comprehensive Prompts**
  - Ragas-style prompts with few-shot examples
  - Clear scoring criteria and JSON output specifications
  - Separate prompts for per-row and batch modes
  - Built-in prompts for all 4 metrics

- **Testing Utilities**
  - `createMockLLMClient()`: Mock client for testing without API calls
  - `createSequentialMockClient()`: Sequential responses for multi-call tests
  - `createErrorMockClient()`: Error scenario testing
  - `createSpyMockClient()`: Prompt inspection for debugging

- **LLM Utilities**
  - `fillPrompt()`: Template variable replacement
  - `parseJSONResponse()`: Robust JSON parsing with markdown support
  - `validateResponse()`: Response field validation
  - `normalizeScore()`: Score normalization to 0-1 range
  - `createJSONSchema()`: JSON schema builder
  - `withTimeout()`: Promise timeout wrapper
  - `createLLMError()`: Consistent error formatting

- **Extended MetricConfig**
  - `llmClient?: LLMClient` - Override global client
  - `evaluationMode?: "per-row" | "batch"` - Choose evaluation mode
  - `customPrompt?: string` - Custom prompt template
  - `temperature?: number` - LLM temperature setting
  - `maxTokens?: number` - Max tokens per completion
  - `timeout?: number` - Request timeout in milliseconds

- **Documentation**
  - [LLM Metrics Guide](./docs/llm-metrics.md) - Complete usage guide
  - [LLM Adapters Guide](./docs/llm-adapters.md) - Provider adapter implementations
    - OpenAI example (GPT-3.5, GPT-4)
    - Anthropic example (Claude models)
    - Ollama example (local models)
    - Azure OpenAI example
    - Google Gemini example
    - Advanced patterns: caching, rate limiting, retries, cost tracking
  - [Migration Guide](./docs/migration-v0.2.md) - v0.1.x to v0.2.0 upgrade path

- **Examples**
  - `examples/llm-metrics-basic.eval.js` - Getting started with LLM metrics
  - `examples/llm-metrics-modes.eval.js` - Per-row vs batch comparison
  - `examples/llm-custom-prompt.eval.js` - Custom prompt patterns

### 🔄 Changed

- **Hallucination Metric**
  - Now uses LLM semantic understanding instead of pattern matching
  - Returns reasoning for detected hallucinations
  - Supports context-aware evaluation
  - Configuration: `hallucination({ outputs, context, evaluationMode?, customPrompt? })`

- **Relevance Metric**
  - Now uses LLM query-response alignment instead of keyword overlap
  - Returns detailed relevance assessment
  - Identifies relevant and irrelevant parts
  - Configuration: `relevance({ outputs, query, evaluationMode?, customPrompt? })`

- **Faithfulness Metric**
  - Now uses LLM fact verification instead of n-gram similarity
  - Detects contradictions and misrepresentations
  - Returns faithful and unfaithful statements
  - Configuration: `faithfulness({ outputs, source, evaluationMode?, customPrompt? })`

- **Toxicity Metric**
  - Now uses LLM content moderation instead of regex patterns
  - Provides nuanced severity levels (none/mild/moderate/severe)
  - Identifies specific toxicity categories
  - Configuration: `toxicity({ outputs, evaluationMode?, customPrompt? })`

- **Label Assignment**
  - Hallucination: "true" (score >= 0.5) or "false" (score < 0.5)
  - Relevance: "high" (>= 0.7), "medium" (>= 0.4), or "low" (< 0.4)
  - Faithfulness: "high" (>= 0.7), "medium" (>= 0.4), or "low" (< 0.4)
  - Toxicity: "none", "mild", "moderate", or "severe" (from LLM)

### 🐛 Fixed

- Improved error messages with context-rich information
- Better handling of edge cases in metric evaluation
- More robust JSON parsing with fallback strategies

### 📚 Internal

- Complete rewrite of opinionated metrics module
- New directory structure: `src/metrics/llm/`
- Prompt templates separated from implementation
- Enhanced type definitions for LLM integration
- Comprehensive test coverage for LLM infrastructure (57 new tests)
- All existing tests still passing (230 total tests)

### 📦 Dependencies

No new production dependencies. LLM provider SDKs are bring-your-own:

- OpenAI SDK: `npm install openai` (optional)
- Anthropic SDK: `npm install @anthropic-ai/sdk` (optional)
- Or use any HTTP client for custom providers

### Migration

See [Migration Guide](./docs/migration-v0.2.md) for detailed upgrade instructions.

**Quick Start:**

```javascript
// v0.1.x (heuristic - worked immediately)
import { hallucination } from "evalsense/metrics/opinionated";
const results = await hallucination({ outputs, context });

// v0.2.0 (LLM-based - requires setup)
import { setLLMClient, hallucination } from "evalsense/metrics";

setLLMClient({
  async complete(prompt) {
    return await yourLLM.generate(prompt);
  },
});

const results = await hallucination({ outputs, context });
console.log(results[0].reasoning); // NEW: LLM explanation
```

### 🔮 Future

- [ ] Support for streaming LLM responses
- [ ] Built-in result caching
- [ ] Metric calibration utilities
- [ ] Prompt optimization tools
- [ ] More metric types (consistency, coherence, etc.)

---

## [0.1.0] - 2024-XX-XX

### Added

- Initial release
- Jest-like evaluation API (`describe`, `evalTest`)
- Dataset loading and model execution
- Statistical assertions (`expectStats`)
- Classification metrics (accuracy, precision, recall, F1, confusion matrix)
- Regression metrics (MAE, MSE, RMSE, R²)
- Heuristic opinionated metrics (hallucination, relevance, faithfulness, toxicity)
- CLI tool for running evaluations
- Console and JSON reporters
- CI/CD integration with exit codes
- TypeScript support
- Full documentation and examples

[0.2.0]: https://github.com/yourusername/evalsense/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/yourusername/evalsense/releases/tag/v0.1.0

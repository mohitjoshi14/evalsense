# Agent Judges: Design Patterns for LLM Output Validation

## Overview

This document outlines design patterns for evaluating agent-based LLM systems using evalsense. Agent systems involve LLMs that use tools, follow policies, make decisions, and interact with external systems. Validating these behaviors requires specialized evaluation approaches that go beyond simple input-output testing.

This document focuses on **judge validation patterns** - how to evaluate the judges themselves that monitor agent behavior.

## Core Evaluation Patterns

### Pattern 1: Distribution Control

Monitor output distributions without ground truth. Use percentage-based assertions to ensure outputs stay within expected ranges.

```javascript
expectStats(predictions).field("confidence").toHavePercentageAbove(0.7, 0.8); // 80% of outputs have high confidence
```

**Use case**: Schema validation, confidence monitoring, output range checks.

### Pattern 1b: Judge Validation

Validate judge outputs against human-labeled ground truth using classification metrics.

```javascript
expectStats(judgeOutputs, humanLabels)
  .field("hallucinated")
  .toHaveRecallAbove(true, 0.95) // Don't miss hallucinations
  .toHavePrecisionAbove(true, 0.8); // Some false positives OK
```

**Use case**: Evaluating LLM-as-judge, heuristic metrics, automated detection systems.

## Common Agent Judge Types

### 1. Tool Schema Validity Judge

**Purpose**: Validate that tool calls match expected schemas and parameter types.

**Pattern**: Distribution check (Pattern 1) - no ground truth needed.

**Metrics**:

- Percentage of valid tool calls
- Percentage of schema violations by severity

**Example**:

```javascript
// Check that 95% of tool calls have valid schemas
expectStats(agentOutputs).field("schemaValid").toHavePercentageAbove(true, 0.95);

// Check that <5% have critical schema errors
expectStats(agentOutputs).field("schemaSeverity").toHavePercentageBelow("critical", 0.05);
```

**Implementation Recommendations**:

- Use JSON schema validation libraries
- Categorize errors by severity (critical, warning, info)
- Log specific validation failures for debugging
- Consider schema evolution over time

### 2. Tool Selection Judge

**Purpose**: Validate that the agent selects the correct tool for a given query or context.

**Pattern**: Classification with ground truth (Pattern 1b).

**Metrics**:

- Overall accuracy
- Per-tool precision and recall
- Confusion matrix to identify tool confusion patterns

**Example**:

```javascript
const judgeOutputs = dataset.map((item) => ({
  id: item.id,
  selectedTool: agent.selectTool(item.query),
}));

const groundTruth = dataset.map((item) => ({
  id: item.id,
  selectedTool: item.expectedTool,
}));

expectStats(judgeOutputs, groundTruth)
  .field("selectedTool")
  .toHaveAccuracyAbove(0.85)
  .toHavePrecisionAbove("critical_tool", 0.9) // High precision for critical tools
  .toHaveConfusionMatrix(); // Identify which tools are confused
```

**Implementation Recommendations**:

- Balance precision and recall based on tool criticality
- Critical tools (e.g., financial transactions) need higher precision
- Common tools can tolerate more errors
- Use confusion matrix to identify systematic selection errors
- Consider tool availability and context

**Design Patterns**:

- **Balanced Selection**: F1 optimization for general tool selection
- **High-Precision Tools**: Prioritize precision for irreversible actions
- **High-Recall Tools**: Prioritize recall for safety-critical tools

### 3. Refusal Detection Judge

**Purpose**: Validate that the agent appropriately refuses harmful, policy-violating, or out-of-scope requests.

**Pattern**: Binary classification with ground truth (Pattern 1b), **prioritizing recall**.

**Metrics**:

- Recall for refusal class (critical - must catch all harmful requests)
- Precision for refusal class (false positives less critical)
- False negative rate (missed harmful requests)

**Example**:

```javascript
const judgeOutputs = dataset.map((item) => ({
  id: item.id,
  shouldRefuse: agent.detectRefusal(item.request),
}));

const humanLabels = dataset.map((item) => ({
  id: item.id,
  shouldRefuse: item.isHarmful,
}));

// Prioritize recall - never miss harmful requests
expectStats(judgeOutputs, humanLabels)
  .field("shouldRefuse")
  .toHaveRecallAbove(true, 0.98) // Very high recall
  .toHavePrecisionAbove(true, 0.7); // Lower precision OK
```

**Implementation Recommendations**:

- **Always prioritize recall over precision**
- False positives (over-cautious refusals) are acceptable
- False negatives (missed harmful content) are critical failures
- Set recall threshold >95% for safety-critical systems
- Monitor false positive rate to avoid excessive refusals
- Consider layered refusal (heuristic + LLM judge)

**Design Pattern: High-Stakes Refusal**

```javascript
// Tier 1: Heuristic judge (fast, high recall, low precision)
// Tier 2: LLM judge on flagged items (high precision)
// Both tiers evaluated against human labels
```

### 4. Policy Compliance Judge

**Purpose**: Validate that agent actions comply with organizational policies, legal requirements, or ethical guidelines.

**Pattern**: Multi-class or binary classification (Pattern 1b), with recall prioritization for major violations.

**Metrics**:

- Overall accuracy
- Recall per violation class (especially for major violations)
- Precision per violation class
- Confusion between violation types

**Example**:

```javascript
const judgeOutputs = dataset.map((item) => ({
  id: item.id,
  violationType: agent.detectPolicyViolation(item.action),
}));

const groundTruth = dataset.map((item) => ({
  id: item.id,
  violationType: item.expectedViolation, // "none", "minor", "major"
}));

// Never miss major violations
expectStats(judgeOutputs, groundTruth)
  .field("violationType")
  .toHaveRecallAbove("major", 0.98) // Critical: catch all major violations
  .toHaveRecallAbove("minor", 0.85) // Important: catch most minor violations
  .toHavePrecisionAbove("major", 0.8) // Some false positives OK
  .toHaveConfusionMatrix();
```

**Implementation Recommendations**:

- Categorize violations by severity (major, minor, info)
- Prioritize recall for major violations (>95%)
- Balance recall/precision for minor violations
- Use confusion matrix to identify common misclassifications
- Consider hierarchical policies (parent policy → sub-policies)
- Implement escalation for uncertain cases

**Design Patterns**:

- **Severity-Based Recall**: Higher recall for more severe violations
- **Hierarchical Validation**: General policy check → specific policy checks
- **Human-in-the-Loop**: Route uncertain cases to human reviewers

## Cross-Cutting Patterns

### Calibration and Confidence

For judges that output confidence scores, validate calibration:

```javascript
// Pattern 1: Monitor confidence distribution
expectStats(judgeOutputs).field("confidence").toHavePercentageAbove(0.8, 0.7); // 70% high confidence

// Pattern 1b: Validate high-confidence predictions are accurate
const highConfidencePredictions = judgeOutputs.filter((p) => p.confidence > 0.8);
expectStats(highConfidencePredictions, groundTruth).field("label").toHaveAccuracyAbove(0.95); // High confidence should be accurate
```

### Multi-Label Judges

For agents that can flag multiple issues simultaneously:

```javascript
// Validate each label independently
expectStats(judgeOutputs, humanLabels).field("hasHallucination").toHaveRecallAbove(true, 0.9);

expectStats(judgeOutputs, humanLabels).field("hasBias").toHaveRecallAbove(true, 0.85);

expectStats(judgeOutputs, humanLabels).field("hasToxicity").toHaveRecallAbove(true, 0.95); // Highest priority
```

### Temporal Patterns

For agents that maintain state or context across turns:

```javascript
// Validate consistency over conversation turns
expectStats(agentOutputs).field("memoryConsistent").toHavePercentageAbove(true, 0.95);

// Validate context window handling
expectStats(agentOutputs).field("contextOverflow").toHavePercentageBelow(true, 0.05);
```

## Judge Function Structure

### Recommended Structure

```javascript
/**
 * Judge function template
 * @param input - Input to evaluate
 * @param options - Judge configuration
 * @returns Structured output with id, score, label
 */
function myJudge(input, options = {}) {
  return {
    id: input.id,

    // Binary classification
    label: detectLabel(input),

    // Optional: confidence score
    confidence: computeConfidence(input),

    // Optional: severity/priority
    severity: computeSeverity(input),

    // Optional: explanation
    reason: generateExplanation(input),
  };
}
```

### Ground Truth Construction

**For binary judges (refusal, hallucination, policy compliance)**:

- Collect diverse test cases covering edge cases
- Use multiple human annotators for contentious cases
- Measure inter-annotator agreement (Cohen's kappa)
- Include borderline cases to test judge robustness
- Balance classes (if possible) or use stratified sampling

**For multi-class judges (tool selection, violation type)**:

- Ensure balanced representation of all classes
- Include ambiguous cases that test decision boundaries
- Document annotation guidelines clearly
- Track annotation confidence for uncertain cases

## Metric Selection Guidelines

### When to Use Accuracy

- Balanced classes
- All errors are equally costly
- General tool selection with symmetric error costs

### When to Use Recall

- Imbalanced classes (especially rare positive class)
- False negatives are very costly
- Safety-critical detection (refusal, policy violations)
- Example: Refusal detection (must catch all harmful requests)

### When to Use Precision

- False positives are very costly
- Conservative decision-making needed
- Resource-constrained validation
- Example: High-precision tool selection (avoid wrong tool calls)

### When to Use F1

- Balanced trade-off between precision and recall
- Classes moderately imbalanced
- General classification tasks
- Example: Balanced tool selection

### When to Use Confusion Matrix

- Understanding error patterns
- Multi-class classification
- Debugging systematic misclassifications
- Example: Which tools are confused with each other

## Future Extensions

### Not Yet Implemented

These patterns are documented for future implementation:

1. **Confidence Calibration Metrics**
   - Expected calibration error (ECE)
   - Reliability diagrams
   - Brier score decomposition

2. **Multi-Label Evaluation**
   - Label-wise metrics
   - Hamming loss
   - Exact match ratio

3. **Temporal Evaluation**
   - Consistency across turns
   - Memory validation
   - Context window tracking

4. **Agent Traces**
   - Tool call sequence validation
   - Reasoning chain evaluation
   - Multi-step task completion

## References

- [evalsense README](../README.md) - Core library documentation
- [Distribution Assertions Example](../examples/distribution-assertions.eval.js) - Pattern 1 examples
- [Judge Validation Example](../examples/judge-validation.eval.js) - Pattern 1b examples

## Contributing

To propose new judge patterns or evaluation approaches:

1. Document the judge type and use case
2. Specify the evaluation pattern (1 or 1b)
3. Provide metric recommendations
4. Include implementation examples
5. Note any special considerations

Agent evaluation is an evolving field. These patterns will grow as new agent architectures and evaluation needs emerge.

/**
 * Custom Prompt Example
 *
 * This example demonstrates:
 * - Overriding default prompts with custom ones
 * - Domain-specific evaluation criteria
 * - Specialized prompt engineering
 *
 * Run with: npx evalsense run examples/llm-custom-prompt.eval.js
 */

import { describe, evalTest } from "evalsense";
import {
  setLLMClient,
  createMockLLMClient,
  // Uncomment to use real LLM providers
  // createOpenAIAdapter,
  // createAnthropicAdapter,
  // createOpenRouterAdapter,
} from "evalsense/metrics";
import { hallucination, toxicity } from "evalsense/metrics/opinionated";

// OPTION: Use real LLM provider (recommended for custom prompts)
// const llmClient = createOpenAIAdapter(process.env.OPENAI_API_KEY, {
//   model: "gpt-4-turbo-preview",
// });
// const llmClient = createAnthropicAdapter(process.env.ANTHROPIC_API_KEY, {
//   model: "claude-3-5-sonnet-20241022",
// });

// OPTION: Use mock client (for demo)
const llmClient = createMockLLMClient({
  response: {
    score: 0.2,
    hallucinated_claims: [],
    categories: [],
    severity: "none",
    reasoning: "Response follows custom evaluation criteria.",
  },
});

setLLMClient(llmClient);

describe("Custom Prompts - Basic Usage", () => {
  evalTest("custom hallucination prompt for medical domain", async () => {
    // Custom prompt emphasizing medical accuracy
    const medicalHallucinationPrompt = `You are a medical fact-checker evaluating AI-generated health information.

CRITICAL: Medical hallucinations can be harmful. Be extra strict.

CONTEXT (verified medical information):
{context}

AI OUTPUT TO EVALUATE:
{output}

INSTRUCTIONS:
1. Check if ALL medical claims in the output are supported by the context
2. Flag any dosages, symptoms, or treatments not in the context
3. Be especially strict with numerical values and medical terminology
4. Return score:
   - 0.0 = Perfectly accurate
   - 0.3 = Minor imprecision
   - 0.5 = Missing citations
   - 1.0 = Dangerous misinformation

Return JSON: {"score": <0-1>, "hallucinated_claims": [...], "reasoning": "..."}`;

    const outputs = [
      {
        id: "1",
        output: "Aspirin is typically prescribed at 81mg daily for heart health.",
      },
    ];

    const context = [
      "Low-dose aspirin (81mg daily) is commonly used for cardiovascular protection.",
    ];

    const results = await hallucination({
      outputs,
      context,
      customPrompt: medicalHallucinationPrompt,
    });

    console.log("\n=== Medical Domain Evaluation ===");
    console.log("Custom Prompt: Strict medical fact-checking");
    console.log(`Score: ${results[0].score.toFixed(2)}`);
    console.log(`Reasoning: ${results[0].reasoning}`);
  });

  evalTest("custom toxicity prompt for customer service", async () => {
    // Custom prompt for customer service context
    const customerServiceToxicityPrompt = `You are evaluating customer service responses for professionalism.

OUTPUT TO EVALUATE:
{output}

CUSTOMER SERVICE STANDARDS:
- Must be polite and respectful
- Must avoid dismissive language
- Must not blame the customer
- Must show empathy

Score based on:
- 0.0 = Perfectly professional
- 0.3 = Slightly curt but acceptable
- 0.6 = Unprofessional or dismissive
- 1.0 = Hostile or offensive

Return JSON: {"score": <0-1>, "categories": [...], "severity": "<none|mild|moderate|severe>", "reasoning": "..."}`;

    const outputs = [
      {
        id: "1",
        output: "I understand your frustration. Let me help you resolve this issue right away.",
      },
      {
        id: "2",
        output: "This is your fault for not reading the manual. We can't help with user error.",
      },
    ];

    const results = await toxicity({
      outputs,
      customPrompt: customerServiceToxicityPrompt,
    });

    console.log("\n=== Customer Service Evaluation ===");
    console.log("Custom Prompt: Professional communication standards\n");
    results.forEach((result) => {
      console.log(`Response ${result.id}:`);
      console.log(`  Score: ${result.score.toFixed(2)}`);
      console.log(`  Severity: ${result.label}`);
      console.log(`  Reasoning: ${result.reasoning}`);
      console.log("");
    });
  });
});

describe("Custom Prompts - Advanced Patterns", () => {
  evalTest("domain-specific terminology", async () => {
    // Custom prompt with legal terminology
    const legalFactCheckPrompt = `You are a legal document fact-checker.

IMPORTANT: Legal precision is critical. Check:
- Statutes and case citations must be exact
- Legal terms must be used correctly
- Dates and jurisdiction must match

SOURCE LEGAL DOCUMENT:
{context}

AI SUMMARY:
{output}

Evaluate accuracy of legal claims. Return JSON with score 0-1.
Return: {"score": <0-1>, "hallucinated_claims": [...], "reasoning": "..."}`;

    console.log("\n=== Domain-Specific Terminology ===");
    console.log("Example: Legal document verification");
    console.log("Custom prompt enforces:");
    console.log("- Exact statute citations");
    console.log("- Correct legal terminology");
    console.log("- Precise dates and jurisdictions");
  });

  evalTest("multi-language prompts", async () => {
    // Custom prompt in different language
    const spanishHallucinationPrompt = `Eres un evaluador experto verificando información.

CONTEXTO:
{context}

RESPUESTA A EVALUAR:
{output}

Verifica si la respuesta contiene información no soportada por el contexto.
Devuelve JSON: {"score": <0-1>, "hallucinated_claims": [...], "reasoning": "..."}`;

    console.log("\n=== Multi-Language Support ===");
    console.log("Custom prompts can be written in any language");
    console.log("Example: Spanish prompt for evaluating Spanish content");
  });

  evalTest("output format customization", async () => {
    // Custom prompt requesting specific output format
    const detailedOutputPrompt = `Evaluate hallucinations in the output.

CONTEXT: {context}
OUTPUT: {output}

Provide detailed analysis with:
1. Overall score (0-1)
2. List of specific hallucinated claims
3. List of accurate claims
4. Confidence level (0-1)
5. Suggested corrections
6. Detailed reasoning

Return JSON:
{
  "score": <0-1>,
  "hallucinated_claims": [...],
  "accurate_claims": [...],
  "confidence": <0-1>,
  "corrections": [...],
  "reasoning": "..."
}`;

    console.log("\n=== Custom Output Format ===");
    console.log("You can request additional fields:");
    console.log("- accurate_claims (not just hallucinated)");
    console.log("- confidence levels");
    console.log("- suggested corrections");
    console.log("- extended reasoning");
    console.log("\nNote: Parse these from result.reasoning or custom fields");
  });
});

describe("Prompt Engineering Best Practices", () => {
  evalTest("best practices guide", async () => {
    console.log("\n=== CUSTOM PROMPT BEST PRACTICES ===\n");

    console.log("1. BE SPECIFIC:");
    console.log("   ✓ Define exact criteria for scoring");
    console.log("   ✓ Provide concrete examples");
    console.log("   ✓ Specify domain-specific requirements");

    console.log("\n2. USE CLEAR STRUCTURE:");
    console.log("   ✓ Separate sections (CONTEXT, OUTPUT, INSTRUCTIONS)");
    console.log("   ✓ Use consistent formatting");
    console.log("   ✓ Number steps in instructions");

    console.log("\n3. DEFINE SCORE RANGES:");
    console.log("   ✓ Explain what each score range means");
    console.log("   ✓ Provide anchors (0.0 = perfect, 1.0 = severe)");
    console.log("   ✓ Include examples for calibration");

    console.log("\n4. REQUEST CONSISTENT FORMAT:");
    console.log("   ✓ Always ask for JSON output");
    console.log("   ✓ Specify required fields (score, reasoning)");
    console.log("   ✓ Include example JSON structure");

    console.log("\n5. TEST AND ITERATE:");
    console.log("   ✓ Test prompts with diverse inputs");
    console.log("   ✓ Monitor response consistency");
    console.log("   ✓ Refine based on results");

    console.log("\n6. VARIABLE SUBSTITUTION:");
    console.log("   Available variables:");
    console.log("   - Hallucination: {context}, {output}");
    console.log("   - Relevance: {query}, {output}");
    console.log("   - Faithfulness: {source}, {output}");
    console.log("   - Toxicity: {output}");
  });
});

describe("Prompt Template Examples", () => {
  evalTest("template examples", async () => {
    console.log("\n=== PROMPT TEMPLATES ===\n");

    console.log("Simple Template:");
    console.log(`
Evaluate {metric} in this output.

OUTPUT: {output}
CONTEXT: {context}

Score 0-1 and explain.
Return JSON: {"score": <0-1>, "reasoning": "..."}
`);

    console.log("\nDetailed Template:");
    console.log(`
You are an expert {domain} evaluator.

TASK: Assess {metric} using these criteria:
{criteria}

INPUT:
{context/query/source}

OUTPUT TO EVALUATE:
{output}

SCORING GUIDE:
- 0.0-0.3: {low_description}
- 0.4-0.6: {medium_description}
- 0.7-1.0: {high_description}

EXAMPLES:
{few_shot_examples}

Return JSON: {
  "score": <0-1>,
  "specific_findings": [...],
  "reasoning": "..."
}
`);
  });
});

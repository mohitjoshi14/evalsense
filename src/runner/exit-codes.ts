/**
 * Exit codes for CI integration
 */

export { ExitCodes } from "../core/types.js";

/**
 * Exit code descriptions for documentation
 */
export const ExitCodeDescriptions: Record<number, string> = {
  0: "All tests passed",
  1: "Assertion failures (threshold violations)",
  2: "Dataset integrity failures",
  3: "Execution errors (runtime exceptions)",
  4: "Configuration errors (invalid options, missing files)",
};

/**
 * Gets a human-readable description for an exit code
 */
export function getExitCodeDescription(code: number): string {
  return ExitCodeDescriptions[code] ?? `Unknown exit code: ${code}`;
}

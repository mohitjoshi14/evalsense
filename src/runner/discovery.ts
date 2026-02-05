/**
 * Test file discovery - finds *.eval.js files
 */

import { glob } from "glob";
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";

/**
 * Default patterns for eval files
 */
export const DEFAULT_PATTERNS = [
  "**/*.eval.js",
  "**/*.eval.ts",
  "**/*.eval.mjs",
];

/**
 * Patterns to ignore
 */
export const DEFAULT_IGNORE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.git/**",
];

/**
 * Options for file discovery
 */
export interface DiscoveryOptions {
  /** Patterns to match (default: *.eval.{js,ts,mjs}) */
  patterns?: string[];
  /** Patterns to ignore */
  ignore?: string[];
  /** Base directory to search from */
  cwd?: string;
  /** Filter pattern for test names */
  filter?: string;
}

/**
 * Discovers eval files matching the patterns
 *
 * @param options - Discovery options
 * @returns Array of absolute file paths
 */
export async function discoverEvalFiles(
  options: DiscoveryOptions = {}
): Promise<string[]> {
  const {
    patterns = DEFAULT_PATTERNS,
    ignore = DEFAULT_IGNORE,
    cwd = process.cwd(),
  } = options;

  const files: string[] = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd,
      ignore,
      absolute: true,
      nodir: true,
    });
    files.push(...matches);
  }

  // Remove duplicates and sort
  const unique = [...new Set(files)].sort();

  return unique;
}

/**
 * Discovers eval files from a specific path (file or directory)
 */
export async function discoverFromPath(
  path: string,
  options: DiscoveryOptions = {}
): Promise<string[]> {
  const absolutePath = resolve(process.cwd(), path);

  if (!existsSync(absolutePath)) {
    throw new Error(`Path does not exist: ${path}`);
  }

  // Check if it's a file
  const { statSync } = await import("node:fs");
  const stat = statSync(absolutePath);

  if (stat.isFile()) {
    // Single file
    return [absolutePath];
  }

  // Directory - discover within it
  return discoverEvalFiles({
    ...options,
    cwd: absolutePath,
  });
}

/**
 * Filters file paths by a pattern
 */
export function filterFiles(files: string[], filter?: string): string[] {
  if (!filter) {
    return files;
  }

  const filterLower = filter.toLowerCase();
  return files.filter((file) => file.toLowerCase().includes(filterLower));
}

/**
 * Groups files by their directory
 */
export function groupByDirectory(files: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const file of files) {
    const dir = dirname(file);
    const existing = groups.get(dir) ?? [];
    existing.push(file);
    groups.set(dir, existing);
  }

  return groups;
}

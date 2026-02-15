import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  discoverEvalFiles,
  discoverFromPath,
  filterFiles,
  groupByDirectory,
  DEFAULT_PATTERNS,
  DEFAULT_IGNORE,
} from "../../../src/runner/discovery.js";

// Use OS temp directory for portability
const TEST_DIR = join(mkdtempSync(join(tmpdir(), "evalsense-test-")), "discovery-test");

describe("Discovery Module", () => {
  beforeEach(() => {
    // Clean up and create test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe("DEFAULT_PATTERNS", () => {
    it("includes standard eval file patterns", () => {
      expect(DEFAULT_PATTERNS).toContain("**/*.eval.js");
      expect(DEFAULT_PATTERNS).toContain("**/*.eval.ts");
      expect(DEFAULT_PATTERNS).toContain("**/*.eval.mjs");
    });
  });

  describe("DEFAULT_IGNORE", () => {
    it("ignores common directories", () => {
      expect(DEFAULT_IGNORE).toContain("**/node_modules/**");
      expect(DEFAULT_IGNORE).toContain("**/dist/**");
      expect(DEFAULT_IGNORE).toContain("**/build/**");
      expect(DEFAULT_IGNORE).toContain("**/.git/**");
    });
  });

  describe("discoverEvalFiles", () => {
    it("discovers .eval.js files", async () => {
      // Create test files
      writeFileSync(join(TEST_DIR, "test.eval.js"), "// test");
      writeFileSync(join(TEST_DIR, "other.js"), "// not eval");

      const files = await discoverEvalFiles({ cwd: TEST_DIR });

      expect(files).toHaveLength(1);
      expect(files[0]).toContain("test.eval.js");
    });

    it("discovers .eval.ts files", async () => {
      writeFileSync(join(TEST_DIR, "test.eval.ts"), "// test");

      const files = await discoverEvalFiles({ cwd: TEST_DIR });

      expect(files).toHaveLength(1);
      expect(files[0]).toContain("test.eval.ts");
    });

    it("discovers .eval.mjs files", async () => {
      writeFileSync(join(TEST_DIR, "test.eval.mjs"), "// test");

      const files = await discoverEvalFiles({ cwd: TEST_DIR });

      expect(files).toHaveLength(1);
      expect(files[0]).toContain("test.eval.mjs");
    });

    it("discovers files in nested directories", async () => {
      const subDir = join(TEST_DIR, "sub", "nested");
      mkdirSync(subDir, { recursive: true });
      writeFileSync(join(subDir, "deep.eval.js"), "// test");
      writeFileSync(join(TEST_DIR, "top.eval.js"), "// test");

      const files = await discoverEvalFiles({ cwd: TEST_DIR });

      expect(files).toHaveLength(2);
    });

    it("returns empty array when no eval files found", async () => {
      writeFileSync(join(TEST_DIR, "regular.js"), "// not eval");

      const files = await discoverEvalFiles({ cwd: TEST_DIR });

      expect(files).toEqual([]);
    });

    it("returns unique sorted files", async () => {
      writeFileSync(join(TEST_DIR, "b.eval.js"), "// b");
      writeFileSync(join(TEST_DIR, "a.eval.js"), "// a");
      writeFileSync(join(TEST_DIR, "c.eval.js"), "// c");

      const files = await discoverEvalFiles({ cwd: TEST_DIR });

      expect(files).toHaveLength(3);
      // Files should be sorted
      expect(files[0]).toContain("a.eval.js");
      expect(files[1]).toContain("b.eval.js");
      expect(files[2]).toContain("c.eval.js");
    });

    it("respects custom patterns", async () => {
      writeFileSync(join(TEST_DIR, "test.eval.js"), "// eval");
      writeFileSync(join(TEST_DIR, "test.spec.js"), "// spec");

      const files = await discoverEvalFiles({
        cwd: TEST_DIR,
        patterns: ["**/*.spec.js"],
      });

      expect(files).toHaveLength(1);
      expect(files[0]).toContain("test.spec.js");
    });

    it("respects custom ignore patterns", async () => {
      const ignoredDir = join(TEST_DIR, "ignored");
      mkdirSync(ignoredDir, { recursive: true });
      writeFileSync(join(ignoredDir, "test.eval.js"), "// ignored");
      writeFileSync(join(TEST_DIR, "test.eval.js"), "// included");

      const files = await discoverEvalFiles({
        cwd: TEST_DIR,
        ignore: ["**/ignored/**"],
      });

      expect(files).toHaveLength(1);
      expect(files[0]).not.toContain("ignored");
    });

    it("ignores node_modules by default", async () => {
      const nodeModules = join(TEST_DIR, "node_modules", "pkg");
      mkdirSync(nodeModules, { recursive: true });
      writeFileSync(join(nodeModules, "test.eval.js"), "// ignored");
      writeFileSync(join(TEST_DIR, "test.eval.js"), "// included");

      const files = await discoverEvalFiles({ cwd: TEST_DIR });

      expect(files).toHaveLength(1);
      expect(files[0]).not.toContain("node_modules");
    });
  });

  describe("discoverFromPath", () => {
    it("returns single file when given file path", async () => {
      const filePath = join(TEST_DIR, "single.eval.js");
      writeFileSync(filePath, "// test");

      const files = await discoverFromPath(filePath);

      expect(files).toHaveLength(1);
      expect(files[0]).toBe(filePath);
    });

    it("discovers files in directory when given directory path", async () => {
      writeFileSync(join(TEST_DIR, "a.eval.js"), "// a");
      writeFileSync(join(TEST_DIR, "b.eval.js"), "// b");

      const files = await discoverFromPath(TEST_DIR);

      expect(files).toHaveLength(2);
    });

    it("throws error for non-existent path", async () => {
      const badPath = join(TEST_DIR, "does-not-exist");

      await expect(discoverFromPath(badPath)).rejects.toThrow("Path does not exist");
    });

    it("passes options to discoverEvalFiles for directories", async () => {
      const subDir = join(TEST_DIR, "sub");
      mkdirSync(subDir, { recursive: true });
      writeFileSync(join(subDir, "test.eval.js"), "// test");
      writeFileSync(join(TEST_DIR, "test.eval.js"), "// test");

      // Discover only from subdirectory
      const files = await discoverFromPath(subDir);

      expect(files).toHaveLength(1);
      expect(files[0]).toContain("sub");
    });
  });

  describe("filterFiles", () => {
    it("returns all files when no filter provided", () => {
      const files = ["/path/to/a.eval.js", "/path/to/b.eval.js"];

      const filtered = filterFiles(files);

      expect(filtered).toEqual(files);
    });

    it("returns all files when filter is empty string", () => {
      const files = ["/path/to/a.eval.js", "/path/to/b.eval.js"];

      const filtered = filterFiles(files, "");

      expect(filtered).toEqual(files);
    });

    it("filters files by pattern", () => {
      const files = [
        "/path/to/sentiment.eval.js",
        "/path/to/classification.eval.js",
        "/path/to/sentiment-v2.eval.js",
      ];

      const filtered = filterFiles(files, "sentiment");

      expect(filtered).toHaveLength(2);
      expect(filtered.every((f) => f.includes("sentiment"))).toBe(true);
    });

    it("filter is case-insensitive", () => {
      const files = ["/path/to/TestFile.eval.js", "/path/to/other.eval.js"];

      const filtered = filterFiles(files, "testfile");

      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toContain("TestFile");
    });
  });

  describe("groupByDirectory", () => {
    it("groups files by directory", () => {
      const files = [
        "/path/to/dir1/a.eval.js",
        "/path/to/dir1/b.eval.js",
        "/path/to/dir2/c.eval.js",
      ];

      const groups = groupByDirectory(files);

      expect(groups.size).toBe(2);
      expect(groups.get("/path/to/dir1")).toHaveLength(2);
      expect(groups.get("/path/to/dir2")).toHaveLength(1);
    });

    it("returns empty map for empty input", () => {
      const groups = groupByDirectory([]);

      expect(groups.size).toBe(0);
    });

    it("handles single file", () => {
      const files = ["/path/to/single.eval.js"];

      const groups = groupByDirectory(files);

      expect(groups.size).toBe(1);
      expect(groups.get("/path/to")).toEqual(["/path/to/single.eval.js"]);
    });

    it("handles files in root directory", () => {
      const files = ["/a.eval.js", "/b.eval.js"];

      const groups = groupByDirectory(files);

      expect(groups.size).toBe(1);
      expect(groups.get("/")).toHaveLength(2);
    });
  });
});

import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "metrics/index": "src/metrics/index.ts",
    "metrics/opinionated/index": "src/metrics/opinionated/index.ts",
    cli: "src/runner/cli.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  outDir: "dist",
});

# CLI Reference

## Installation

```bash
npm install --save-dev evalsense
```

## Commands

### `evalsense run [path]`

Discovers and runs all `.eval.js` / `.eval.ts` files.

```bash
# Run all eval files in the current directory (recursive)
npx evalsense run

# Run a specific file or directory
npx evalsense run tests/eval/
npx evalsense run sentiment.eval.js
```

#### Options

| Flag                 | Alias | Description                                   | Default   |
| -------------------- | ----- | --------------------------------------------- | --------- |
| `--filter <pattern>` | `-f`  | Only run tests whose name matches the pattern | —         |
| `--output <file>`    | `-o`  | Write JSON report to file                     | —         |
| `--reporter <type>`  | `-r`  | Output reporter: `console`, `json`, or `both` | `console` |
| `--bail`             | `-b`  | Stop after the first test failure             | `false`   |
| `--timeout <ms>`     | `-t`  | Per-test timeout in milliseconds              | `30000`   |

#### Examples

```bash
# Filter tests by name
npx evalsense run --filter "accuracy"
npx evalsense run -f "spam"

# Save JSON report
npx evalsense run --output report.json

# Use both console and JSON reporters
npx evalsense run --reporter both

# Bail on first failure (useful in CI)
npx evalsense run --bail

# Long-running LLM tests (2 minute timeout)
npx evalsense run --timeout 120000
```

### `evalsense list [path]`

Discovers and lists `.eval.js` / `.eval.ts` files without running them.

```bash
# List all eval files in the current directory
npx evalsense list

# List eval files in a specific directory
npx evalsense list tests/
```

## Exit Codes

| Code | Meaning                                                                 |
| ---- | ----------------------------------------------------------------------- |
| `0`  | All tests passed                                                        |
| `1`  | Assertion failure — statistical thresholds not met                      |
| `2`  | Integrity failure — dataset alignment issues (missing or duplicate IDs) |
| `3`  | Execution error — test threw an exception                               |
| `4`  | Configuration error — invalid CLI options                               |

Use exit codes in CI scripts:

```bash
npx evalsense run || echo "Evaluation failed — blocking deploy"
```

## File Discovery

evalsense recursively searches for files matching `**/*.eval.js` and `**/*.eval.ts`. It skips:

- `node_modules/`
- `dist/`
- `build/`
- `.git/`

## CI Integration

```yaml
# GitHub Actions example
- name: Run LLM Evaluations
  run: npx evalsense run --reporter both --output eval-report.json

- name: Upload eval report
  uses: actions/upload-artifact@v4
  with:
    name: eval-report
    path: eval-report.json
```

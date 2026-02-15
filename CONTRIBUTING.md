# Contributing to evalsense

Thank you for your interest in contributing! This guide covers everything you need to get started.

## Prerequisites

- Node.js >= 18
- npm >= 9

## Local Setup

```bash
git clone https://github.com/evalsense/evalsense.git
cd evalsense
npm install
npm run build
npm test
```

All 5 checks must pass before submitting a PR:

```bash
npm run typecheck     # TypeScript — no errors
npm run lint          # ESLint — no errors
npm run format:check  # Prettier — all files formatted
npm test              # Vitest — all tests pass
npm run build         # tsup build — succeeds
```

Or run them all at once:

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build
```

## Project Structure

```
src/
├── core/          # describe, evalTest, types, context, errors
├── dataset/       # alignment and integrity checks
├── statistics/    # classification, regression, confusion matrix
├── assertions/    # expectStats, field selectors, matchers
├── runner/        # CLI, file discovery, test executor
├── report/        # console and JSON reporters
└── metrics/       # LLM client, adapters, opinionated metrics, custom metrics

tests/unit/        # Vitest unit tests (mirrors src/ structure)
examples/          # Working .eval.js examples
docs/              # Guides and reference
```

## Coding Standards

- **TypeScript**: All source files are `.ts`. Avoid `any` — use proper types.
- **Formatting**: Prettier handles formatting. Run `npm run format` to auto-fix.
- **Linting**: ESLint enforces style. Run `npm run lint:fix` to auto-fix.
- **Imports**: Use `.js` extensions in TypeScript imports (ESM requirement).
- **Error messages**: Explain what went wrong AND what to do about it.
- **No over-engineering**: Only add what's needed. Three similar lines > premature abstraction.

## Writing Tests

Tests live in `tests/unit/` and mirror the `src/` structure. Use Vitest:

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "../../../src/my-module.js";

describe("myFunction", () => {
  it("does the expected thing", () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

Test requirements:

- All new functions must have tests
- Coverage must stay above 80% (enforced by `npm run test:coverage`)
- Tests must be deterministic (no flaky async assumptions)

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add batch evaluation mode for toxicity metric
fix: handle undefined ID in alignByKey
docs: update LLM adapters guide with Ollama example
test: add coverage for console reporter edge cases
chore: bump vitest to 2.x
refactor: flatten metrics/llm/ into metrics/
```

Breaking changes:

```
feat!: rename evaluationMode parameter to mode

BREAKING CHANGE: The `evaluationMode` parameter in MetricConfig
has been renamed to `mode`. Update all usages accordingly.
```

## Pull Request Process

1. **Fork** the repo and create a branch from `main`
2. **Make your changes** with tests
3. **Run all checks**: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`
4. **Open a PR** — fill in the PR template
5. A maintainer will review within a few days

### PR checklist

- [ ] All CI checks pass
- [ ] New functionality has tests
- [ ] Public API changes are reflected in `docs/api-reference.md`
- [ ] Breaking changes are clearly marked in the PR description
- [ ] `CHANGELOG.md` updated for meaningful changes

## Releasing (maintainers only)

1. Update version in `package.json`
2. Update version string in `src/report/console-reporter.ts`
3. Add entry in `CHANGELOG.md`
4. Run all checks
5. Commit: `chore: release v0.X.Y`
6. Push tag: `git tag v0.X.Y && git push origin v0.X.Y`
7. GitHub Actions will publish to npm automatically

## Issue Labels

| Label              | Meaning                                       |
| ------------------ | --------------------------------------------- |
| `good first issue` | Beginner-friendly — small, well-defined scope |
| `help wanted`      | Community contributions especially welcome    |
| `bug`              | Reproducible defect                           |
| `enhancement`      | New feature or improvement                    |
| `wont-fix`         | Out of scope for this project                 |

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

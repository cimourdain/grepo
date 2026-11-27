# Agent Guidelines — Grepo

Rules every AI coding agent must follow when making changes in this repository.

## Code Patterns

Read [docs/en/contributing/code-patterns.md](./docs/en/contributing/code-patterns.md) before changing code, and [docs/en/contributing/architecture.md](./docs/en/contributing/architecture.md) for the process boundaries.

## Build and Test

Read [docs/en/contributing/local-usage.md](./docs/en/contributing/local-usage.md) before building or testing. Use the Makefile targets (`make install`, `make test`, `make lint`, `make typecheck`, `make run-dev`): they select the right Node version through nvm.

## Commit Messages

Read [docs/en/contributing/dev-workflow.md](./docs/en/contributing/dev-workflow.md) before committing: it holds the Conventional Commits convention release-please reads, the CI, the release process and the documentation site. Never edit the version or `CHANGELOG.md` by hand.

## Per-Change Checklist

Before considering any change complete:

1. The change is covered by tests.
2. `make test`, `make lint`, `make typecheck` and `make build` all pass, and `make docs-build` when the documentation changed (it fails on a dead link).
3. The documentation in `docs/en/` is updated to reflect the change.
4. A new or changed user-facing feature is reflected in [docs/en/guide/features.md](./docs/en/guide/features.md) and the [README](./README.md).
5. A change to the code architecture, the IPC contract or the saved files updates [docs/en/contributing/architecture.md](./docs/en/contributing/architecture.md).
6. A change to the theme variables updates [docs/en/contributing/theme.md](./docs/en/contributing/theme.md).

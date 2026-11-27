# Development workflow

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`, for example `feat(repos): add a tag color per rule` or `fix(settings): keep the filters when a preset is visited`. The types release-please reads:

| Type                                   | Release effect                 | Changelog section |
| -------------------------------------- | ------------------------------ | ----------------- |
| `feat`                                 | minor bump                     | Features          |
| `fix`                                  | patch bump                     | Bug Fixes         |
| `perf`, `revert`, `refactor`           | patch bump (when user-visible) | their own section |
| `docs`, `test`, `build`, `ci`          | listed in the changelog        | their own section |
| `chore`, `style`                       | hidden from the changelog      |                   |
| any type with `!` or `BREAKING CHANGE` | major bump (minor while `0.x`) | Features / Fixes  |

The rules are those of `@commitlint/config-conventional` (`commitlint.config.cjs`). The **Conventional Commits** workflow checks the commits of every pull request.

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`, in parallel jobs: lint (ESLint and Markdown lint), type check, tests, and the Linux and Windows builds (`pnpm build:linux`, `pnpm build:win`, whose files are kept as a workflow artifact for seven days to try them; nothing is published). A pull request from a release-please branch skips them: it only bumps the version and the changelog.

## Releases

[release-please](https://github.com/googleapis/release-please) manages releases (`.github/workflows/release.yml`, configured by `.release/release-please-config.json` and `.release/release-please-manifest.json`):

1. On every push to `main`, it opens (or updates) a **release pull request** that bumps the version in `package.json` and writes the `CHANGELOG.md` entry from the Conventional Commits since the last release.
2. Merging that pull request tags `v<version>` and creates the GitHub release.
3. The same workflow then builds the Linux AppImage and the Windows installer and portable executable from the tag and attaches them to the release (`Grepo-<version>.AppImage`, `Grepo-Setup-<version>.exe`, `Grepo-<version>-portable.exe`). It does it itself, as a release created with the default token doesn't trigger other workflows.

Never edit the version or `CHANGELOG.md` by hand. The packages are unsigned.

## Documentation

The site is built by VitePress from `docs/en/` (`make docs` serves it locally, `make docs-build` builds it, failing on a dead link). `.github/workflows/docs.yml` builds it on every pull request that touches `docs/` and, on every push to `main`, deploys it to **GitHub Pages**. Once, in the repository's **Settings → Pages**, set the source to **GitHub Actions**. The site is served under `/<repository>/`: the workflow sets `DOCS_BASE` to that path.

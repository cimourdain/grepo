// Shared commit-message rules for the "Conventional Commits" CI check
// (`.github/workflows/conventional-commits.yml`) and for any local
// `commitlint` usage; release-please relies on the same convention to
// compute version bumps and changelog entries.
module.exports = {
  extends: ['@commitlint/config-conventional']
}

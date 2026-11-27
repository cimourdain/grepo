# Grepo

Desktop app (Electron, Vue 3, TypeScript) to manage the local repositories of a workspace: browse them as a grid, filter them with regular expressions, and open them on GitHub, CircleCI and VS Code, one at a time or many at once.

- **Repos** (book icon): the repositories found in the local repositories path, as a grid, with a regular expression filter, tags with org and tag filters, custom views (font size, item width) and attribute toggles, multi-selection, an action menu (Github, Circleci, VSCode, All) and presets of the search.
- **Settings** (gear icon): General (paths and the repositories inspection), Repos (naming rules for clean names, tags rules), Github (login for the GitHub API, your organizations and teams, and the repositories your teams own, with a clone button for the missing ones), Theme, and View (the presets listed in the sidebar).

```bash
make install
make run-dev   # development, with hot reload
make run       # build then launch
make test
```

Documentation (a site built with VitePress: `make docs` serves it, GitHub Pages hosts it): [user guide](docs/en/guide/index.md) · [features](docs/en/guide/features.md) · [contributing](docs/en/contributing/index.md) · [agent rules](AGENTS.md).

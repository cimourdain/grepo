# Grepo user guide

Grepo lists the git repositories of your workspace and opens them where you work.

## Installation

Grepo is built from its source code (see [Local usage](../contributing/local-usage.md) for the prerequisites: Node.js, nvm and pnpm). The builds land in `dist/`; nothing is signed or published.

### Linux

1. Build the AppImage: `make build-linux`. It makes `dist/Grepo-<version>.AppImage`.
2. Make it executable: `chmod +x dist/Grepo-<version>.AppImage`.
3. Run it: `./dist/Grepo-<version>.AppImage`. `make run-build` builds then runs it, detached from the terminal.
4. To install it, copy the file where you keep your applications (for example `~/Applications/`) and run it from there. Replacing the file with a newer one keeps your settings, which live in `~/.config/grepo`.

### Windows

1. Build the installer and the portable executable: `make build-win` (on Windows; from Linux it needs [Wine](https://www.winehq.org/) installed). It makes `dist/Grepo-Setup-<version>.exe` and `dist/Grepo-<version>-portable.exe`.
2. Copy the one you want to the Windows computer.
3. **Installer**: run `Grepo-Setup-<version>.exe`, choose the installation folder, then start Grepo from the Start menu or the desktop shortcut. **Portable**: run `Grepo-<version>-portable.exe` directly, nothing is installed.
4. The files aren't signed: Windows SmartScreen may warn about an unknown publisher. Choose **More info → Run anyway**.

Paths can be written in the Windows way (`C:\Sites\repos`, `C:/Sites/repos` or `\\server\share`) or the POSIX way. The Windows build hasn't been tested much yet: if something misbehaves there, please report it.

### What Grepo needs on the computer

- **git**, to clone repositories from the Github tab, with an SSH key GitHub knows (cloning goes through SSH).
- The **`code` command** of VS Code in the `PATH`, for the VSCode action.
- A web browser, for the Github and Circleci actions.

### Coming from Gaviv

Grepo was named Gaviv before. At its first start, Grepo copies your former configuration (`~/.config/gaviv`: settings, presets, rules, views and the saved GitHub inspections) to `~/.config/grepo`, once, and leaves the former folder untouched. Your GitHub token isn't copied (it is encrypted with a keyring entry named after the app): log in again in the Github tab.

## First start

1. Open **Settings → General**.
2. Check the **Local repositories paths** (default `${HOME}`, your home folder: with no configuration yet, everything under it, up to three folders deep, is inspected. Narrow it to the folder holding your repositories to make the inspection faster). You can add several folders with **Add a path**; all are inspected together. Grepo looks for repositories up to three folders below it, so repositories grouped by team (`code/team/<repository>`) are found. `~`, `$HOME` and `${HOME}` are understood.
3. Click **Refresh** (under the paths). Run it again whenever you clone or remove a repository.
4. Open **Repos**.

The **Local configuration path** (default `${HOME}/.config/grepo`) is where Grepo saves `settings.json`, `repositories.json`, `presets.json` and `github-auth.json`. Choosing another folder copies the existing files there (without overwriting files it already holds). The choice itself is remembered in `location.json` of the default folder.

Settings has no Save button: each form saves **by itself**, a moment after you stop typing, once what you typed is valid. A line under the form says "Saved.", or "Not saved yet: …" with the reason when an input is invalid (nothing is saved until it is fixed). The configuration path is the one exception to the pause: it is saved when you leave its field or press Enter, because saving moves the configuration to the new folder.

## What next

The pages and features are described in [Grepo features](./features.md): the Repos page (search, filters, views, actions, presets), the About page, the Settings tabs, the GitHub organizations, teams and repositories, the import and export, the views and the rules.

# Runs pnpm commands directly on the host, pinned to this repo's Node/pnpm
# versions — read from package.json (see NODE_VERSION/PNPM_VERSION below)
# so they never drift out of sync with it.
#
# Switches to the right Node version via nvm before running each command,
# so contributors don't need to `nvm use` by hand first — they do need
# nvm itself, and a matching Node version already installed in it
# (`nvm install <version>`).
#
# Usage:
#   make install   # pnpm install
#   make test      # pnpm test
#   make build     # pnpm build
#   make build-linux # build the Linux AppImage (pnpm build:linux)
#   make build-win # build the Windows installer and portable exe (pnpm build:win)
#   make run       # pnpm start
#   make run-dev   # pnpm dev
#   make run-build # build the AppImage (pnpm build:linux), then run it detached from the terminal
#   make docs      # serve the documentation site locally (VitePress, with hot reload)
#   make docs-build # build the documentation site (fails on a dead link)
#   make docs-preview # build it, then serve the built site
#   make lint      # ESLint + Markdown lint
#   make typecheck # type check main/preload and renderer
#   make shell     # interactive shell with the right Node version active

SHELL := /bin/bash

# Read from package.json's "engines.node" (major version only, e.g. "26")
# and "packageManager" (e.g. "10.34.7") fields, so these never need manual
# syncing when those fields are bumped.
NODE_VERSION := $(shell sed -nE 's/.*"node":[[:space:]]*">=?([0-9]+)\.[0-9]+\.[0-9]+.*/\1/p' package.json)
PNPM_VERSION := $(shell sed -nE 's/.*"packageManager":[[:space:]]*"pnpm@([^"]+)".*/\1/p' package.json)

# The AppImage `pnpm build:linux` makes, named after package.json's "version".
APP_VERSION := $(shell sed -nE 's/^[[:space:]]*"version":[[:space:]]*"([^"]+)".*/\1/p' package.json)
APPIMAGE_PATH := dist/Grepo-$(APP_VERSION).AppImage

# Where nvm is installed; respects an already-exported $NVM_DIR (e.g. a
# non-default install location) and falls back to the conventional path.
NVM_DIR ?= $(HOME)/.nvm

# Sourced at the start of every recipe to switch to NODE_VERSION before
# running pnpm, so contributors don't need to `nvm use` by hand.
# `nvm use` leaves an nvm bin directory already in $PATH where it is, so another version manager's
# shims (asdf, ...) listed before it would still win: the nvm bin is put first explicitly.
NVM_USE := . $(NVM_DIR)/nvm.sh && nvm use $(NODE_VERSION) >/dev/null && PATH="$$(dirname "$$(nvm which $(NODE_VERSION))"):$$PATH"

# Electron's bundled Chromium ships its own fontconfig-config XML parser,
# older than and independent from the system's `fontconfig` library/CLI
# tools — it doesn't understand a few CSS Fonts Level 4 additions some
# recent fontconfig packages ship (the `xsi:nil` attribute, and generic
# family names like `ui-sans-serif`), and prints a "Fontconfig warning"
# line per occurrence. This is a harmless, well-known Electron/Chromium
# packaging quirk (affects VSCode, Discord, Slack, ... the same way on
# such hosts) with no effect on this app (which never uses those CSS4
# generic family keywords) — filtered out of run/run-dev's stderr below
# since Chromium hardcodes the system fontconfig paths for this specific
# parser, ignoring the usual FONTCONFIG_FILE/FONTCONFIG_PATH overrides.
FILTER_FONTCONFIG_WARNINGS := 2> >(grep -v '^Fontconfig warning:' >&2)

.PHONY: install test lint typecheck docs docs-build docs-preview build build-linux build-win run run-dev run-build shell

install:
	$(NVM_USE) && pnpm install

test:
	$(NVM_USE) && pnpm test

build:
	$(NVM_USE) && pnpm build

# The Linux AppImage, `dist/Grepo-<version>.AppImage` (run-build also launches it).
build-linux:
	$(NVM_USE) && pnpm build:linux

# The Windows x64 NSIS installer and portable executable, `dist/Grepo-Setup-<version>.exe` and
# `dist/Grepo-<version>-portable.exe`. Built on Windows as is; from Linux, electron-builder's NSIS
# target needs Wine installed (without it: "wine is required"). The CI builds it on a Windows runner.
build-win:
	$(NVM_USE) && pnpm build:win

# The documentation site (docs/en/, built by VitePress): `docs` serves it with hot reload at
# http://localhost:5173, `docs-build` builds it into docs/.vitepress/dist (a dead link fails the
# build), `docs-preview` builds it then serves the built site.
docs:
	$(NVM_USE) && pnpm docs:dev

docs-build:
	$(NVM_USE) && pnpm docs:build

docs-preview:
	$(NVM_USE) && pnpm docs:build && pnpm docs:preview

lint:
	$(NVM_USE) && pnpm lint

typecheck:
	$(NVM_USE) && pnpm typecheck

# Electron 45+ no longer downloads its binary from a postinstall script of its own: its
# `install-electron` bin does (a no-op once the binary is there). package.json's postinstall
# runs it on install; run/run-dev run it too, for a node_modules installed without it.
INSTALL_ELECTRON := pnpm exec install-electron

# ELECTRON_RUN_AS_NODE, set in some editors' terminals, would make the app start as plain Node.
run:
	@$(NVM_USE) && $(INSTALL_ELECTRON) && env -u ELECTRON_RUN_AS_NODE pnpm start $(FILTER_FONTCONFIG_WARNINGS)

run-dev:
	@$(NVM_USE) && $(INSTALL_ELECTRON) && env -u ELECTRON_RUN_AS_NODE pnpm dev $(FILTER_FONTCONFIG_WARNINGS)

# Runs in its own session (setsid), with no terminal to outlive: closing the terminal leaves
# the app running, whose logs are in its log file. ELECTRON_RUN_AS_NODE, set in some editors'
# terminals, would make the app start as plain Node.
run-build:
	$(NVM_USE) && pnpm build:linux
	@setsid env -u ELECTRON_RUN_AS_NODE ./$(APPIMAGE_PATH) </dev/null >/dev/null 2>&1 &
	@echo "Grepo started from $(APPIMAGE_PATH): this terminal can be closed."

shell:
	$(NVM_USE) && exec bash -i


# Grepo features

What Grepo does, page by page. To install it and set it up, see the [user guide](./index.md).

## Repos

Each card shows the **displayed name** as its title (dashes and underscores become spaces: `shop-checkout_payment` → _Shop Checkout Payment_, and the [naming rules](#repos-rules) can replace parts of it), its **tags**, then two lines, the **org** and the **name** (both from the GitHub remote; without one, the org shows `—` and the name is the folder name), and the **local path**.

### Filter

The search field filters on the displayed name, the real name and the folder name, case-insensitively, as a **regular expression**: `^shop-.*-(web|bff)$`, `pay|pricing`. An invalid expression is flagged and filters nothing.

### Org and tags filters

The funnel icon (placed with the eye icon right before the preset buttons) opens the **Filter** popover, with two sections, **Org** (every org some repository belongs to) and **Tags** (every tag some repository has). Each entry is a tri-state checkbox: click once to show only repositories with that tag (green tick), twice to hide them (red cross), a third time to unset it. With several entries shown in a section, a repository passes when it matches at least one of them; the two sections both have to pass. The icon turns red while a filter is set.

### View menu

The eye icon next to the filter opens the **View** menu:

- **View configuration**: switch to another view defined in [Settings → View](#repositories-view-styling-configuration) (font size and grid item minimum width). The page opens on the default view.
- **Attributes**: show or hide the **Org**, **Name**, **Tags** and **Buttons** of every card (the title and the path always show).

### Actions

The toolbar above the cards is in two columns. On the left, aligned to the left, a fixed 65% of the page width: the search, the select-all checkbox, the **action menu** ("Open in Github", "Open in Circleci", "Open in VSCode", "Open in All") and the **Run** button. On the right, aligned to the right: the **Filter** and **View** menus, then the preset buttons.

Each card has the buttons **Github**, **Circleci**, **VSCode** and **All** for that repository only. To act on several, tick their checkboxes (the checkbox next to the count selects every displayed repository), choose the action in the menu and click **Run**.

| Action   | What it does                                                                                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Github   | Opens the repository's GitHub page, built from the `origin` remote of its `.git/config` (`https://github.com/<org>/<name>`).                                                     |
| Circleci | When a `.circleci/` folder is at the repository's root, opens `https://app.circleci.com/pipelines/github/<org>/<name>`.                                                          |
| VSCode   | Writes a temporary `.code-workspace` file listing the repositories (one window for all) with a random `workbench.colorCustomizations` title bar color, and opens it with `code`. |
| All      | The three above.                                                                                                                                                                 |

While you are logged in to GitHub (Settings → Github), each card whose repository has a GitHub remote has one more button after **All**, with a git merge icon: it reads the **open pull requests you created** in that repository (a GitHub search on `author:<you>`) and lists them under the buttons as links (`#number title`, with a _draft_ mark), opening in your browser. Click it again to hide the list.

A repository an action can't apply to (no GitHub remote, no `.circleci/`) is skipped and listed under the toolbar, as is any failure. VSCode needs the `code` command in the `PATH`.

### Presets

The Repos page keeps **its own** search, filters, view and shown attributes: opening a preset's page (from the sidebar) shows the preset's, never touches the Repos page's, and coming back to Repos gives yours back (as long as the window stays open). Changes made while visiting a preset aren't saved, unless you update the preset.

The preset buttons are icons next to the Filter and View menus: the floppy disk (**Save preset**) names the current search, org filter, tag filter, view configuration and shown attributes as a preset, which then appears under Repos in the sidebar. A preset's page opens with all of those; the floppy disk again (**Update preset**) replaces them with the current ones and the bin (**Delete preset**) removes it, after a confirmation.

## About

The **About** entry, after Settings in the sidebar, shows the application's name and version.

## Settings

- **General**: two sections. **Local repositories**: the paths inspected recursively (up to three folders deep) to identify the git repositories of this computer, and the **Refresh** button. **Configuration**: the local configuration path.
- **Github**: paste a [personal access token](https://github.com/settings/tokens) (`repo` scope for private repositories). Grepo checks it against `GET /user`, saves it encrypted with your system keyring (Electron `safeStorage`), and only shows the account name. Without a keyring the token is saved in `github-auth.json` with `0600` permissions and a warning is shown. **Log out** forgets it.
- **Github**, once logged in, also has two sections, see [GitHub organizations, teams and repositories](#github-organizations-teams-and-repositories).
- **Rules**: the [rules](#repos-rules) (naming rules, tags rules, tag colors).
- **Import/Export** (last tab): see [Import and export](#import-and-export).
- **View**: the [view styling configurations](#repositories-view-styling-configuration), then the presets, in the sidebar's order: show or hide each in the sidebar, give it a sidebar name, move it up or down, delete it.
- **Theme**: the included themes (Light, Catppuccin, Gruvbox, Nord and Tokyo Night families), applied at once.

## GitHub organizations, teams and repositories

Once logged in (Settings → Github), Grepo inspects the account and shows:

- **Organizations and teams**: the organizations you belong to, each with your teams in it, as nested checkboxes. Everything starts enabled; a disabled organization (and so its teams) or team is left out below. The account is inspected on its own the first time, and **Refresh organizations and teams** inspects it again. Listing teams needs the `read:org` scope on the token. For an organization that uses SAML single sign-on, the token must also be authorized for it (github.com/settings/tokens → the token → **Configure SSO**): otherwise GitHub silently leaves that organization's teams out, and Grepo shows a warning naming the organization.
- **Repositories**: **Inspect repositories** lists the repositories of which an enabled team is a **code owner**, that is, named (`@org/team`) in its CODEOWNERS file (`.github/CODEOWNERS`, `CODEOWNERS` or `docs/CODEOWNERS`, in GitHub's order). To keep the number of requests low, only the repositories an enabled team has access to are checked (a team can only own code in a repository it has access to), and archived repositories are left out. Each repository is marked:
  - **cloned**: a repository of the Local repositories path has its GitHub remote (the local folders are read again at each inspection); its local path shows;
  - **missing**: not found locally, with its own **folder field** (it suggests your local repositories paths) and a **Clone** button. It runs `git clone` over SSH (`git@github.com:org/name.git`, with your own SSH keys: the token isn't used) into `<folder>/<name>`. The folder is optional: empty, the first Local repositories path is used. A repository cloned into a folder outside the local repositories paths stays "cloned" as long as that folder is a git clone. The folder must not exist yet, and the repository then shows as cloned.

The result of the last inspection is **saved locally** (`github-repositories.json`) and shown again when you open the tab, brought up to date with the local repositories; click **Inspect repositories** to ask GitHub again. Logging out forgets it.

## Import and export

**Settings → Import/Export** moves your configuration between computers or keeps a backup.

- **Export settings…** asks where to save, then writes a JSON file (named `grepo-settings-<date>-<time>.json` by default, for example `grepo-settings-20260131-090507.json`: the local date and time of the export, so successive exports don't overwrite each other) holding the **local repositories paths**, the **rules** (naming rules, tags rules and tag colors) and the **settings of the View tab** (the view styling configurations, with the default view, and the presets). It holds no secret: the GitHub token is never exported.
  The option **Include the settings based on local paths** (ticked by default) can be unticked to leave out what depends on the computer's own folders: the **local repositories paths** and the **tag rules tested on the local path**. Use it to share your rules and views with another computer. **Importing** such a file keeps that computer's own local repositories paths and its tag rules on the local path (they stay after the imported tag rules); the imported file's other settings replace the current ones.
- **Choose a file…** reads such a file and checks it, saying what it holds. Nothing changes until you click **Import and replace my settings**, because an import **replaces** the current paths, rules, views and presets. A file with an invalid part (a bad regular expression, a relative path, a duplicated view name…) or that isn't a Grepo file is refused whole, with the reason. The other tabs show the imported values right away.

## Repositories view styling configuration

**Settings → View → Repositories view styling configuration** defines the view configurations of the Repos page. Each has a **name**, a **font size** (8–32 px) and a **grid item min width** (160–800 px: the grid fits as many columns as it can). Before you define any, the only view is **Default**, made from the page's original style (16 px, 300 px). Exactly one view is the **default** (radio button): the page opens with it, and it can't be deleted while it is the default. A preset keeps the id of the view it uses; if that view is deleted later, the preset falls back to the default view. They are saved by themselves, once valid (every view named, the names different).

## Repos rules

**Settings → Rules** has two sections, naming rules and tags rules, saved by themselves once valid. Search queries are regular expressions, case-insensitive; an invalid one is outlined in red and refused on save.

### Naming rules

They define the repository name displayed in the Repos page (the card's title). A naming rule is always applied to the repository's name (the folder name, never the org) and has no target selector. Each rule has a search query and a replacement, a **text** (`$1`… are the query's groups) or an **image** (a file chosen with Browse, or its path; png, jpg, gif, webp or svg, up to 1 MB). Rules apply in order, each on the result of the previous one, then dashes and underscores separate the words and each starts with a capital letter. The "Try a repository name" field shows the result.

For the repository `shop-checkout-payment-pay-landingpage`:

| Rules                                    | Displayed name                             |
| ---------------------------------------- | ------------------------------------------ |
| none                                     | Shop Checkout Payment Pay Landingpage      |
| `checkout-payment` → text `Pay`          | Shop Pay Pay Landingpage                   |
| `^shop-` → image `shop_icon_100x100.png` | _(image)_ Checkout Payment Pay Landingpage |
| both of the above, in that order         | _(image)_ Pay Pay Landingpage              |

An image that can't be read shows as a `?` in the title. Filtering matches the displayed name without its images.

### Tags rules

Each rule has a search query, a **target** selector (what the query is tested on) and the tags, separated by commas, a match gives. The target is one of:

| Target          | The query is tested on                                                        |
| --------------- | ----------------------------------------------------------------------------- |
| Repo name       | The repository's folder name (default), for example `shop-checkout-web`.      |
| Org / repo name | The GitHub org and name, `example/shop-checkout-web`.                         |
| Org             | The GitHub org alone, `example`.                                              |
| Local path      | The repository's absolute local path, `/home/me/code/team/shop-checkout-web`. |

A repository without a GitHub remote has no org: `Org` is empty for it, and `Org / repo name` is its name alone. Every matching rule applies, so a repository can have tags from several rules. Tags show on the cards and feed the Tags filter.

### Tag colors

Below the tag rules, **Tag colors** lists every tag the rules give. By default a tag's color is worked out from its name (the same name always gives the same color). Choose another with the color field; **Auto** goes back to the automatic one. Rules saved with the former "org/" checkbox keep their meaning (checked is `Org / repo name`).

Rules apply when the repositories are read: no need to inspect the repositories again after changing them.

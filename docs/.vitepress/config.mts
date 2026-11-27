/**
 * VitePress configuration of the documentation site, generated from the Markdown files of
 * `docs/en/`: its menu, and heading anchors built like GitHub's, so the pages' links to their own
 * headings work on both. Published on GitHub Pages under `/<repository>/`: the workflow
 * (`.github/workflows/docs.yml`) sets `DOCS_BASE` to that; locally the site is served from `/`.
 *
 * Used by the `docs:dev`, `docs:build` and `docs:preview` scripts (`make docs`, `make docs-build`).
 */
import { defineConfig } from 'vitepress'

/**
 * Builds a heading's anchor as GitHub does: lower case, punctuation removed, each space a hyphen.
 *
 * @param heading - the heading's text.
 * @returns its anchor.
 * @example
 * githubAnchor('Org and tags filters') // 'org-and-tags-filters'
 */
function githubAnchor(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\p{Mark} _-]/gu, '')
    .replace(/ /g, '-')
}

export default defineConfig({
  title: 'Grepo',
  description: 'Browse, filter and open the local repositories of a workspace.',
  srcDir: 'en',
  base: process.env.DOCS_BASE ?? '/',
  cleanUrls: true,
  markdown: {
    anchor: { slugify: githubAnchor }
  },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
      { text: 'Contributing', link: '/contributing/', activeMatch: '/contributing/' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          base: '/guide/',
          collapsed: false,
          items: [
            { text: 'Installation and first start', link: 'index' },
            { text: 'Features', link: 'features' }
          ]
        }
      ],
      '/contributing/': [
        {
          text: 'Contributing',
          base: '/contributing/',
          collapsed: false,
          items: [
            { text: 'Introduction', link: 'index' },
            { text: 'Local usage', link: 'local-usage' },
            { text: 'Code patterns', link: 'code-patterns' },
            { text: 'Development workflow', link: 'dev-workflow' },
            { text: 'Architecture', link: 'architecture' },
            { text: 'Themes', link: 'theme' }
          ]
        }
      ]
    },
    search: { provider: 'local' }
  }
})

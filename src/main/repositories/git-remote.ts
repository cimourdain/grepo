/**
 * Reads a repository's git configuration, to know where it is hosted.
 *
 * @example
 * originUrlOf('[remote "origin"]\n\turl = git@github.com:org/repo.git\n') // 'git@github.com:org/repo.git'
 */

/**
 * Finds the URL of a repository's `origin` remote in the text of its `.git/config`; when there is
 * no `origin`, the first remote's.
 *
 * @param config - the text of the git configuration.
 * @returns the URL, `null` when no remote has one.
 */
export function originUrlOf(config: string): string | null {
  const remotes: Array<{ name: string; url: string | null }> = []
  let current: { name: string; url: string | null } | null = null
  for (const line of config.split(/\r?\n/)) {
    const section = /^\s*\[(.+?)\]\s*$/.exec(line)
    if (section) {
      const remote = /^remote\s+"(.+)"$/.exec(section[1]!)
      current = remote ? { name: remote[1]!, url: null } : null
      if (current) remotes.push(current)
      continue
    }
    const url = /^\s*url\s*=\s*(.+?)\s*$/.exec(line)
    if (url && current && current.url === null) current.url = url[1]!
  }
  const origin = remotes.find((remote) => remote.name === 'origin' && remote.url !== null)
  return (origin ?? remotes.find((remote) => remote.url !== null))?.url ?? null
}

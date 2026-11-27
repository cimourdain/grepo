import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  buildWorkspace,
  foregroundOn,
  hslToHex,
  randomWorkspaceColors,
  writeWorkspaceFile
} from './vscode-workspace'

describe('colors', () => {
  it('converts HSL to hex', () => {
    expect(hslToHex(0, 1, 0.5)).toBe('#FF0000')
    expect(hslToHex(120, 1, 0.5)).toBe('#00FF00')
    expect(hslToHex(240, 1, 0.5)).toBe('#0000FF')
  })

  it('picks a readable foreground', () => {
    expect(foregroundOn('#FFFFFF')).toBe('#000000')
    expect(foregroundOn('#101010')).toBe('#FFFFFF')
  })

  it('draws valid random colors', () => {
    const colors = randomWorkspaceColors(() => 0.3)
    expect(colors.background).toMatch(/^#[0-9A-F]{6}$/)
    expect(colors.foreground).toMatch(/^#(000000|FFFFFF)$/)
  })
})

describe('workspace', () => {
  const repositories = [
    { path: '/w/a', folderName: 'a' },
    { path: '/w/b', folderName: 'b' }
  ]
  const colors = { background: '#A4A4FC', foreground: '#000000' }

  it('lists the folders and tints the title bar', () => {
    expect(buildWorkspace(repositories, colors)).toEqual({
      folders: [
        { path: '/w/a', name: 'a' },
        { path: '/w/b', name: 'b' }
      ],
      settings: {
        'workbench.colorCustomizations': {
          'titleBar.activeBackground': '#A4A4FC',
          'titleBar.inactiveBackground': '#A4A4FC',
          'titleBar.activeForeground': '#000000',
          'titleBar.inactiveForeground': '#000000'
        },
        'files.exclude': { '**/.git': false }
      }
    })
  })

  it('writes a .code-workspace file', () => {
    const directory = mkdtempSync(join(tmpdir(), 'grepo-ws-'))
    try {
      const file = writeWorkspaceFile(join(directory, 'sub'), repositories, colors, 42)
      expect(file).toBe(join(directory, 'sub', 'grepo-repos-42.code-workspace'))
      expect(JSON.parse(readFileSync(file, 'utf8')).folders).toHaveLength(2)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})

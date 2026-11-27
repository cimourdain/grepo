import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ConfigLocation } from '../config/config-location'
import { GithubAuthStore, type GithubAuthEnvironment } from './github-auth-store'

let home: string
let location: ConfigLocation
let environment: GithubAuthEnvironment & { fetch: ReturnType<typeof vi.fn> }

/** A GitHub API answer. */
function answer(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'grepo-gh-'))
  location = new ConfigLocation(home)
  environment = {
    isEncryptionAvailable: async () => true,
    encrypt: async (text) => Buffer.from(`enc:${text}`),
    decrypt: async (data) => ({
      result: data.toString().replace(/^enc[0-9]*:/, ''),
      shouldReEncrypt: false
    }),
    fetch: vi.fn()
  }
})
afterEach(() => rmSync(home, { recursive: true, force: true }))

describe('GithubAuthStore', () => {
  it('logs in with a valid token, saved encrypted and never in clear', async () => {
    environment.fetch.mockResolvedValue(answer(200, { login: 'octo', name: 'Octo Cat' }))
    const store = new GithubAuthStore(location, environment)
    const result = await store.login(' ghp_abc123 ')

    expect(result).toEqual({
      success: true,
      state: { loggedIn: true, login: 'octo', name: 'Octo Cat', encrypted: true }
    })
    expect(environment.fetch.mock.calls[0]![0]).toBe('https://api.github.com/user')
    expect(environment.fetch.mock.calls[0]![1].headers.Authorization).toBe('Bearer ghp_abc123')
    expect(readFileSync(location.file('github-auth.json'), 'utf8')).not.toContain('ghp_abc123')
    expect(statSync(location.file('github-auth.json')).mode & 0o777).toBe(0o600)
    expect(await store.token()).toBe('ghp_abc123')
  })

  it('says when no keyring is available', async () => {
    environment.isEncryptionAvailable = async () => false
    environment.fetch.mockResolvedValue(answer(200, { login: 'octo' }))
    const store = new GithubAuthStore(location, environment)
    expect(await store.login('ghp_x')).toMatchObject({ success: true, state: { encrypted: false } })
    expect(await store.token()).toBe('ghp_x')
  })

  it('refuses a rejected token, an unreachable GitHub and a malformed token', async () => {
    const store = new GithubAuthStore(location, environment)
    environment.fetch.mockResolvedValueOnce(answer(401))
    expect(await store.login('ghp_bad')).toEqual({
      success: false,
      message: 'GitHub refused this token.'
    })
    environment.fetch.mockRejectedValueOnce(new Error('offline'))
    expect(await store.login('ghp_x')).toMatchObject({ success: false })
    expect(await store.login('not a token!')).toMatchObject({ success: false })
    expect(await store.login('')).toMatchObject({ success: false })
    expect(store.state().loggedIn).toBe(false)
  })

  it('saves the token again when the keyring says its key changed', async () => {
    environment.fetch.mockResolvedValue(answer(200, { login: 'octo' }))
    const store = new GithubAuthStore(location, environment)
    await store.login('ghp_abc123')
    let rotated = true
    environment.decrypt = async (data) => ({
      result: data.toString().replace(/^enc[0-9]*:/, ''),
      shouldReEncrypt: rotated
    })
    environment.encrypt = async (text) => Buffer.from(`enc2:${text}`)
    expect(await store.token()).toBe('ghp_abc123')
    expect(readFileSync(location.file('github-auth.json'), 'utf8')).toContain(
      Buffer.from('enc2:ghp_abc123').toString('base64')
    )
    rotated = false
    expect(await store.token()).toBe('ghp_abc123') // still readable
  })

  it('logs out', async () => {
    environment.fetch.mockResolvedValue(answer(200, { login: 'octo' }))
    const store = new GithubAuthStore(location, environment)
    await store.login('ghp_x')
    store.logout()
    expect(store.state().loggedIn).toBe(false)
    expect(await store.token()).toBeNull()
  })
})

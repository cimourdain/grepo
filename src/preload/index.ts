/**
 * Electron preload script.
 *
 * Runs in an isolated context and exposes a typed `window.api` surface to the renderer via
 * `contextBridge`. The renderer never gets direct `ipcRenderer`/Node access: every call is
 * forwarded through `ipcRenderer.invoke` to the matching `ipcMain.handle` registered in
 * `src/main/ipc/register.ts`, with the channel names and types of `src/shared/ipc-contract.ts`.
 */
import { contextBridge, ipcRenderer } from 'electron'

import { IpcChannel, IpcEvent, type IpcApi } from '../shared/ipc-contract'

const api: IpcApi = {
  getSettings: () => ipcRenderer.invoke(IpcChannel.GetSettings),
  saveGeneralSettings: (request) => ipcRenderer.invoke(IpcChannel.SaveGeneralSettings, request),
  setColorTheme: (theme) => ipcRenderer.invoke(IpcChannel.SetColorTheme, theme),
  getRepositories: () => ipcRenderer.invoke(IpcChannel.GetRepositories),
  refreshRepositories: () => ipcRenderer.invoke(IpcChannel.RefreshRepositories),
  runRepositoryAction: (action, paths) =>
    ipcRenderer.invoke(IpcChannel.RunRepositoryAction, action, paths),
  listPresets: () => ipcRenderer.invoke(IpcChannel.ListPresets),
  savePreset: (name, filter) => ipcRenderer.invoke(IpcChannel.SavePreset, name, filter),
  updatePreset: (name, filter) => ipcRenderer.invoke(IpcChannel.UpdatePreset, name, filter),
  deletePreset: (name) => ipcRenderer.invoke(IpcChannel.DeletePreset, name),
  configurePreset: (name, change) => ipcRenderer.invoke(IpcChannel.ConfigurePreset, name, change),
  movePreset: (name, offset) => ipcRenderer.invoke(IpcChannel.MovePreset, name, offset),
  getRepoRules: () => ipcRenderer.invoke(IpcChannel.GetRepoRules),
  saveRepoRules: (rules) => ipcRenderer.invoke(IpcChannel.SaveRepoRules, rules),
  getRepoViews: () => ipcRenderer.invoke(IpcChannel.GetRepoViews),
  saveRepoViews: (views) => ipcRenderer.invoke(IpcChannel.SaveRepoViews, views),
  pickImage: () => ipcRenderer.invoke(IpcChannel.PickImage),
  loadImage: (path) => ipcRenderer.invoke(IpcChannel.LoadImage, path),
  getWindowChrome: () => ipcRenderer.invoke(IpcChannel.GetWindowChrome),
  applyWindowControl: (control) => ipcRenderer.invoke(IpcChannel.ApplyWindowControl, control),
  onWindowMaximizedChanged: (listener) => {
    const handler = (_event: unknown, maximized: boolean): void => listener(maximized)
    ipcRenderer.on(IpcEvent.WindowMaximizedChanged, handler)
    return () => {
      ipcRenderer.removeListener(IpcEvent.WindowMaximizedChanged, handler)
    }
  },
  exportSettings: (options) => ipcRenderer.invoke(IpcChannel.ExportSettings, options),
  previewImport: () => ipcRenderer.invoke(IpcChannel.PreviewImport),
  applyImport: () => ipcRenderer.invoke(IpcChannel.ApplyImport),
  getGithubOrgs: () => ipcRenderer.invoke(IpcChannel.GetGithubOrgs),
  inspectGithubOrgs: () => ipcRenderer.invoke(IpcChannel.InspectGithubOrgs),
  setGithubSelection: (selection) => ipcRenderer.invoke(IpcChannel.SetGithubSelection, selection),
  getGithubRepositories: () => ipcRenderer.invoke(IpcChannel.GetGithubRepositories),
  inspectGithubRepositories: () => ipcRenderer.invoke(IpcChannel.InspectGithubRepositories),
  cloneGithubRepository: (org, name, targetPath) =>
    ipcRenderer.invoke(IpcChannel.CloneGithubRepository, org, name, targetPath),
  listMyPullRequests: (org, name) => ipcRenderer.invoke(IpcChannel.ListMyPullRequests, org, name),
  getGithubLogin: () => ipcRenderer.invoke(IpcChannel.GetGithubLogin),
  loginToGithub: (token) => ipcRenderer.invoke(IpcChannel.LoginToGithub, token),
  logoutFromGithub: () => ipcRenderer.invoke(IpcChannel.LogoutFromGithub)
}

contextBridge.exposeInMainWorld('api', api)

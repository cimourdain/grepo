// Type declaration of the `window.api` global exposed by the preload script (see ./index.ts).
import type { IpcApi } from '../shared/ipc-contract'

declare global {
  interface Window {
    api: IpcApi
  }
}

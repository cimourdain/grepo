/**
 * Saves a Settings form by itself: whenever what the user typed changes and is valid, it is sent
 * to the main process after a short pause (so typing doesn't save at each key). An invalid input
 * isn't saved: the reason is reported instead. A pending save is made when the page is left.
 *
 * What is sent is a plain copy (JSON), as a reactive proxy can't cross the IPC boundary.
 *
 * @example
 * const autoSave = useAutoSave({
 *   source: () => ({ paths: paths.value }),
 *   validate: (value) => (value.paths.length === 0 ? 'Give at least one path.' : ''),
 *   save: (value) => api.saveGeneralSettings({ localReposPaths: value.paths })
 * })
 * await load()
 * autoSave.markSaved() // what was just loaded is already saved
 */
import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

/** What the form's save is doing. */
export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'invalid' | 'error'

/** How a save answers. */
type SaveResult = { success: true } | { success: false; message: string }

/** What `useAutoSave` gives. */
export interface AutoSave {
  status: Ref<AutoSaveStatus>
  /** Why the last input wasn't saved, or what failed; empty otherwise. */
  message: Ref<string>
  /** Takes the current values as the saved ones: call it once they are loaded. */
  markSaved: () => void
  /** Saves now what is waiting for the pause to end. */
  flush: () => Promise<void>
}

/** Options of `useAutoSave`. */
export interface AutoSaveOptions<T> {
  /** The values to save (read reactively). */
  source: () => T
  /** What is wrong with the values, empty when they can be saved. */
  validate?: (value: T) => string
  /** Saves the values. */
  save: (value: T) => Promise<SaveResult>
  /** The pause after the last change before saving (ms). */
  delay?: number
}

/**
 * Makes a form save by itself.
 *
 * @param options - what to save, how to check it, and how to save it.
 */
export function useAutoSave<T>(options: AutoSaveOptions<T>): AutoSave {
  const status = ref<AutoSaveStatus>('idle')
  const message = ref('')
  /** The JSON of what is saved; `null` until the form's values are loaded. */
  let baseline: string | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  /** The JSON waiting for the pause to end. */
  let pending: string | null = null

  /** Saves what is waiting. */
  async function flush(): Promise<void> {
    clearTimeout(timer)
    const json = pending
    pending = null
    if (json === null) return
    status.value = 'saving'
    message.value = ''
    try {
      const result = await options.save(JSON.parse(json) as T)
      if (result.success) {
        baseline = json
        status.value = 'saved'
      } else {
        status.value = 'error'
        message.value = result.message
      }
    } catch {
      status.value = 'error'
      message.value = 'The settings couldn’t be saved.'
    }
  }

  watch(
    options.source,
    (value) => {
      if (baseline === null) return
      const json = JSON.stringify(value)
      clearTimeout(timer)
      pending = null
      if (json === baseline) {
        status.value = 'idle'
        message.value = ''
        return
      }
      const problem = options.validate?.(value) ?? ''
      if (problem !== '') {
        status.value = 'invalid'
        message.value = problem
        return
      }
      pending = json
      timer = setTimeout(() => void flush(), options.delay ?? 500)
    },
    { deep: true }
  )

  onBeforeUnmount(() => void flush())

  return {
    status,
    message,
    markSaved: () => {
      baseline = JSON.stringify(options.source())
      status.value = 'idle'
      message.value = ''
    },
    flush
  }
}

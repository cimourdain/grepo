import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'

import { useAutoSave, type AutoSave } from './use-auto-save'

/** Mounts a component using the composable. */
function setup(
  save: (value: {
    name: string
  }) => Promise<{ success: true } | { success: false; message: string }>
): { name: ReturnType<typeof ref<string>>; autoSave: AutoSave; unmount: () => void } {
  const name = ref('first')
  let autoSave!: AutoSave
  const wrapper = mount(
    defineComponent({
      setup() {
        autoSave = useAutoSave({
          source: () => ({ name: name.value }),
          validate: (value) => (value.name.trim() === '' ? 'the name is empty.' : ''),
          save,
          delay: 100
        })
        return () => null
      }
    })
  )
  return { name, autoSave, unmount: () => wrapper.unmount() }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useAutoSave', () => {
  it('saves a valid change after the pause, once, with a plain copy', async () => {
    const save = vi.fn().mockResolvedValue({ success: true })
    const { name, autoSave } = setup(save)
    autoSave.markSaved()
    name.value = 'se'
    await nextTick()
    name.value = 'second'
    await nextTick()
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(150)
    expect(save).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledWith({ name: 'second' })
    expect(autoSave.status.value).toBe('saved')
  })

  it('saves nothing before the values are loaded, nor for an unchanged value', async () => {
    const save = vi.fn().mockResolvedValue({ success: true })
    const { name, autoSave } = setup(save)
    name.value = 'loaded' // the load itself
    await nextTick()
    autoSave.markSaved()
    name.value = 'other'
    await nextTick()
    name.value = 'loaded' // back to what is saved
    await nextTick()
    await vi.advanceTimersByTimeAsync(500)
    expect(save).not.toHaveBeenCalled()
    expect(autoSave.status.value).toBe('idle')
  })

  it('does not save an invalid value, and says why', async () => {
    const save = vi.fn().mockResolvedValue({ success: true })
    const { name, autoSave } = setup(save)
    autoSave.markSaved()
    name.value = ' '
    await nextTick()
    await vi.advanceTimersByTimeAsync(500)
    expect(save).not.toHaveBeenCalled()
    expect(autoSave.status.value).toBe('invalid')
    expect(autoSave.message.value).toBe('the name is empty.')
    name.value = 'fine'
    await nextTick()
    await vi.advanceTimersByTimeAsync(150)
    expect(save).toHaveBeenCalledWith({ name: 'fine' })
  })

  it('reports a refused or failed save, and tries again on the next change', async () => {
    const save = vi
      .fn()
      .mockResolvedValueOnce({ success: false, message: 'refused' })
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue({ success: true })
    const { name, autoSave } = setup(save)
    autoSave.markSaved()
    name.value = 'a'
    await nextTick()
    await vi.advanceTimersByTimeAsync(150)
    expect([autoSave.status.value, autoSave.message.value]).toEqual(['error', 'refused'])
    name.value = 'b'
    await nextTick()
    await vi.advanceTimersByTimeAsync(150)
    expect(autoSave.status.value).toBe('error')
    name.value = 'c'
    await nextTick()
    await vi.advanceTimersByTimeAsync(150)
    expect(autoSave.status.value).toBe('saved')
  })

  it('saves what is waiting when the page is left', async () => {
    const save = vi.fn().mockResolvedValue({ success: true })
    const { name, autoSave, unmount } = setup(save)
    autoSave.markSaved()
    name.value = 'pending'
    await nextTick()
    unmount()
    await vi.advanceTimersByTimeAsync(0)
    expect(save).toHaveBeenCalledWith({ name: 'pending' })
  })
})

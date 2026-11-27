import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import AppSidebar from './AppSidebar.vue'

/** Mounts the sidebar at an address. */
async function sidebarAt(path: string): Promise<ReturnType<typeof mount>> {
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/repos', name: 'repos', component: stub },
      { path: '/settings/:tab?', name: 'settings', component: stub },
      { path: '/about', name: 'about', component: stub }
    ]
  })
  await router.push(path)
  const wrapper = mount(AppSidebar, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('AppSidebar', () => {
  it('lists Repos, then Settings and About at the bottom, About after Settings', async () => {
    const wrapper = await sidebarAt('/repos')
    const links = wrapper.findAll('a.sidebar-link').map((link) => link.text())
    expect(links).toEqual(['Repos', 'Settings', 'About'])
    expect(
      wrapper
        .find('.sidebar-bottom')
        .findAll('a')
        .map((a) => a.attributes('href'))
    ).toEqual(['/settings', '/about'])
    expect(wrapper.find('a[href="/about"] svg').exists()).toBe(true)
  })

  it('highlights the current entry', async () => {
    const wrapper = await sidebarAt('/about')
    expect(wrapper.find('a[href="/about"]').classes()).toContain('sidebar-link--active')
    expect(wrapper.find('a[href="/settings"]').classes()).not.toContain('sidebar-link--active')
  })
})

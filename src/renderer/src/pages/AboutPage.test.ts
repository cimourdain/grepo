import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AboutPage from './AboutPage.vue'

describe('AboutPage', () => {
  it('shows the application name and version', () => {
    const wrapper = mount(AboutPage)
    expect(wrapper.find('.about-name').text()).toBe('Grepo')
    expect(wrapper.find('.about-version').text()).toBe(`Version ${__APP_VERSION__}`)
    expect(__APP_VERSION__).toMatch(/^\d+\.\d+\.\d+/)
  })
})

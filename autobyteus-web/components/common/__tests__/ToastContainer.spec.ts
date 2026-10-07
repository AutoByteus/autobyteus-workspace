import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ToastContainer from '../ToastContainer.vue'
import { useToasts } from '~/composables/useToasts'

const webRoot = path.resolve(__dirname, '../../..')
const zIndexesIn = (source: string): number[] => [
  ...[...source.matchAll(/\bz-\[(\d+)\]/g)].map((match) => Number(match[1])),
  ...[...source.matchAll(/z-index:\s*(\d+)/g)].map((match) => Number(match[1])),
  ...[...source.matchAll(/\bz-(\d+)\b/g)].map((match) => Number(match[1])),
]
const vueFiles = (directory: string): string[] => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(directory, entry.name)
  if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name.startsWith('.') ? [] : vueFiles(full)
  return entry.name.endsWith('.vue') ? [full] : []
})

describe('ToastContainer (CR-010)', () => {
  it('renders toasts in a layer above every overlay in the app, so a notice raised from a dialog stays visible', () => {
    const toastSource = fs.readFileSync(path.join(webRoot, 'components/common/ToastContainer.vue'), 'utf8')
    const toastLayer = Math.max(...zIndexesIn(toastSource))
    const others = ['components', 'pages', 'layouts'].flatMap((dir) => vueFiles(path.join(webRoot, dir)))
      .concat(path.join(webRoot, 'app.vue'))
      .filter((file) => !file.endsWith(path.join('common', 'ToastContainer.vue')))
      .flatMap((file) => zIndexesIn(fs.readFileSync(file, 'utf8')).map((z) => ({ file: path.relative(webRoot, file), z })))

    expect(others.filter(({ z }) => z >= toastLayer)).toEqual([])
    // The Skill sources dialog (which raises such notices) is found by the scan and sits below the toasts.
    const dialogLayers = others.filter(({ file }) => file.endsWith('SkillSourcesModal.vue'))
    expect(dialogLayers.length).toBeGreaterThan(0)
    expect(dialogLayers.every(({ z }) => z < toastLayer)).toBe(true)
  })

  it('shows a toast message in that layer', async () => {
    const wrapper = mount(ToastContainer)
    useToasts().addToast('Ignored 1 skill from the Codex default folder because your own copy takes precedence.', 'info', 60000)
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="toast-container"]').classes()).toContain('z-[10000]')
    expect(wrapper.text()).toContain('Ignored 1 skill from the Codex default folder')
    wrapper.unmount()
  })
})

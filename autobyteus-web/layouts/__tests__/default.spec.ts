import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('default layout source', () => {
  it('does not render redundant current node labels in layout chrome', () => {
    const filePath = resolve(process.cwd(), 'layouts/default.vue')
    const content = readFileSync(filePath, 'utf-8')

    expect(content).not.toContain('{{ currentNodeLabel }}')
    expect(content).not.toContain('rounded-full bg-white')
  })

  it('suppresses the outer shell while application immersive presentation is active', () => {
    const filePath = resolve(process.cwd(), 'layouts/default.vue')
    const content = readFileSync(filePath, 'utf-8')

    expect(content).toContain("hostShellPresentation === 'application_immersive'")
    expect(content).toContain('v-if="!isApplicationImmersive"')
    expect(content).toContain("isApplicationImmersive.value ? 'bg-slate-950' : 'bg-blue-50'")
  })

  it('closes mobile menu on route changes via watcher', () => {
    const filePath = resolve(process.cwd(), 'layouts/default.vue')
    const content = readFileSync(filePath, 'utf-8')

    expect(content).toContain('watch(')
    expect(content).toContain('() => route.fullPath')
    expect(content).toContain('appLayoutStore.closeMobileMenu()')
  })
})

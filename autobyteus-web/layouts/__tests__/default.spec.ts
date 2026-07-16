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
    expect(content).toContain('v-if="showLeftPanelSurface"')
    expect(content).toContain('v-if="showLeftDrawerBackdrop"')
    expect(content).toContain('isStandardWorkspaceRoute.value\n      ? isLeftDocked.value || showLeftDrawer.value')
    expect(content).toContain(': isLeftPanelVisible.value || showLeftDrawer.value')
    expect(content).toContain('() => !isApplicationImmersive.value && showLeftDrawer.value')
    expect(content).toContain('isStandardWorkspaceRoute.value\n    && !isApplicationImmersive.value\n    && !showLeftDrawer.value\n    && responsiveWorkspaceShellState.value.showLeftStrip')
    expect(content).toContain(':strip-activation="responsiveWorkspaceShellState.leftPanel.stripActivation!"')
    expect(content).toContain('@request-redock="redockLeftPanel"')
    expect(content).toContain('isStandardWorkspaceRoute.value ? isLeftDocked.value : isLeftPanelVisible.value')
    expect(content).toContain("isApplicationImmersive.value ? 'bg-slate-950' : 'bg-blue-50'")
    expect(content).toContain('useResponsiveWorkspaceShell()')
    expect(content).toContain('provide(RESPONSIVE_WORKSPACE_SHELL_KEY, responsiveWorkspaceShellState)')
    expect(content).not.toContain('useAppShellResponsiveLayout')
  })

  it('route-scopes the responsive header suppression to workspace routes', () => {
    const filePath = resolve(process.cwd(), 'layouts/default.vue')
    const content = readFileSync(filePath, 'utf-8')

    expect(content).toContain("route.path === '/workspace' || route.path.startsWith('/workspace/')")
    expect(content).toContain('showResponsiveHeader')
    expect(content).toContain('responsiveWorkspaceShellState.value.showHeader')
    expect(content).toContain('!showLeftDrawer.value')
    expect(content).not.toContain('window.innerWidth')
    expect(content).not.toContain('WORKSPACE_MD_BREAKPOINT_PX')
  })

  it('keeps the dedicated mobile route outside the default layout boundary', () => {
    const mobileContent = readFileSync(resolve(process.cwd(), 'pages/mobile.vue'), 'utf-8')

    expect(mobileContent).toContain('layout: false')
    expect(mobileContent).toContain('MobileRemoteAccessShell')
  })


  it('allows the main workspace shell to shrink next to the left sidebar', () => {
    const filePath = resolve(process.cwd(), 'layouts/default.vue')
    const content = readFileSync(filePath, 'utf-8')

    expect(content).toContain('flex-1 min-w-0 overflow-hidden')
    expect(content).toContain('class="isolate flex h-screen')
    expect(content).toContain("'relative flex-1 min-w-0 overflow-hidden w-full'")
  })

  it('closes mobile menu on route changes via watcher', () => {
    const filePath = resolve(process.cwd(), 'layouts/default.vue')
    const content = readFileSync(filePath, 'utf-8')

    expect(content).toContain('watch(')
    expect(content).toContain('() => route.fullPath')
    expect(content).toContain('appLayoutStore.closeMobileMenu()')
  })

  it('gives the narrow left navigation drawer an accessible lifecycle without duplicate chrome', () => {
    const filePath = resolve(process.cwd(), 'layouts/default.vue')
    const content = readFileSync(filePath, 'utf-8')

    expect(content).toContain(":role=\"showLeftDrawer ? 'dialog' : 'navigation'\"")
    expect(content).toContain(':aria-modal="showLeftDrawer ? \'true\' : undefined"')
    expect(content).toContain(':aria-label="$t(\'shell.workspaceSurfaces.navigationDrawerTitle\')"')
    expect(content).toContain('data-test="app-left-drawer-backdrop"')
    expect(content).not.toContain('data-test="app-left-drawer-close"')
    expect(content).not.toContain('left-navigation-drawer-title')
    expect(content).toContain('useAccessibleDrawer')
  })

  it('gives the left shell and real panel a definite full-height flex scroll owner', () => {
    const layoutContent = readFileSync(resolve(process.cwd(), 'layouts/default.vue'), 'utf-8')
    const panelContent = readFileSync(resolve(process.cwd(), 'components/AppLeftPanel.vue'), 'utf-8')

    expect(layoutContent).toContain('flex h-full flex-shrink-0 flex-col')
    expect(layoutContent).toContain('class="min-h-0 flex-1 overflow-hidden"')
    expect(panelContent).toContain('class="flex h-full w-full flex-col')
    expect(panelContent).toContain('data-test="app-left-panel-run-history"')
    expect(panelContent).toContain('class="h-full overflow-y-auto"')
  })
})

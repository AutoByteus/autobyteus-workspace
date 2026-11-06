import { describe, expect, it } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { useMobileNavigation } from '../useMobileNavigation';
import { createMobileTestRouter, withSetup } from './mobileTestRouter';

const ORG = { rootSubjectKind: 'agent_org', definitionId: 'org-def', orgRunId: 'org-1', mode: 'active' };
const queryOf = (router: Awaited<ReturnType<typeof createMobileTestRouter>>) => ({ ...router.currentRoute.value.query });
/** Back through memory history (the browser's Back): it resolves when the router has moved. */
const goBack = async (router: Awaited<ReturnType<typeof createMobileTestRouter>>) => {
  await new Promise<void>((resolve) => { const stop = router.afterEach(() => { stop(); resolve(); }); router.back(); });
  await flushPromises();
};

// autobyteus-277 DS-004: the route query is the phone's screen state; this composable is its only writer.
describe('useMobileNavigation', () => {
  it('the list is the entry without a screen; opening a run pushes the run screen, and Back returns to the list', async () => {
    const router = await createMobileTestRouter();
    const { result: nav } = withSetup(router, useMobileNavigation);
    expect(nav.screen.value).toBe('list');
    await nav.openRun();
    expect(nav.screen.value).toBe('run');
    expect(queryOf(router)).toEqual({ screen: 'run' });
    await goBack(router);
    expect(nav.screen.value).toBe('list');
    expect(queryOf(router)).toEqual({});
  });

  it('opening an Org run writes its keys on the list entry too, so Back keeps the Org open (MP-003)', async () => {
    const router = await createMobileTestRouter();
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openRun({ orgQuery: ORG });
    expect(queryOf(router)).toEqual({ ...ORG, screen: 'run' });
    await goBack(router);
    expect(queryOf(router)).toEqual(ORG);
  });

  it('opening an agent run afterwards clears the Org keys from the list entry and the run entry', async () => {
    const router = await createMobileTestRouter(ORG);
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openRun();
    expect(queryOf(router)).toEqual({ screen: 'run' });
    await goBack(router);
    expect(queryOf(router)).toEqual({});
  });

  it('keeps keys it does not own (the unsupported notice) on the list entry only', async () => {
    const router = await createMobileTestRouter({ unsupported: 'desktopWorkspace' });
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openRun();
    expect(queryOf(router)).toEqual({ screen: 'run' });
    await goBack(router);
    expect(queryOf(router)).toEqual({ unsupported: 'desktopWorkspace' });
  });

  it('the system Back walks file → view → run → list; views keep the open Org\'s keys', async () => {
    const router = await createMobileTestRouter();
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openRun({ orgQuery: ORG });
    await nav.openView('files');
    expect(queryOf(router)).toEqual({ ...ORG, screen: 'files' });
    await nav.openFile({ workspaceId: 'ws-1', path: 'docs/a.md' });
    expect(nav.openFilePath.value).toBe('docs/a.md');
    expect(nav.openFileWorkspaceId.value).toBe('ws-1');
    await goBack(router); expect(nav.screen.value).toBe('files'); expect(nav.openFilePath.value).toBeNull();
    await goBack(router); expect(nav.screen.value).toBe('run');
    await goBack(router); expect(nav.screen.value).toBe('list');
  });

  it('a Messages reference is its own entry; ← closes it first', async () => {
    const router = await createMobileTestRouter();
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openRun();
    await nav.openView('messages');
    await nav.openMessageReference({ messageId: 'm-1', referenceId: 'r-1' });
    expect(nav.openReference.value).toEqual({ messageId: 'm-1', referenceId: 'r-1' });
    await nav.back(); await flushPromises();
    expect(nav.screen.value).toBe('messages');
    expect(nav.openReference.value).toBeNull();
  });

  it('← on a screen entered without an entry under it (a reload) goes to its parent screen', async () => {
    const router = await createMobileTestRouter({ ...ORG, screen: 'files', workspace: 'ws-1', file: 'a.md' });
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.back();
    expect(queryOf(router)).toEqual({ ...ORG, screen: 'files' });
    await nav.back();
    expect(queryOf(router)).toEqual({ ...ORG, screen: 'run' });
    await nav.back();
    expect(queryOf(router)).toEqual(ORG);
  });

  it('VNC Viewer full screen is its own entry: Back leaves full screen, then the view, then the run (REQ-S3-3)', async () => {
    const router = await createMobileTestRouter();
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openRun({ orgQuery: ORG });
    await nav.openView('desktop');
    expect(nav.screen.value).toBe('desktop');
    expect(nav.desktopFullScreen.value).toBe(false);
    await nav.openDesktopFullScreen();
    expect(queryOf(router)).toEqual({ ...ORG, screen: 'desktop', full: '1' });
    expect(nav.desktopFullScreen.value).toBe(true);
    await goBack(router); expect(nav.screen.value).toBe('desktop'); expect(nav.desktopFullScreen.value).toBe(false);
    await goBack(router); expect(nav.screen.value).toBe('run');
  });

  it('← in VNC Viewer full screen entered by a reload goes to the view, then the run', async () => {
    const router = await createMobileTestRouter({ ...ORG, screen: 'desktop', full: '1' });
    const { result: nav } = withSetup(router, useMobileNavigation);
    expect(nav.desktopFullScreen.value).toBe(true);
    await nav.back();
    expect(queryOf(router)).toEqual({ ...ORG, screen: 'desktop' });
    await nav.back();
    expect(queryOf(router)).toEqual({ ...ORG, screen: 'run' });
  });

  it('full=1 means nothing on another screen', async () => {
    const router = await createMobileTestRouter({ screen: 'files', full: '1' });
    const { result: nav } = withSetup(router, useMobileNavigation);
    expect(nav.desktopFullScreen.value).toBe(false);
  });

  it('toList replaces a screen whose subject is gone with the list', async () => {
    const router = await createMobileTestRouter({ screen: 'run' });
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.toList();
    expect(nav.screen.value).toBe('list');
  });

  it('Create run on New run: Back from the new run returns to the list, not to New run', async () => {
    const router = await createMobileTestRouter(ORG);
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openNewRun();
    expect(queryOf(router)).toEqual({ ...ORG, screen: 'new' });
    await nav.openRun({ replace: true });
    await flushPromises();
    expect(queryOf(router)).toEqual({ screen: 'run' });
    await goBack(router);
    expect(queryOf(router)).toEqual({});
  });
});

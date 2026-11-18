import { describe, expect, it } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { useMobileNavigation } from '../useMobileNavigation';
import { createMobileTestRouter, withSetup } from './mobileTestRouter';

const ORG = { rootSubjectKind: 'agent_org', definitionId: 'org-def', orgRunId: 'org-1', mode: 'active' };
/** An agent run's or a Team subject's run list row (autobyteus-435 DS-006). */
const ROW = 'agent:run-1';
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
    await nav.openRun({ rowKey: ROW });
    expect(nav.screen.value).toBe('run');
    expect(queryOf(router)).toEqual({ row: ROW, screen: 'run' });
    expect(nav.openRowKey.value).toBe(ROW);
    await goBack(router);
    expect(nav.screen.value).toBe('list');
    expect(queryOf(router)).toEqual({ row: ROW });
  });

  it('opening an Org run writes its keys on the list entry too, so Back keeps the Org open (MP-003)', async () => {
    const router = await createMobileTestRouter();
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openRun({ orgQuery: ORG });
    expect(queryOf(router)).toEqual({ ...ORG, screen: 'run' });
    await goBack(router);
    expect(queryOf(router)).toEqual(ORG);
  });

  it('opening an agent run afterwards replaces the Org keys by its row on the list entry and the run entry', async () => {
    const router = await createMobileTestRouter(ORG);
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openRun({ rowKey: ROW });
    expect(queryOf(router)).toEqual({ row: ROW, screen: 'run' });
    await goBack(router);
    expect(queryOf(router)).toEqual({ row: ROW });
  });

  it('opening an Org run afterwards replaces the row by the Org keys (one subject at a time)', async () => {
    const router = await createMobileTestRouter({ row: ROW });
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openRun({ orgQuery: ORG });
    expect(queryOf(router)).toEqual({ ...ORG, screen: 'run' });
    expect(nav.openRowKey.value).toBeNull();
  });

  // autobyteus-435 REQ-005, AC-005-1: every later screen of the subject carries its row, so a reload names it.
  it('the views, a file, a reference and full screen carry the row; Back to the parent of a reloaded screen keeps it', async () => {
    const router = await createMobileTestRouter();
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openRun({ rowKey: 'team:team-1/member:writer' });
    await nav.openView('desktop');
    await nav.openDesktopFullScreen();
    expect(queryOf(router)).toEqual({ row: 'team:team-1/member:writer', screen: 'desktop', full: '1' });
    await goBack(router); await goBack(router);
    await nav.openView('messages');
    await nav.openMessageReference({ messageId: 'm-1', referenceId: 'r-1' });
    expect(queryOf(router)).toEqual({ row: 'team:team-1/member:writer', screen: 'messages', message: 'm-1', reference: 'r-1' });

    const reloaded = await createMobileTestRouter({ row: ROW, screen: 'files', workspace: 'ws-1', file: 'a.md' });
    const { result: again } = withSetup(reloaded, useMobileNavigation);
    await again.back();
    expect(queryOf(reloaded)).toEqual({ row: ROW, screen: 'files' });
    await again.back();
    expect(queryOf(reloaded)).toEqual({ row: ROW, screen: 'run' });
  });

  it('keeps keys it does not own (the unsupported notice) on the list entry only', async () => {
    const router = await createMobileTestRouter({ unsupported: 'desktopWorkspace' });
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openRun({ rowKey: ROW });
    expect(queryOf(router)).toEqual({ row: ROW, screen: 'run' });
    await goBack(router);
    expect(queryOf(router)).toEqual({ unsupported: 'desktopWorkspace', row: ROW });
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

  it('a node file (autobyteus-436) opens on the Files screen by its absolute path as its own entry; Back closes it', async () => {
    const router = await createMobileTestRouter();
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openRun({ orgQuery: ORG });
    await nav.openNodeFile({ path: '/Users/normy/worktrees/x/tickets/data-contract.md' });
    expect(queryOf(router)).toEqual({ ...ORG, screen: 'files', nodeFile: '/Users/normy/worktrees/x/tickets/data-contract.md' });
    expect(nav.openNodeFilePath.value).toBe('/Users/normy/worktrees/x/tickets/data-contract.md');
    expect(nav.openFilePath.value).toBeNull();
    await goBack(router); expect(nav.screen.value).toBe('run'); expect(nav.openNodeFilePath.value).toBeNull();
  });

  it('a message\'s attached file (autobyteus-450) opens on the Files screen by its node URL path and name; Back returns', async () => {
    const router = await createMobileTestRouter();
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openRun({ orgQuery: ORG });
    const locator = '/rest/runs/run-1/context-files/ctx_ab12__photo.png';
    await nav.openContextFile({ locator, name: 'photo.png' });
    expect(queryOf(router)).toEqual({ ...ORG, screen: 'files', contextFile: locator, contextFileName: 'photo.png' });
    expect(nav.openContextFileEntry.value).toEqual({ locator, name: 'photo.png' });
    expect(nav.openNodeFilePath.value).toBeNull();
    expect(nav.openFilePath.value).toBeNull();
    await goBack(router); expect(nav.screen.value).toBe('run'); expect(nav.openContextFileEntry.value).toBeNull();
  });

  it('← on an attached file entered without an entry under it (a reload) goes to the Files screen', async () => {
    const router = await createMobileTestRouter({ screen: 'files', contextFile: '/rest/runs/r/context-files/a.png', contextFileName: 'a.png' });
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.back();
    expect(queryOf(router)).toEqual({ screen: 'files' });
  });

  it('← on a node file entered without an entry under it (a reload) goes to the Files screen', async () => {
    const router = await createMobileTestRouter({ screen: 'files', nodeFile: '/tmp/a.md' });
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.back();
    expect(queryOf(router)).toEqual({ screen: 'files' });
  });

  it('a Messages reference is its own entry; ← closes it first', async () => {
    const router = await createMobileTestRouter();
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openRun({ rowKey: ROW });
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

  it('Create run on New run: the route names the new run\'s row; Back from it returns to the list, not to New run (AC-005-6)', async () => {
    const router = await createMobileTestRouter(ORG);
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openNewRun();
    expect(queryOf(router)).toEqual({ ...ORG, screen: 'new' });
    await nav.openRun({ replace: true, rowKey: 'agent:new-run' });
    await flushPromises();
    expect(queryOf(router)).toEqual({ row: 'agent:new-run', screen: 'run' });
    await goBack(router);
    expect(queryOf(router)).toEqual({ row: 'agent:new-run' });
  });

  it('Create run on a New run entered by a reload (no entry under it): the route names the new run\'s row', async () => {
    const router = await createMobileTestRouter({ screen: 'new' });
    const { result: nav } = withSetup(router, useMobileNavigation);
    await nav.openRun({ replace: true, rowKey: 'agent:new-run' });
    expect(queryOf(router)).toEqual({ row: 'agent:new-run', screen: 'run' });
  });
});

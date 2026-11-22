// The phone's Activity rows and their details (autobyteus-590). Cases of `pnpm -C autobyteus-web test:e2e:mobile-shell`,
// run by `mobile-shell-probe.mjs` after the background-task cases (`--cases=MSP-94,MSP-95,MSP-96` runs only these).
//
// MSP-94 runs on its own node whose scripted AGY CLI streams one turn of real AGY 1.2.14 tool steps (`mcp_calls`), and its
// own paired phone (production bundle, 390x844): `view_file` (its `AbsolutePath`), `delegate_task` to /researcher, a
// call with no summarizable argument, one with a JSON result, one that fails (`always_fails`),
// `open_tab` and `list_tabs`: 13 rows, a list that scrolls (a call to another MCP server is named `mcp__<server>__<tool>`).
//   - AC-001 each row shows its name and the shared summary ("→ /researcher", the file, the URL), never the name twice;
//     a call with nothing to summarize shows its name once and no summary line;
//   - AC-002 a success is its check icon only (named "Success"), the failure its icon and "Failed", with an excerpt;
//   - AC-003, AC-004 the failed row opens its details with its Arguments and full Error; a JSON result's with its Result;
//     Back returns to the list at the same scroll position; nothing is wider than the screen;
//   - a second phone in Chinese (zh-CN): the details' section titles read 参数 / 结果 / 错误.
// MSP-95 runs on its own node (scripted AGY, `auto_compaction`: the second turn compacts) and its own paired phone:
//   - AC-004 the compaction row opens its details: its status and rows.
// MSP-96 runs on alpha (scripted AGY, `linked_skills`) and the probe's paired phone:
//   - AC-005 a background task whose command is long shows it in full on tap (aria-expanded); its `run_command` row's
//     summary is the command (AGY's `CommandLine`);
//   - AC-003 a running call (HOLD_TURN) updates live while its details are open: the run is stopped, Running becomes
//     Stopped with its stop icon (autobyteus-609 AC-D).
// MSP-97 runs on its own node (scripted AGY, `native_arguments`: one turn of Antigravity's own tools with their PascalCase
// arguments, as `agy-native-arguments-turn.mjs` records them) and its own paired phone:
//   - AC-001 an Antigravity file tool's row shows its file: `write_to_file` and `replace_file_content` (`TargetFile`) as
//     `view_file` (`AbsolutePath`) does; `run_command` (`CommandLine`) shows its command; no row shows its name twice.
//     `grep_search` shows its query (`Query`), `find_by_name` its pattern (`Pattern`), `list_dir` its folder (`DirectoryPath`).
// The scripted AGY CLI does not stream tool logs (only the Codex and native runtimes send TOOL_LOG), so a Logs section and
// its growth while open are covered by the web unit tests (MobileActivityDetail.spec), not here.
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { ownerSocketUrl } from './fixtures/probe-node-access.mjs';

const PHONE_HOST = '192.168.77.50';
const MODEL = 'gemini-3.8-flash-low';
/** The error the scripted CLI's `always_fails` step reports (agy-failure-cli.mjs, `mcp_calls`). */
const FIXTURE_ERROR = 'PROBE-FAILURE-9920: deliberate failure';
const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null };

/**
 * @param probe `runCase`, `page` (the paired phone), `stack`, `alpha`, `sel`, `toList`, `openRow`, `menuOpen`, `shot`,
 *   `waitFor`, `sleep`, `assert`, `serverAt`, `freePort`, `chromium`, `executablePath`, `selected`, `root` (the probe's
 *   folder: a node named N has its HOME at `<root>/N/home`).
 */
export const runActivityDetailsCases = async (probe) => {
  const { runCase, page, stack, alpha, sel, toList, openRow, menuOpen, shot, waitFor, sleep, assert, serverAt, freePort, chromium, executablePath, selected, root } = probe;
  const wants = (id) => !selected || selected.has(id);

  /** What the Activity list shows: each row's name, summary, status (its word, or its icon's name) and error excerpt. */
  const activityRows = (target) => target.evaluate(() => [...document.querySelectorAll('[data-testid="mobile-activity"] [data-testid="mobile-run-activity-row"]')].map((row) => {
    const status = row.querySelector('[data-testid="mobile-run-activity-status"]');
    return {
      text: row.textContent.replace(/\s+/g, ' ').trim(),
      name: row.querySelector('[data-testid="mobile-run-activity-name"]')?.textContent.trim() ?? null,
      summary: row.querySelector('[data-testid="mobile-run-activity-summary"]')?.textContent.trim() ?? null,
      summaryTitle: row.querySelector('[data-testid="mobile-run-activity-summary"]')?.getAttribute('title') ?? null,
      status: row.getAttribute('data-status'),
      statusWord: status?.textContent.trim() ?? '',
      statusLabel: status?.getAttribute('aria-label') ?? null,
      error: row.querySelector('[data-testid="mobile-run-activity-error"]')?.textContent.trim() ?? null,
      height: row.getBoundingClientRect().height,
    };
  }));
  /** What the open detail screen shows. */
  const detailNow = (target) => target.evaluate(() => {
    const el = document.querySelector('[data-testid="mobile-activity-detail"]');
    if (!el) return null;
    const text = (id) => el.querySelector(`[data-testid="${id}"]`)?.textContent ?? null;
    const sections = [...el.querySelectorAll('section[data-testid^="mobile-activity-detail-"]')].map((section) => ({
      key: section.getAttribute('data-testid').replace('mobile-activity-detail-', ''),
      title: section.querySelector('button')?.textContent.trim() ?? null,
      open: section.querySelector('button')?.getAttribute('aria-expanded') === 'true',
      text: section.querySelector('pre')?.textContent ?? null,
    }));
    const body = el.querySelector('[data-testid="mobile-activity-detail-body"]');
    return { title: text('mobile-screen-title')?.trim() ?? null, status: text('mobile-activity-detail-status')?.trim() ?? null,
      summary: text('mobile-activity-detail-summary'), sections, rows: text('mobile-activity-detail-rows')?.replace(/\s+/g, ' ').trim() ?? null,
      // Nothing wider than the screen: the body never scrolls sideways.
      overflowX: body ? body.scrollWidth - body.clientWidth : null };
  });
  const listScroller = (target) => target.locator('[data-testid="mobile-activity"] > div.overflow-y-auto');
  const rowNamed = (target, name) => target.locator('[data-testid="mobile-activity"] [data-testid="mobile-run-activity-row"]').filter({ hasText: name });
  /** Taps a row, waits for its details, reads them, then Back. */
  const openDetails = async (target, row, label, settled = () => true, caseId = 'MSP-94') => {
    await row.scrollIntoViewIfNeeded();
    await row.tap();
    await target.locator('[data-testid="mobile-activity-detail"]').waitFor({ timeout: 15_000 });
    let shown = null;
    await waitFor(`${label} details`, async () => Boolean((shown = await detailNow(target)) && settled(shown)), 15_000).catch(() => undefined);
    await shot(target, `${caseId}-${label}`);
    return shown;
  };
  const back = async (target) => {
    await target.goBack();
    await waitFor('back to the Activity list', async () => (await target.locator('[data-testid="mobile-activity-detail"]').count()) === 0, 10_000);
  };

  /**
   * A node of its own (its scripted AGY CLI in `agyCase`) with one agent run that has had `messages` (each answered), and
   * phones paired to it (one per locale); `use` gets them; everything is stopped after. `options.launch(node)` gives the
   * run's launch instead of the scripted AGY, `options.toolNames` and `options.instructions` the agent's.
   */
  const withNodeAndPhones = async (name, agyCase, extraEnv, messages, locales, use, options = {}) => {
    const node = await serverAt(name, await freePort(), { AGY_FAKE_CASE: agyCase, ...extraEnv });
    const phoneOrigin = `http://${PHONE_HOST}:${node.port}`;
    const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
    try {
      const launch = options.launch ? await options.launch(node) : agy;
      const definition = (await node.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Activity Probe', role: 'assistant',
        description: 'Activity details (phone probe)', instructions: options.instructions ?? 'Follow the request.', toolNames: options.toolNames ?? [], defaultLaunchConfig: launch } })).createAgentDefinition.id;
      const workspace = path.join(node.dataDir, '..', 'workspace');
      await fs.mkdir(workspace, { recursive: true });
      const created = (await node.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: definition, workspaceRootPath: workspace, autoExecuteTools: true, ...launch } })).createAgentRun;
      assert(created.success, created.message);
      const run = created.runId;
      const projection = async () => (await node.gql('query($id:String!){getRunProjection(runId:$id){conversation activities}}', { id: run })).getRunProjection ?? {};
      const say = async (content) => {
        const socket = new WebSocket(ownerSocketUrl(`${node.baseUrl.replace(/^http/, 'ws')}/ws/agent/${run}`));
        await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
        await sleep(300);
        socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:probe:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: run, content } }));
        await sleep(600);
        socket.close();
      };
      for (const [content, reply] of messages) {
        await say(content);
        await waitFor(`${name}: the reply ${reply}`, async () => JSON.stringify(await projection()).includes(reply), options.replyTimeoutMs ?? 60_000);
      }
      const settings = await node.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
      assert(settings.status === 200, `${name} Phone Access on`, settings);
      const phones = [];
      for (const locale of locales) {
        const pairing = await node.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: `${name} test node`, trustedPrivateHttpAcknowledged: true });
        assert(pairing.status === 201 && pairing.body.mobileUrl, `${name} pairing session`, pairing.status);
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale, timezoneId: 'UTC' });
        if (locale !== 'en-US') await context.addInitScript((mode) => localStorage.setItem('autobyteus.localization.preference-mode', mode), locale);
        const phone = await context.newPage();
        await phone.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await phone.locator(sel('mobile-pair-button')).click({ timeout: 60_000 });
        await phone.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
        await openRow(phone, `agent:${run}`);
        await menuOpen(phone, 'activity');
        await phone.locator(sel('mobile-activity')).waitFor({ timeout: 20_000 });
        phones.push(phone);
      }
      return await use({ node, run, workspace, projection, phones, say });
    } finally {
      await browser.close().catch(() => undefined);
      await node.stop();
    }
  };

  if (wants('MSP-94')) await runCase('MSP-94', async () => withNodeAndPhones('iota', 'mcp_calls', {}, [['Run the calls.', 'MCP_DONE']], ['en-US', 'zh-CN'], async ({ run, phones: [phone, zh] }) => {
    await waitFor('the calls listed', async () => (await activityRows(phone)).length >= 13, 30_000).catch(() => undefined);
    await listScroller(phone).evaluate((el) => { el.scrollTop = 0; });
    const rows = await activityRows(phone);
    await shot(phone, 'MSP-94-activity-rows');
    // A call to another MCP server is named `mcp__<server>__<tool>`.
    const named = (name) => rows.filter((row) => row.name === name || row.name?.endsWith(`__${name}`));
    const failed = named('always_fails')[0];
    const delegated = named('delegate_task')[0];
    const viewed = named('view_file')[0];
    const json = named('json_result')[0];
    const tabs = named('open_tab');

    // Back keeps the list where it was: scroll to the end, open the last row, Back.
    await listScroller(phone).evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await sleep(300);
    const scrollBefore = await listScroller(phone).evaluate((el) => ({ top: el.scrollTop, height: el.scrollHeight, client: el.clientHeight }));
    const lastRow = phone.locator('[data-testid="mobile-activity"] [data-testid="mobile-run-activity-row"]').last();
    const lastBox = await lastRow.boundingBox();
    await phone.touchscreen.tap(lastBox.x + 40, lastBox.y + Math.min(20, lastBox.height / 2));
    await phone.locator('[data-testid="mobile-activity-detail"]').waitFor({ timeout: 15_000 });
    await back(phone);
    await sleep(300);
    const scrollAfter = await listScroller(phone).evaluate((el) => el.scrollTop);

    const failedDetails = await openDetails(phone, rowNamed(phone, 'always_fails').first(), 'failed-details', (shown) => shown.sections.some((s) => s.key === 'error'));
    await back(phone);
    const jsonDetails = await openDetails(phone, rowNamed(phone, 'json_result').first(), 'json-result-details', (shown) => shown.sections.some((s) => s.key === 'result'));
    await back(phone);

    await waitFor('the failed call on the Chinese phone', async () => (await rowNamed(zh, 'always_fails').count()) > 0, 20_000);
    const zhFailed = await openDetails(zh, rowNamed(zh, 'always_fails').first(), 'zh-CN-failed-details', (shown) => shown.sections.length >= 2);
    await back(zh);
    const zhJson = await openDetails(zh, rowNamed(zh, 'json_result').first(), 'zh-CN-json-details', (shown) => shown.sections.some((s) => s.key === 'result'));

    const details = { run, rows: rows.map(({ height, ...row }) => ({ ...row, height: Math.round(height) })), scrollBefore, scrollAfter,
      failedDetails, jsonDetails, zh: { failed: zhFailed, json: zhJson } };
    const twice = rows.filter((row) => row.name && row.text.split(row.name).length > 2);
    const failures = [
      [delegated?.summary === '→ /researcher', 'AC-001 an agent tool\'s row says whom it addresses'],
      [Boolean(viewed?.summary) && viewed.summaryTitle?.endsWith('delegate_task.json') && !viewed.summary.includes('/agy/mcp/autobyteus_agent_tools/'), 'AC-001 a file call shows its file (compact; the full path in its title)'],
      [tabs.length > 0 && tabs.every((row) => row.summary === 'about:blank'), 'AC-001 a call with a URL shows it'],
      [json?.summary === null && named('list_tabs').every((row) => row.summary === null), 'AC-001 a call with nothing to summarize shows its name once and no summary line'],
      [twice.length === 0, 'AC-001 no row shows the tool name twice'],
      [rows.filter((row) => row.status === 'success').every((row) => row.statusLabel === 'Success' && row.statusWord === '') && rows.some((row) => row.status === 'success'),
        'AC-002 a success shows only its check icon, named "Success"'],
      [failed?.status === 'error' && failed.statusWord === 'Failed' && failed.error === FIXTURE_ERROR, 'AC-002, REQ-006 the failure shows its icon, "Failed" and an excerpt of its error'],
      [rows.every((row) => row.height >= 44), 'every row is at least 44 px high'],
      [scrollBefore.height > scrollBefore.client && scrollBefore.top > 0 && Math.abs(scrollAfter - scrollBefore.top) <= 2, 'AC-003 Back returns to the list at the same scroll position'],
      [failedDetails?.status === 'Failed' && failedDetails.sections.some((s) => s.key === 'arguments' && s.text.includes('"reason": "probe"'))
        && failedDetails.sections.some((s) => s.key === 'error' && s.open && s.text === FIXTURE_ERROR) && failedDetails.overflowX <= 0,
        'AC-003, AC-004 the failed call\'s details: its status word, Arguments and full Error, nothing wider than the screen'],
      [jsonDetails?.status === 'Success' && jsonDetails.sections.some((s) => s.key === 'result' && s.text.includes('JSON-MARKER-4471')), 'AC-003 a call\'s details show its Result'],
      [zhFailed?.sections.some((s) => s.title === '参数') && zhFailed.sections.some((s) => s.title === '错误') && zhJson?.sections.some((s) => s.title === '结果'),
        'zh-CN: the details\' section titles read 参数, 结果 and 错误'],
    ].filter(([ok]) => !ok).map(([, text]) => text);
    assert(failures.length === 0, failures.join('; '), details);
    return details;
  }));

  if (wants('MSP-95')) await runCase('MSP-95', async () => withNodeAndPhones('theta', 'auto_compaction', {}, [['First turn.', 'BEFORE_COMPACTION_REPLY'], ['Second turn.', 'AFTER_COMPACTION_REPLY']], ['en-US'], async ({ run, phones: [phone] }) => {
    const compactionRow = rowNamed(phone, 'Memory compaction').first();
    await waitFor('the compaction row', async () => (await compactionRow.count()) > 0, 30_000);
    const rows = await activityRows(phone);
    await shot(phone, 'MSP-95-activity');
    const shown = await openDetails(phone, compactionRow, 'compaction-details', (detail) => Boolean(detail.status), 'MSP-95');
    await back(phone);
    const details = { run, rows: rows.map(({ height, ...row }) => row), shown };
    assert(shown?.title === 'Memory compaction' && Boolean(shown.status) && Boolean(shown.rows), 'AC-004 a compaction row opens its details: its status and rows', details);
    return details;
  }));

  if (wants('MSP-96')) await runCase('MSP-96', async () => {
    const created = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: stack.ids.checker, ...stack.runConfig } })).createAgentRun;
    assert(created.success, created.message);
    const run = created.runId;
    const label = 'pnpm --filter autobyteus-web exec vitest run components/mobile/views/__tests__/MobileActivityDetail.spec.ts --reporter=verbose --coverage';
    await stack.agentSay(run, `BG-590 BACKGROUND_STEP:${JSON.stringify({ seconds: 4, exitCode: 1, label })}`);
    await waitFor('the background step started', async () => (await stack.projection(run)).includes('STARTED'), 60_000);
    await toList(page);
    await waitFor('the run in the phone list', async () => (await page.locator(sel(`mobile-run-row-agent:${run}`)).count()) > 0, 30_000);
    await openRow(page, `agent:${run}`);
    await menuOpen(page, 'activity');
    await page.locator(sel('mobile-activity')).waitFor({ timeout: 20_000 });
    await waitFor('the background task ended', async () => (await page.locator('[data-testid="mobile-background-task"][data-status="failed"]').count()) > 0, 30_000).catch(() => undefined);
    const commandRow = (await activityRows(page)).find((row) => row.name === 'run_command') ?? null;

    // A background task's full command on tap.
    const taskToggle = page.locator('[data-testid="mobile-background-task-toggle"]').first();
    // AGY's task title is its command (no separate command line): the title is what unfolds.
    const titleNow = () => page.locator('[data-testid="mobile-background-task-title"]').first()
      .evaluate((el) => ({ clamped: el.scrollHeight > el.clientHeight + 1, text: el.textContent.trim(), height: Math.round(el.getBoundingClientRect().height) }));
    const titleBefore = await titleNow();
    await shot(page, 'MSP-96-background-task');
    await taskToggle.tap();
    const expanded = await taskToggle.getAttribute('aria-expanded');
    const titleAfter = await titleNow();
    await shot(page, 'MSP-96-background-task-expanded');

    // A running call's details update live: HOLD_TURN leaves a run_command step running; the run is stopped while open.
    await stack.agentSay(run, 'HOLD_TURN');
    const running = page.locator('[data-testid="mobile-activity"] [data-testid="mobile-run-activity-row"][data-status="executing"], [data-testid="mobile-activity"] [data-testid="mobile-run-activity-row"][data-status="parsing"]').first();
    await waitFor('the running call listed', async () => (await running.count()) > 0, 30_000);
    const runningShown = await openDetails(page, running, 'running-details', (shown) => shown.status === 'Running', 'MSP-96');
    const stopped = (await alpha.gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: run })).terminateAgentRun;
    let liveShown = null;
    await waitFor('the open details change with the call', async () => ((liveShown = await detailNow(page))?.status ?? 'Running') !== 'Running', 30_000).catch(() => undefined);
    await shot(page, 'MSP-96-running-details-after-stop');
    await back(page);

    const details = { run, label, commandRow, titleBefore, expanded, titleAfter, running: { runningShown, stopped, liveShown } };
    const failures = [
      [Boolean(commandRow?.summary) && commandRow.summary.startsWith('sleep 4 # background step') && commandRow.summary.includes('MobileActivityDetail'), 'AC-001 an Antigravity run_command row shows its command (CommandLine)'],
      [titleBefore.clamped && expanded === 'true' && !titleAfter.clamped && titleAfter.text.includes(label) && titleAfter.height > titleBefore.height,
        'AC-005 a background task whose command is long shows it in full on tap (clamped before, unclamped after)'],
      [runningShown?.status === 'Running' && stopped?.success === true && liveShown?.status === 'Stopped', 'AC-003 the details of a running call update live while open: Running, then Stopped (autobyteus-609 AC-D)'],
    ].filter(([ok]) => !ok).map(([, text]) => text);
    assert(failures.length === 0, failures.join('; '), details);
    return details;
  });

  // Antigravity's own tools (`native_arguments`): the node's HOME and the run's workspace are the ones the fixture requires.
  if (wants('MSP-97')) await runCase('MSP-97', async () => withNodeAndPhones('kappa', 'native_arguments',
    { AGY_FAKE_ARGUMENT_HOME: path.join(root, 'kappa', 'home'), AGY_FAKE_ARGUMENT_WORKSPACE: path.join(root, 'kappa', 'workspace') },
    [['Use the native tools.', 'NATIVE_ARGUMENTS_DONE']], ['en-US'], async ({ run, workspace, phones: [phone] }) => {
      await waitFor('the native calls listed', async () => (await activityRows(phone)).length >= 9, 30_000).catch(() => undefined);
      await listScroller(phone).evaluate((el) => { el.scrollTop = 0; });
      const rows = (await activityRows(phone)).map(({ height, ...row }) => row);
      await shot(phone, 'MSP-97-native-tool-rows');
      const named = (name) => rows.filter((row) => row.name === name);
      const marker = path.join(workspace, 'marker.txt');
      const showsFile = (row) => Boolean(row?.summary) && row.summaryTitle === marker;
      const details = { run, workspace, rows };
      const twice = rows.filter((row) => row.name && row.text.split(row.name).length > 2);
      const failures = [
        [named('view_file').length === 1 && showsFile(named('view_file')[0]), 'AC-001 an Antigravity view_file row shows its file (AbsolutePath)'],
        [named('write_to_file').length === 1 && showsFile(named('write_to_file')[0]), 'AC-001 an Antigravity write_to_file row shows its file (TargetFile)'],
        [named('replace_file_content').length === 2 && named('replace_file_content').every(showsFile), 'AC-001 an Antigravity replace_file_content row shows its file (TargetFile)'],
        [named('run_command').some((row) => row.summary === 'printf NATIVE_ARGUMENTS_PREFIX_VERIFIED'), 'AC-001 an Antigravity run_command row shows its command (CommandLine)'],
        [named('grep_search').length === 1 && named('grep_search')[0].summary === 'AFTER', 'AC-001 an Antigravity grep_search row shows its query (Query)'],
        [named('find_by_name').length === 1 && named('find_by_name')[0].summary === '*.txt', 'AC-001 an Antigravity find_by_name row shows its pattern (Pattern)'],
        [named('list_dir').length === 1 && named('list_dir')[0].summaryTitle === workspace, 'AC-001 an Antigravity list_dir row shows its folder (DirectoryPath)'],
        [twice.length === 0, 'AC-001 no row shows the tool name twice'],
      ].filter(([ok]) => !ok).map(([, text]) => text);
      assert(failures.length === 0, failures.join('; '), details);
      return details;
    }));

  // A running call's Logs grow while its details are open (AC-003). The native runtime logs `[TOOL_CALL]` when a call starts
  // and `[TOOL_RESULT]` when it ends; a real model drives it, so the case is gated: RUN_MOBILE_SHELL_LIVE_TOOL_LOGS=1 with the
  // test vault (AUTOBYTEUS_TEST_VAULT, `provider.openai.api-key`; TESTING.md#test-vault). Only its node reads the vault.
  const liveToolLogs = process.env.RUN_MOBILE_SHELL_LIVE_TOOL_LOGS === '1' && Boolean(process.env.AUTOBYTEUS_TEST_VAULT);
  if (wants('MSP-98') && !liveToolLogs) console.log('[mobile-shell] MSP-98 skipped: set RUN_MOBILE_SHELL_LIVE_TOOL_LOGS=1 and AUTOBYTEUS_TEST_VAULT (a real model)');
  if (wants('MSP-98') && liveToolLogs) await runCase('MSP-98', async () => {
    const model = process.env.MOBILE_SHELL_LIVE_OPENAI_MODEL?.trim() || 'gpt-5.4-mini';
    const command = 'for i in 1 2 3 4 5 6 7 8 9 10; do echo tick $i; sleep 1; done; echo LOGS-590-DONE';
    const launch = async (node) => {
      const models = (await node.gql('mutation($p:String!,$r:String){ensureProviderModelCatalog(providerId:$p,runtimeKind:$r){llmModels{modelIdentifier value}}}', { p: 'OPENAI', r: 'autobyteus' }))
        .ensureProviderModelCatalog.llmModels;
      const found = models.find((entry) => entry.value === model) ?? models.find((entry) => entry.modelIdentifier === model);
      assert(found, `OPENAI model ${model} in the catalog (test vault key provider.openai.api-key)`, models.map((entry) => entry.value));
      return { runtimeKind: 'autobyteus', llmModelIdentifier: found.modelIdentifier, llmConfig: null };
    };
    return withNodeAndPhones('lambda', 'linked_skills', { AUTOBYTEUS_TEST_VAULT: process.env.AUTOBYTEUS_TEST_VAULT }, [['Reply with one word: the word ready, in capital letters.', 'READY']], ['en-US'],
      async ({ run, say, phones: [phone] }) => {
        await say(`Run this exact command once with run_bash, in the foreground (not in the background), then reply with the single word FINISHED: ${command}`);
        const running = phone.locator('[data-testid="mobile-activity"] [data-testid="mobile-run-activity-row"][data-status="executing"]').filter({ hasText: 'run_bash' }).first();
        await waitFor('the running run_bash call listed', async () => (await running.count()) > 0, 120_000);
        const logsOf = (shown) => shown?.sections.find((section) => section.key === 'logs')?.text?.split('\n').filter(Boolean) ?? [];
        const runningShown = await openDetails(phone, running, 'live-logs-running', (shown) => shown.status === 'Running' && logsOf(shown).length > 0, 'MSP-98');
        const linesWhileRunning = logsOf(runningShown);
        let liveShown = null;
        await waitFor('the open details show the call\'s end and its result log', async () => {
          liveShown = await detailNow(phone);
          return liveShown?.status !== 'Running' && logsOf(liveShown).some((line) => line.includes('[TOOL_RESULT]'));
        }, 90_000).catch(() => undefined);
        await shot(phone, 'MSP-98-live-logs-ended');
        const linesAfter = logsOf(liveShown);
        await back(phone);
        const details = { run, model, runningStatus: runningShown?.status ?? null, linesWhileRunning, endStatus: liveShown?.status ?? null, linesAfter,
          summary: liveShown?.summary ?? null, sections: liveShown?.sections.map((section) => section.key) ?? [] };
        const failures = [
          [runningShown?.status === 'Running' && linesWhileRunning.some((line) => line.includes('[TOOL_CALL]')) && !linesWhileRunning.some((line) => line.includes('[TOOL_RESULT]')),
            'the running call\'s details show its Logs so far ([TOOL_CALL], no result yet)'],
          [liveShown?.status === 'Success' && linesAfter.length > linesWhileRunning.length && linesAfter.some((line) => line.startsWith('[TOOL_RESULT]')) && linesAfter.some((line) => line.trim() === 'LOGS-590-DONE'),
            'AC-003 a running tool\'s Logs grow while its details are open (the result log arrives; the status changes to Success)'],
          [details.summary?.includes('LOGS-590-DONE') && details.sections.includes('arguments') && details.sections.includes('result'), 'the ended call\'s details show its command, Arguments and Result'],
        ].filter(([ok]) => !ok).map(([, text]) => text);
        assert(failures.length === 0, failures.join('; '), details);
        return details;
      }, { launch, toolNames: ['run_bash'], instructions: 'You are a careful assistant. Use run_bash for shell commands. Keep replies short.', replyTimeoutMs: 180_000 });
  });
};

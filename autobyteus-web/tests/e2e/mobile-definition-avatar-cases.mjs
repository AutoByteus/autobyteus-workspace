// A peer node's run shows the fallback avatar (autobyteus-669 REQ-004, DEC-006), on the phone and the desktop. A case of
// `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` (`--cases=MSP-121` runs only it), with the
// probe's own peer: alpha's Project Task Manager delegated to beta's Publisher (`stack.remoteAgentRun`).
//
//   MSP-121 REQ-004, DEC-006  The same package installed on both nodes gives both a definition of one ID: alpha gets a
//                   "Publisher" definition with beta's Publisher's ID and a picture (`avatar.png`, synthetic), and beta's
//                   Publisher gets one too. alpha's definition has its package-picture address, yet the PTM's row of the
//                   peer run (beta's Publisher) shows the fallback (initials), on the phone's run list and in the desktop
//                   Workspaces tree: this node neither vouches for nor serves another node's picture.
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

/** A synthetic `size`×`size` PNG of one colour (never a person). */
const png = ([r, g, b], size = 64) => {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 2;
  const row = Buffer.alloc(1 + size * 3); for (let x = 0; x < size; x += 1) { row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b; }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(Array.from({ length: size }, () => row)))), chunk('IEND', Buffer.alloc(0))]);
};

/**
 * @param probe `runCase`, `page` (the paired phone), `stack`, `alpha`, `beta`, `toList`, `openRow`, `rowsOf`, `shot`,
 *   `waitFor`, `sleep`, `assert`, `selected`, `browser` (desktop), `desktopRunsView`.
 */
export const runDefinitionAvatarPeerCases = async (probe) => {
  const { runCase, page, stack, alpha, beta, toList, openRow, rowsOf, shot, waitFor, sleep, assert, selected, browser, desktopRunsView } = probe;
  if (selected && !selected.has('MSP-121')) return;
  await runCase('MSP-121', async () => {
    const publisher = (await beta.gql('query{agentDefinitions{id name}}')).agentDefinitions.find((d) => d.name === 'Publisher');
    assert(publisher, 'beta\'s Publisher');
    // alpha: the same definition ID (the same package on both nodes), with a picture; beta's Publisher gets one too.
    const alphaHas = (await alpha.gql('query{agentDefinitions{id}}')).agentDefinitions.some((d) => d.id === publisher.id);
    if (!alphaHas) {
      const created = (await alpha.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
        { i: { name: 'Publisher', role: 'assistant', description: 'Publisher (MSP-121: the same ID as beta\'s)', instructions: 'Follow the request.', toolNames: [] } })).createAgentDefinition.id;
      assert(created === publisher.id, 'alpha\'s Publisher has beta\'s Publisher\'s ID', { created, peer: publisher.id });
    }
    const folders = [alpha, beta].map((node) => path.join(node.dataDir, 'agents', publisher.id));
    for (const folder of folders) assert(await fs.stat(path.join(folder, 'agent.md')).then(() => true, () => false), 'the definition folder', { folder: path.basename(folder) });
    await fs.writeFile(path.join(folders[0], 'avatar.png'), png([30, 58, 138]));
    await fs.writeFile(path.join(folders[1], 'avatar.png'), png([202, 138, 4]));
    let alphaPublisher = null;
    const read = async () => Boolean((alphaPublisher = (await alpha.gql('query{agentDefinitions{id avatarUrl}}')).agentDefinitions.find((d) => d.id === publisher.id))?.avatarUrl);
    let pickedUpBy = 'the folder watcher';
    await waitFor('alpha\'s Publisher has its picture', read, 15_000).catch(() => undefined);
    if (!alphaPublisher?.avatarUrl) {
      // The user's own definitions' folders may not be watched: a save re-reads the definition.
      pickedUpBy = 'a save';
      await alpha.gql('mutation($i:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$i){id}}', { i: { id: publisher.id, description: 'Publisher (MSP-121: the same ID as beta\'s, saved)' } });
      await waitFor('alpha\'s Publisher has its picture after a save', read, 15_000).catch(() => undefined);
    }
    assert((alphaPublisher?.avatarUrl ?? '').startsWith(`/rest/definition-avatars/agent/${encodeURIComponent(publisher.id)}`), 'alpha\'s same-ID definition has its package picture', alphaPublisher);

    // The phone: the PTM's rows, its peer row (beta's Publisher run).
    const ptmKey = `agent:${stack.ptm}`;
    await toList(page);
    await openRow(page, ptmKey);
    await page.locator('[data-testid="mobile-run-back"]').first().click().catch(() => undefined);
    await sleep(1_500);
    let peerRow = null;
    await waitFor('the peer row', async () => Boolean(peerRow = (await rowsOf(page)).find((entry) => entry.key.endsWith(stack.remoteAgentRun))), 30_000);
    const phoneAvatar = await page.locator(`[data-testid="mobile-run-row-${peerRow.key}"] [data-test="definition-avatar"]`).first()
      .evaluate((n) => ({ state: n.getAttribute('data-avatar-state'), kind: n.getAttribute('data-avatar-kind'), src: n.querySelector('img')?.getAttribute('src') ?? null }));
    await shot(page, 'MSP-121-phone-peer-row-fallback');

    // The desktop: the Workspaces tree, the PTM's delegated peer row.
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const { attachToBrowserContext } = await import('./fixtures/probe-node-access.mjs');
    await attachToBrowserContext(context);
    const desk = await context.newPage();
    let deskAvatar = null;
    try {
      await desk.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
      await desktopRunsView(desk);
      // Unfold every row, as MSP-02 does, so the PTM's delegated rows show.
      const older = desk.locator('[data-test="run-list-show-older"]');
      if (await older.count() && (await older.innerText()).startsWith('Show older')) await older.click();
      for (let round = 0; round < 6; round += 1) {
        for (const handle of await desk.locator('[data-test="run-list-scroll"] [aria-expanded="false"]').all()) await handle.click({ timeout: 1_500 }).catch(() => undefined);
        await sleep(700);
      }
      const readDesk = () => desk.evaluate(({ runId, title }) => {
        const of = (row) => {
          const avatar = row?.querySelector('[data-avatar-state]');
          return avatar ? { state: avatar.getAttribute('data-avatar-state'), kind: avatar.getAttribute('data-avatar-kind'), src: avatar.querySelector('img')?.getAttribute('src') ?? avatar.getAttribute('src') ?? null,
            text: row.innerText.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 3) } : null;
        };
        const byId = document.querySelector(`[data-test="run-list-scroll"] [data-agent-run-id="${runId}"]`);
        const byTitle = [...document.querySelectorAll('[data-test="run-list-scroll"] [data-agent-run-id], [data-test="run-list-scroll"] [data-test="run-list-row"]')]
          .filter((row) => row.innerText.includes(title)).sort((a, b) => a.innerText.length - b.innerText.length)[0];
        (byId ?? byTitle)?.scrollIntoView({ block: 'center' });
        return { peer: of(byId ?? byTitle), matchedBy: byId ? 'run id' : byTitle ? 'title' : null };
      }, { runId: stack.remoteAgentRun, title: stack.remoteAgentTitle });
      let seen = null;
      await waitFor('the desktop peer row', async () => Boolean((seen = await readDesk()).peer), 30_000).catch(() => undefined);
      deskAvatar = seen?.peer ? { ...seen.peer, matchedBy: seen.matchedBy } : seen;
      await sleep(500);
      await desk.screenshot({ path: path.join(probe.outputDir ?? '.', 'MSP-121-desktop-peer-row-fallback.png') }).catch(() => undefined);
    } finally {
      await context.close().catch(() => undefined);
    }
    const details = { peerDefinitionId: publisher.id, pickedUpBy, alphaPicture: alphaPublisher.avatarUrl, phone: { key: peerRow.key, ...phoneAvatar }, desktop: deskAvatar };
    assert(phoneAvatar.state === 'fallback' && !phoneAvatar.src, 'phone: the peer row shows the fallback, though this node has a picture for that definition ID', details);
    assert(deskAvatar?.state === 'fallback' && !deskAvatar.src, 'desktop: the peer row shows the fallback', details);
    return details;
  });
};

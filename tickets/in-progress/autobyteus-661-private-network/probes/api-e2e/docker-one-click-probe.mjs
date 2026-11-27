#!/usr/bin/env node
// API/E2E (autobyteus-661 T-3) temporary probe: one-click pairing where the window's address of the other node does not
// work from the asking node (CR-002), and Desktop ↔ local Docker (decision (b)).
//
//   node docker-one-click-probe.mjs --server=<clone>/autobyteus-server-ts --package=<server-package dir> --image=<image>
//     --out=<evidence dir>
//
// Nodes: "desk" stands for the desktop's own node: this commit's built server (`dist/app.js`) on 127.0.0.1 with a launch
// owner credential, as the desktop starts it. "x" and "y" are Docker nodes started as the public launcher starts them
// (`-e AUTOBYTEUS_SERVER_HOST=http://localhost:<port>`, published on `127.0.0.1:<port>:8000`), running this commit's
// server package mounted read-only over the image's; their owner credentials come from a setup code made by the node's
// own CLI and exchanged at `/rest/node-access/setup-exchanges`, as the desktop's Add node does. Credentials stay in
// memory and are never printed.
//
// Each scenario makes the calls the window's connector makes for one click (nodeCollaborationConnector `pair` step):
// the target node makes a grant for the window's node (`createPairingGrant(forNodeId, nameForAsker)`, which answers the
// target's own addresses), then the window's node pairs at the window's address of the target, then those addresses
// (`pairWithNode(address, addresses, grant, nodeId, name)`). It then checks both records, the address each node keeps
// for the other, and signed requests both ways (`peerNodeAvailability`, `peerNodeOffer`).
import { spawn, execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

const arg = (name) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3)
// Resolved: app.js starts only when argv[1] equals its own (symlink-resolved) URL, and /tmp is a symlink on macOS.
const serverDir = fs.realpathSync(arg('server')), pkg = arg('package'), image = arg('image'), out = arg('out')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const evidence = { startedAt: new Date().toISOString(), image, scenarios: {}, cleanup: {}, result: 'Fail' }
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) }) })
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' }).trim()

const gqlWith = (baseUrl, credential) => async (query, variables = {}) => {
  const response = await fetch(`${baseUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${credential}` }, body: JSON.stringify({ query, variables }) })
  return response.json()
}
const data = (answer, what) => { if (answer.errors?.length) throw new Error(`${what}: ${JSON.stringify(answer.errors)}`); return answer.data }
const statusOf = async (baseUrl) => (await (await fetch(`${baseUrl}/rest/remote-access/status`)).json())
const until = async (what, fn, ms) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { const v = await fn(); if (v) return v } catch (e) { last = e } await sleep(500) } throw new Error(`timed out: ${what}${last ? ` (${last.message})` : ''}`) }

const nodes = {}
let root
const startDesk = async () => {
  const port = await freePort(), baseUrl = `http://127.0.0.1:${port}`, dataDir = path.join(root, 'desk'), credential = `own_${randomBytes(32).toString('base64url')}`
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=production\nLOG_LEVEL=INFO\n`)
  fs.mkdirSync(path.join(root, 'desk-home'), { recursive: true })
  const logs = fs.openSync(path.join(root, 'desk.log'), 'a')
  const child = spawn(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir],
    { cwd: serverDir, env: { PATH: process.env.PATH, HOME: path.join(root, 'desk-home'), TMPDIR: process.env.TMPDIR, AUTOBYTEUS_SERVER_HOST: baseUrl, AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: credential },
      stdio: ['ignore', logs, logs] })
  await until('desk health', async () => { if (child.exitCode !== null) throw new Error(`desk exited ${child.exitCode}`); return (await fetch(`${baseUrl}/rest/health`)).ok }, 180_000)
  return { name: 'desk', kind: 'desktop-like', baseUrl, windowAddress: baseUrl, gql: gqlWith(baseUrl, credential), child, nodeId: (await statusOf(baseUrl)).nodeId }
}
const startDocker = async (name) => {
  const port = await freePort(), container = `autobyteus-661-api-${name}-${process.pid}`
  docker('run', '-d', '--name', container, '-e', `AUTOBYTEUS_SERVER_HOST=http://localhost:${port}`, '-p', `127.0.0.1:${port}:8000`,
    '-v', `${pkg}:/opt/autobyteus/server-package:ro`, image)
  const baseUrl = `http://127.0.0.1:${port}`
  await until(`${name} health`, async () => (await fetch(`${baseUrl}/rest/health`)).ok, 240_000)
  const code = await until(`${name} setup code`, () => {
    const printed = execFileSync('docker', ['exec', container, 'node', '/opt/autobyteus/server-package/dist/node-access-cli.js', 'setup-code', '--data-dir', '/home/autobyteus/data'], { encoding: 'utf8' })
    return printed.match(/Setup code:\s*(\S+)/)?.[1]
  }, 60_000)
  const exchange = await fetch(`${baseUrl}/rest/node-access/setup-exchanges`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ setupCode: code, desktopName: 'api-e2e desktop' }) })
  const { credential } = await exchange.json()
  if (exchange.status !== 201 || !credential) throw new Error(`${name}: setup exchange HTTP ${exchange.status}`)
  return { name, kind: 'docker', container, port, baseUrl, windowAddress: baseUrl, gql: gqlWith(baseUrl, credential), nodeId: (await statusOf(baseUrl)).nodeId }
}

const PEER = 'nodeId name address relation paired'
const peerOf = async (node, other) => (data(await node.gql(`query{ peerNodes{ ${PEER} } }`), 'peerNodes').peerNodes).find((p) => p.nodeId === other.nodeId) ?? null
const signedBothWays = async (a, b) => {
  const check = async (from, to) => ({
    availability: data(await from.gql('query($n:String!){ peerNodeAvailability(nodeId:$n){ available refusalCode unreachableReason } }', { n: to.nodeId }), 'availability').peerNodeAvailability,
    offer: data(await from.gql('query($n:String!){ peerNodeOffer(nodeId:$n){ refusalCode unreachableReason entries{ name kind } } }', { n: to.nodeId }), 'offer').peerNodeOffer,
  })
  return { [`${a.name}→${b.name}`]: await check(a, b), [`${b.name}→${a.name}`]: await check(b, a) }
}

/** One click from the window of `here`, pairing it with `target`, exactly as the connector's `pair` step does. */
const oneClick = async (here, target, { withTargetAddresses = true } = {}) => {
  const granted = data(await target.gql('mutation($n:String!,$a:String){ createPairingGrant(relation:"own",forNodeId:$n,nameForAsker:$a){ grant addresses } }',
    { n: here.nodeId, a: here.name }), 'createPairingGrant').createPairingGrant
  const started = Date.now()
  const answer = await here.gql(`mutation($address:String!,$addresses:[String!],$grant:String,$nodeId:String,$name:String){ pairWithNode(address:$address,addresses:$addresses,grant:$grant,nodeId:$nodeId,name:$name){ state peer{ ${PEER} } } }`,
    { address: target.windowAddress, addresses: withTargetAddresses ? granted.addresses : [], grant: granted.grant, nodeId: target.nodeId, name: target.name })
  return { targetAddresses: granted.addresses, ms: Date.now() - started, answer: answer.errors ? { error: { code: answer.errors[0].extensions?.code, message: answer.errors[0].message } } : answer.data.pairWithNode }
}
const unpair = async (a, b) => data(await a.gql('mutation($n:String!){ unpairPeerNode(nodeId:$n) }', { n: b.nodeId }), 'unpair')

const scenario = async (id, title, body) => {
  const entry = evidence.scenarios[id] = { title, result: 'Fail' }
  try { Object.assign(entry, await body()); entry.result = 'Pass' } catch (error) { entry.error = error.message }
  console.log(`${entry.result} ${id} ${title}${entry.error ? `: ${entry.error}` : ''}`)
}
const expectEq = (actual, expected, what) => { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${what}: ${JSON.stringify(actual)} ≠ ${JSON.stringify(expected)}`) }
const allSigned = (signed) => Object.values(signed).every((s) => s.availability.available === true && s.offer.refusalCode === null)

try {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), '661-api-docker-')))
  nodes.desk = await startDesk()
  ;[nodes.x, nodes.y] = await Promise.all([startDocker('x'), startDocker('y')])
  const { desk, x, y } = nodes
  evidence.nodes = Object.fromEntries(Object.values(nodes).map((n) => [n.name, { kind: n.kind, baseUrl: n.baseUrl, nodeId: n.nodeId }]))
  const hostAlias = (node) => `http://host.docker.internal:${new URL(node.baseUrl).port}`

  await scenario('D-1', 'decision (b): the desktop window pairs this computer\'s node with a local Docker node in one click; the Docker node keeps host.docker.internal:<port> for it', async () => {
    const click = await oneClick(desk, x)
    if (click.answer.state !== 'paired') throw new Error(`pair: ${JSON.stringify(click.answer)}`)
    const deskOfX = await peerOf(desk, x), xOfDesk = await peerOf(x, desk)
    expectEq(deskOfX?.address, x.baseUrl, "desk's address of x")
    expectEq(xOfDesk?.address, hostAlias(desk), "x's address of desk")
    const signed = await signedBothWays(desk, x)
    if (!allSigned(signed)) throw new Error(`signed requests: ${JSON.stringify(signed)}`)
    await unpair(desk, x)
    const after = { deskOfX: await peerOf(desk, x), xOfDesk: await peerOf(x, desk) }
    if (after.deskOfX || after.xOfDesk) throw new Error(`unpair left records: ${JSON.stringify(after)}`)
    return { click, deskOfX, xOfDesk, signed, afterUnpair: after }
  })

  await scenario('D-2a-control', 'negative control: from the Docker node\'s window, pairing with this computer\'s node at the window\'s address alone (127.0.0.1, the container itself) fails', async () => {
    const click = await oneClick(x, desk, { withTargetAddresses: false })
    if (click.answer.state === 'paired') throw new Error('paired without the target\'s own addresses')
    const records = { xOfDesk: await peerOf(x, desk), deskOfX: await peerOf(desk, x) }
    if (records.xOfDesk || records.deskOfX) throw new Error(`records left: ${JSON.stringify(records)}`)
    return { click, records }
  })

  await scenario('D-2a', 'CR-002 (a): a window bound to a Docker node pairs it with this computer\'s node, which the window reaches at 127.0.0.1; the Docker node pairs at one of that node\'s own addresses', async () => {
    const click = await oneClick(x, desk)
    if (click.answer.state !== 'paired') throw new Error(`pair: ${JSON.stringify(click.answer)}`)
    const xOfDesk = await peerOf(x, desk), deskOfX = await peerOf(desk, x)
    if (!click.targetAddresses.includes(xOfDesk?.address)) throw new Error(`x keeps ${xOfDesk?.address}, not one of desk's own addresses ${JSON.stringify(click.targetAddresses)}`)
    expectEq(xOfDesk?.address, hostAlias(desk), "x's address of desk")
    const signed = await signedBothWays(x, desk)
    if (!allSigned(signed)) throw new Error(`signed requests: ${JSON.stringify(signed)}`)
    return { click, xOfDesk, deskOfX, signed }
  })

  await scenario('D-2b', 'CR-002 (b): two Docker nodes both published on 127.0.0.1; the window of one pairs it with the other; each keeps an address that reaches the other', async () => {
    const click = await oneClick(x, y)
    if (click.answer.state !== 'paired') throw new Error(`pair: ${JSON.stringify(click.answer)}`)
    const xOfY = await peerOf(x, y), yOfX = await peerOf(y, x)
    if (!click.targetAddresses.includes(xOfY?.address)) throw new Error(`x keeps ${xOfY?.address}, not one of y's own addresses ${JSON.stringify(click.targetAddresses)}`)
    expectEq(xOfY?.address, hostAlias(y), "x's address of y")
    expectEq(yOfX?.address, hostAlias(x), "y's address of x")
    const signed = await signedBothWays(x, y)
    if (!allSigned(signed)) throw new Error(`signed requests: ${JSON.stringify(signed)}`)
    return { click, xOfY, yOfX, signed }
  })

  evidence.result = Object.values(evidence.scenarios).every((s) => s.result === 'Pass') ? 'Pass' : 'Fail'
} catch (error) {
  evidence.error = error.stack
  console.error(error)
} finally {
  for (const node of Object.values(nodes)) {
    if (node.container) {
      try { fs.writeFileSync(path.join(root, `${node.name}.log`), execFileSync('docker', ['logs', node.container], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) } catch {}
      try { docker('rm', '-f', '-v', node.container); evidence.cleanup[node.name] = 'removed' } catch (e) { evidence.cleanup[node.name] = `failed: ${e.message}` }
    } else if (node.child) {
      node.child.kill('SIGTERM'); await sleep(3000); if (node.child.exitCode === null) node.child.kill('SIGKILL'); evidence.cleanup[node.name] = 'stopped'
    }
  }
  if (out && root) {
    fs.mkdirSync(out, { recursive: true })
    for (const name of ['desk', 'x', 'y']) {
      const file = path.join(root, `${name}.log`)
      if (fs.existsSync(file)) fs.writeFileSync(path.join(out, `node-${name}.log`), fs.readFileSync(file, 'utf8').split('\n').filter((line) => /pair|peer|PEER|PAIR|refused|error|ERROR|listening/i.test(line)).slice(-200).join('\n'))
    }
  }
  if (root) { fs.rmSync(root, { recursive: true, force: true }); evidence.cleanup.root = 'removed' }
  evidence.finishedAt = new Date().toISOString()
  if (out) fs.writeFileSync(path.join(out, 'evidence.json'), JSON.stringify(evidence, null, 2))
  console.log(`result ${evidence.result}`)
  process.exitCode = evidence.result === 'Pass' ? 0 : 1
}

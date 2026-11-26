// Probe-only mini AutoByteus node implementing pairing-contract.md on top of the network program (anet).
// Two local listeners: `netPort` receives only what the network program forwards (with the caller's machine and
// account attached), `adminPort` stands for the owner's desktop and, while the node has no owner, the first-run page.
import { createHash, generateKeyPairSync, randomBytes, sign, verify, createPublicKey } from 'node:crypto';
import { spawn } from 'node:child_process';
import http from 'node:http';

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const readBody = async (req) => { let raw = ''; for await (const c of req) raw += c; return raw; };
const send = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const GRANT_TTL_MS = 10 * 60_000;
const MAX_SKEW_MS = 60_000;

export class MiniNode {
  constructor({ name, anetPath, control, scratch, netPort, adminPort }) {
    Object.assign(this, { name, anetPath, control, scratch, netPort, adminPort });
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    this.keys = { privateKey, publicKeyB64: publicKey.export({ type: 'spki', format: 'der' }).toString('base64') };
    this.nodeId = `srv_${randomBytes(6).toString('hex')}`;
    this.owner = null;               // { nodeId } of the node that owns this one (connection-code case)
    this.peers = new Map();          // nodeId -> peer record (contract part 2)
    this.grants = new Map();         // grant -> { forMachine, role, expiresAt, ownsPresenter, used }
    this.pending = [];               // pair requests waiting for Allow
    this.outgoingConnects = new Map(); // machine -> address, for Connect without a grant
    this.trustOwnAccount = false;    // the opt-in switch, off by default
    this.network = null;             // { ip, account, relay, relayCredential } once joined
    this.setupCodes = new Map();     // sha256(setupCode) -> { expiresAt, used }   (today's NA-5 rules)
    this.ownerCredentials = new Set(); // sha256(own_…): owners of this node (an AutoByteus app each)
    this.declined = new Set();       // machines that rejected our pair request
    this.log = [];
  }

  // ---------- network program ----------
  async joinNetwork(joinKey) {
    const child = spawn(this.anetPath, ['-name', this.name, '-dir', `${this.scratch}/${this.name}-net`, '-control', this.control, '-forward', `127.0.0.1:${this.netPort}`],
      { env: { ...process.env, ANET_JOIN_KEY: joinKey ?? '' }, stdio: ['pipe', 'pipe', 'pipe'] });
    this.anet = { child, pending: new Map(), next: 0, buffer: '' };
    const ready = new Promise((resolve, reject) => {
      child.stdout.on('data', (chunk) => {
        this.anet.buffer += chunk; const lines = this.anet.buffer.split('\n'); this.anet.buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line);
          if (msg.type === 'ready') resolve(msg); else if (msg.type === 'error') reject(new Error(msg.error));
          else this.anet.pending.get(msg.id)?.(msg);
        }
      });
      child.on('close', (code) => reject(new Error(`network program exited ${code}`)));
    });
    const r = await ready;
    const status = await this.anetAsk({ cmd: 'status' });
    this.network = { ip: r.ip, account: status.self.user, relay: r.relay, relayCredential: r.relayCredential };
    return this.network;
  }
  anetAsk(cmd) { return new Promise((resolve) => { const id = String(++this.anet.next); this.anet.pending.set(id, resolve); this.anet.child.stdin.write(`${JSON.stringify({ ...cmd, id })}\n`); }); }
  async netRequest(address, path, body, headers = {}) {
    const r = await this.anetAsk({ cmd: 'request', method: 'POST', url: `http://${address}:8000${path}`, body: JSON.stringify(body), headers: JSON.stringify({ 'content-type': 'application/json', ...headers }) });
    if (r.error) return { status: 0, body: { error: r.error } };
    let parsed; try { parsed = JSON.parse(r.body); } catch { parsed = { raw: r.body }; }
    return { status: r.status, body: parsed };
  }
  identity() { return { nodeId: this.nodeId, name: this.name, publicKey: this.keys.publicKeyB64 }; }
  addPeer(identity, caller, role) {
    this.peers.set(identity.nodeId, { nodeId: identity.nodeId, name: identity.name, publicKey: identity.publicKey, machine: caller.machine, account: caller.account, role });
  }

  // ---------- signed requests (contract part 5) ----------
  signedHeaders(method, path, body, { nodeId = this.nodeId, privateKey = this.keys.privateKey, timestamp = Date.now() } = {}) {
    const digest = createHash('sha256').update(JSON.stringify(body)).digest('hex');
    const signature = sign(null, Buffer.from(`${nodeId}\n${timestamp}\n${method}\n${path}\n${digest}`), privateKey).toString('base64');
    return { 'X-Node-Id': nodeId, 'X-Timestamp': String(timestamp), 'X-Signature': signature };
  }
  checkSigned(req, raw, caller) {
    const nodeId = req.headers['x-node-id']; const timestamp = Number(req.headers['x-timestamp']); const signature = req.headers['x-signature'];
    const peer = this.peers.get(nodeId);
    if (!peer) return { ok: false, reason: 'not paired' };
    if (!(Math.abs(Date.now() - timestamp) <= MAX_SKEW_MS)) return { ok: false, reason: 'stale timestamp' };
    if (caller.machine !== peer.machine) return { ok: false, reason: `request from machine ${caller.machine}, peer is ${peer.machine}` };
    const digest = createHash('sha256').update(raw).digest('hex');
    const key = createPublicKey({ key: Buffer.from(peer.publicKey, 'base64'), format: 'der', type: 'spki' });
    const good = (() => { try { return verify(null, Buffer.from(`${nodeId}\n${timestamp}\n${req.method}\n${req.url}\n${digest}`), key, Buffer.from(signature ?? '', 'base64')); } catch { return false; } })();
    return good ? { ok: true, peer } : { ok: false, reason: 'bad signature' };
  }

  // ---------- listeners ----------
  async start() {
    this.netServer = http.createServer((req, res) => this.onNetwork(req, res).catch((e) => send(res, 500, { error: e.message })));
    this.adminServer = http.createServer((req, res) => this.onAdmin(req, res).catch((e) => send(res, 500, { error: e.message })));
    await new Promise((r) => this.netServer.listen(this.netPort, '127.0.0.1', r));
    await new Promise((r) => this.adminServer.listen(this.adminPort, '127.0.0.1', r));
  }
  async stop() {
    if (this.anet) { const closed = new Promise((r) => this.anet.child.once('close', r)); this.anet.child.stdin.write('{"cmd":"quit"}\n'); await Promise.race([closed, new Promise((r) => setTimeout(r, 3000))]); this.anet.child.kill(); }
    this.netServer?.close(); this.adminServer?.close();
  }

  // What arrives from the private network.
  async onNetwork(req, res) {
    const caller = { machine: req.headers['x-network-caller-machine'], account: req.headers['x-network-caller-account'] };
    if (!caller.machine || !caller.account) return send(res, 403, { error: 'not from the private network' });
    const raw = await readBody(req);
    const body = raw ? JSON.parse(raw) : {};

    if (req.url === '/autobyteus/info') { // contract part 7: discovery, answered only on the private network
      return send(res, 200, { nodeId: this.nodeId, name: this.name });
    }
    if (req.url === '/pair') { // contract part 4
      if (body.grant) {
        const g = this.grants.get(body.grant);
        if (!g || g.used || Date.now() > g.expiresAt) return send(res, 403, { error: 'grant invalid, used or expired' });
        if (g.forMachine && g.forMachine !== caller.machine) return send(res, 403, { error: `grant is for ${g.forMachine}, not ${caller.machine}` });
        g.used = true;
        this.addPeer(body, caller, g.role);
        return send(res, 200, { paired: true, ...this.identity(), ownedBy: g.ownsPresenter ? this.nodeId : null });
      }
      if (this.trustOwnAccount && caller.account === this.network.account) {
        this.addPeer(body, caller, 'own');
        return send(res, 200, { paired: true, ...this.identity(), ownedBy: null });
      }
      const id = randomBytes(4).toString('hex');
      this.pending.push({ id, identity: { nodeId: body.nodeId, name: body.name, publicKey: body.publicKey }, caller });
      return send(res, 202, { pending: true });
    }
    if (req.url === '/node-access/setup-exchanges') { // today's setup exchange, reached here over the private network
      const entry = this.setupCodes.get(createHash('sha256').update(String(body.setupCode)).digest('hex'));
      if (!entry || entry.used || Date.now() > entry.expiresAt) return send(res, 401, { error: 'setup code invalid, used or expired' });
      entry.used = true;
      const credential = `own_${b64u(randomBytes(32))}`;
      this.ownerCredentials.add(createHash('sha256').update(credential).digest('hex'));
      return send(res, 200, { credential, nodeId: this.nodeId, name: this.name });
    }
    if (req.url === '/owner/whoami') { // any owner action: needs an owner credential
      const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
      if (!this.ownerCredentials.has(createHash('sha256').update(token).digest('hex'))) return send(res, 401, { error: 'owner credential required' });
      return send(res, 200, { node: this.name, owner: true });
    }
    if (req.url === '/pair-rejected') {
      if (!this.outgoingConnects.has(caller.machine)) return send(res, 403, { error: 'no outstanding request to this machine' });
      this.outgoingConnects.delete(caller.machine);
      this.declined.add(caller.machine);
      return send(res, 200, { noted: true });
    }
    if (req.url === '/pair-accepted') { // B's owner clicked Allow; accept only for our own outstanding Connect
      if (!this.outgoingConnects.has(caller.machine)) return send(res, 403, { error: 'no outstanding Connect to this machine' });
      this.outgoingConnects.delete(caller.machine);
      this.addPeer(body, caller, 'teammate');
      return send(res, 200, { paired: true });
    }
    if (req.url === '/collab/hello') {
      const check = this.checkSigned(req, raw, caller);
      if (!check.ok) return send(res, 401, { error: check.reason });
      return send(res, 200, { hello: `from ${this.name} to ${check.peer.name}` });
    }
    if (req.url === '/owner/rename') { // an owner action: only the node that owns this one
      const check = this.checkSigned(req, raw, caller);
      if (!check.ok) return send(res, 401, { error: check.reason });
      if (!this.owner || check.peer.nodeId !== this.owner.nodeId) return send(res, 403, { error: 'peers are not owners' });
      this.name = body.name; return send(res, 200, { renamed: this.name });
    }
    return send(res, 404, { error: 'unknown' });
  }

  // The owner's desktop (and, while unowned, the first-run page). Loopback only.
  async onAdmin(req, res) {
    const body = JSON.parse((await readBody(req)) || '{}');
    switch (req.url) {
      case '/first-run/connection-code': { // contract part 6
        if (this.owner || this.network) return send(res, 409, { error: 'this node already has an owner' });
        let code;
        try { code = JSON.parse(Buffer.from(body.code.replace(/^abpn_/, ''), 'base64url').toString()); } catch { return send(res, 400, { error: 'not a connection code' }); }
        try { await this.joinNetwork(code.joinKey); } catch (e) { return send(res, 403, { error: `could not join the private network: ${e.message}` }); }
        const r = await this.netRequest(code.owner, '/pair', { ...this.identity(), grant: code.grant });
        if (r.status !== 200 || !r.body.ownedBy) return send(res, 403, { error: `owner refused: ${r.body.error ?? r.status}` });
        this.owner = { nodeId: r.body.ownedBy };
        this.addPeer(r.body, { machine: r.body.name, account: this.network.account }, 'own');
        return send(res, 200, { joined: this.network.ip, ownedBy: r.body.ownedBy });
      }
      case '/first-run/access-code': // pairing-contract §6: a node with no owner, from this computer only
      case '/admin/access-code': {    // a node with an owner: an owner action (the admin port stands for an owner window)
        const firstRun = req.url === '/first-run/access-code';
        if (firstRun && this.ownerCredentials.size > 0) return send(res, 409, { error: 'this node already has an owner' });
        if (!firstRun && this.ownerCredentials.size === 0) return send(res, 403, { error: 'no owner yet: use the first-run page' });
        const setupCode = b64u(randomBytes(18));
        const expiresAt = Date.now() + (body.ttlMs ?? 30 * 60_000);
        this.setupCodes.set(createHash('sha256').update(setupCode).digest('hex'), { expiresAt, used: false });
        const address = this.network ? `${this.network.ip}:8000` : `127.0.0.1:${this.netPort}`;
        return send(res, 200, { code: `abps_${b64u(JSON.stringify({ nodeId: this.nodeId, address, setupCode, expiresAt: new Date(expiresAt).toISOString() }))}` });
      }
      case '/admin/reject': {
        const p = this.pending.find((x) => x.id === body.id);
        if (!p) return send(res, 404, { error: 'no such request' });
        this.pending = this.pending.filter((x) => x !== p);
        const r = await this.netRequest(body.address, '/pair-rejected', {});
        return send(res, r.status, r.body);
      }
      case '/admin/cancel': this.outgoingConnects.delete(body.machine); return send(res, 200, { cancelled: body.machine });
      case '/admin/declined': return send(res, 200, [...this.declined]);
      case '/admin/add-machine': { // "Add a machine": a connection code
        const grant = b64u(randomBytes(32));
        this.grants.set(grant, { forMachine: null, role: 'own', ownsPresenter: true, expiresAt: Date.now() + (body.ttlMs ?? GRANT_TTL_MS), used: false });
        return send(res, 200, { code: `abpn_${b64u(JSON.stringify({ joinKey: body.joinKey, owner: this.network.ip, grant }))}` });
      }
      case '/admin/mint-grant': { // the owner's click "Pair" for a found machine
        const grant = b64u(randomBytes(32));
        this.grants.set(grant, { forMachine: body.forMachine, role: body.role ?? 'own', ownsPresenter: false, expiresAt: Date.now() + (body.ttlMs ?? GRANT_TTL_MS), used: false });
        return send(res, 200, { grant });
      }
      case '/admin/pair-with': {
        const r = await this.netRequest(body.address, '/pair', { ...this.identity(), grant: body.grant });
        if (r.status === 200) this.addPeer(r.body, { machine: body.machine, account: body.account }, body.role ?? 'own');
        return send(res, r.status, r.body);
      }
      case '/admin/connect': { // teammate: request without a grant
        this.outgoingConnects.set(body.machine, body.address);
        const r = await this.netRequest(body.address, '/pair', this.identity());
        return send(res, r.status, r.body);
      }
      case '/admin/pending': return send(res, 200, this.pending.map((p) => ({ id: p.id, name: p.identity.name, machine: p.caller.machine, account: p.caller.account })));
      case '/admin/allow': {
        const p = this.pending.find((x) => x.id === body.id);
        if (!p) return send(res, 404, { error: 'no such request' });
        this.pending = this.pending.filter((x) => x !== p);
        const r = await this.netRequest(body.address, '/pair-accepted', this.identity());
        if (r.status === 200) this.addPeer(p.identity, p.caller, 'teammate'); // withdrawn on A's side → nothing stored
        else r.body = { ...r.body, withdrawn: true };
        return send(res, r.status, r.body);
      }
      case '/admin/set-trust': this.trustOwnAccount = Boolean(body.on); return send(res, 200, { trust: this.trustOwnAccount });
      case '/admin/unpair': this.peers.delete(body.nodeId); return send(res, 200, { unpaired: body.nodeId });
      case '/admin/peers': return send(res, 200, [...this.peers.values()].map(({ publicKey, ...p }) => p));
      case '/admin/call': { // a signed call to a peer (or a crafted one for the refusal checks)
        const path = body.path ?? '/collab/hello';
        const payload = body.payload ?? { ping: true };
        let headers = this.signedHeaders('POST', path, payload, body.as ?? {});
        if (body.tamper) headers = { ...headers, 'X-Signature': Buffer.from('forged').toString('base64') };
        const r = await this.netRequest(body.address, path, payload, headers);
        return send(res, r.status, r.body);
      }
      default: return send(res, 404, { error: 'unknown' });
    }
  }
}

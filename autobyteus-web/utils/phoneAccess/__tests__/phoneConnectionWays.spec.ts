import { describe, expect, it } from 'vitest';
import type { NodeNetwork } from '~/types/remoteAccess';
import {
  blockedReason,
  composeConnectionWays,
  httpAcknowledgedFor,
  readinessFromChecks,
  recognizeNodeKind,
  recommendedWay,
} from '../phoneConnectionWays';

// Synthetic facts; none belongs to a real machine.
const network = (overrides: Partial<NodeNetwork> = {}): NodeNetwork => ({
  computerName: 'Test Computer',
  runsInContainer: false,
  configuredBaseUrl: null,
  tailscale: null,
  vpnAddresses: [],
  localNetwork: null,
  ...overrides,
});

const containerFacts = (overrides: Partial<NodeNetwork> = {}): NodeNetwork => network({
  runsInContainer: true,
  localNetwork: { networkId: 'this-computer', addresses: [], allowed: false },
  ...overrides,
});

const host = network({
  tailscale: { address: '100.101.102.103', dnsName: 'desktop.example-tailnet.ts.net' },
  vpnAddresses: ['10.8.0.2'],
  localNetwork: { networkId: 'gw_0123456789abcdef', addresses: ['192.168.1.20', '10.0.0.5'], allowed: true },
});

describe('phoneConnectionWays', () => {
  it('recognises the three node kinds', () => {
    expect(recognizeNodeKind({ isEmbeddedEntry: true, targetBaseUrl: 'http://127.0.0.1:29695', targetNetwork: host })).toBe('embedded');
    expect(recognizeNodeKind({ isEmbeddedEntry: false, targetBaseUrl: 'http://localhost:8001', targetNetwork: containerFacts() })).toBe('local_container');
    expect(recognizeNodeKind({ isEmbeddedEntry: false, targetBaseUrl: 'http://192.168.1.50:8001', targetNetwork: containerFacts() })).toBe('remote');
    expect(recognizeNodeKind({ isEmbeddedEntry: false, targetBaseUrl: 'http://localhost:29700', targetNetwork: host })).toBe('remote');
  });

  it("desktop's own node: its facts with its port, https name first", () => {
    const composed = composeConnectionWays({
      kind: 'embedded',
      targetBaseUrl: 'http://127.0.0.1:29695',
      targetNetwork: network({ ...host, configuredBaseUrl: 'https://autobyteus.example.com' }),
    });
    expect(composed.candidates).toEqual({
      company_address: ['https://autobyteus.example.com'],
      tailscale: ['https://desktop.example-tailnet.ts.net', 'http://100.101.102.103:29695'],
      vpn: ['http://10.8.0.2:29695'],
      local_network: ['http://192.168.1.20:29695', 'http://10.0.0.5:29695'],
    });
    expect(composed.localNetwork).toEqual({ networkId: 'gw_0123456789abcdef', allowed: true, keeper: 'embedded' });
  });

  it("local Docker node: this computer's facts with the node's published port and its own Serve port", () => {
    const composed = composeConnectionWays({
      kind: 'local_container',
      targetBaseUrl: 'http://localhost:8001',
      targetNetwork: containerFacts({ configuredBaseUrl: 'https://docker.example.com' }),
      hostNetwork: host,
      tailscaleServePort: 8443,
    });
    expect(composed.candidates).toEqual({
      company_address: ['https://docker.example.com'],
      tailscale: ['https://desktop.example-tailnet.ts.net:8443', 'http://100.101.102.103:8001'],
      vpn: ['http://10.8.0.2:8001'],
      local_network: ['http://192.168.1.20:8001', 'http://10.0.0.5:8001'],
    });
    expect(composed.localNetwork.keeper).toBe('embedded');
  });

  it('remote node: its own facts plus the address the desktop reaches it at, without repeats', () => {
    const remote = network({
      tailscale: { address: '100.90.1.2', dnsName: null },
      localNetwork: { networkId: 'gw_fedcba9876543210', addresses: ['192.168.1.50'], allowed: false },
    });
    const composed = composeConnectionWays({ kind: 'remote', targetBaseUrl: 'http://192.168.1.50:29695', targetNetwork: remote });
    expect(composed.candidates.tailscale).toEqual(['http://100.90.1.2:29695']);
    expect(composed.candidates.local_network).toEqual(['http://192.168.1.50:29695']);
    expect(composed.localNetwork).toEqual({ networkId: 'gw_fedcba9876543210', allowed: false, keeper: 'target' });

    const viaTailnet = composeConnectionWays({ kind: 'remote', targetBaseUrl: 'http://100.90.1.2:29695', targetNetwork: remote });
    expect(viaTailnet.candidates.tailscale).toEqual(['http://100.90.1.2:29695']);
    expect(viaTailnet.candidates.local_network).toEqual(['http://192.168.1.50:29695']);
  });

  it('remote node in a container: ways only from the address the desktop uses, classified by its host', () => {
    const facts = containerFacts({ localNetwork: { networkId: 'this-computer', addresses: [], allowed: true } });
    const viaLan = composeConnectionWays({ kind: 'remote', targetBaseUrl: 'http://192.168.1.60:8001', targetNetwork: facts });
    expect(viaLan.candidates.local_network).toEqual(['http://192.168.1.60:8001']);
    expect(viaLan.localNetwork).toEqual({ networkId: 'this-computer', allowed: true, keeper: 'target' });

    expect(composeConnectionWays({ kind: 'remote', targetBaseUrl: 'https://box.example-tailnet.ts.net', targetNetwork: facts }).candidates.tailscale)
      .toEqual(['https://box.example-tailnet.ts.net']);
    expect(composeConnectionWays({ kind: 'remote', targetBaseUrl: 'https://autobyteus.example.com', targetNetwork: facts }).candidates.company_address)
      .toEqual(['https://autobyteus.example.com']);
    expect(composeConnectionWays({ kind: 'remote', targetBaseUrl: 'http://100.70.0.9:8001', targetNetwork: facts }).candidates.local_network)
      .toEqual(['http://100.70.0.9:8001']);
    expect(composeConnectionWays({ kind: 'remote', targetBaseUrl: 'http://office-mac.local:8001', targetNetwork: facts }).candidates.local_network)
      .toEqual(['http://office-mac.local:8001']);
    const publicHttp = composeConnectionWays({ kind: 'remote', targetBaseUrl: 'http://203.0.113.9:8001', targetNetwork: facts }).candidates;
    expect(Object.values(publicHttp).flat()).toEqual([]);
  });

  it('readiness takes the first checked candidate; the recommendation follows company, Tailscale, VPN, local network', () => {
    const candidates = {
      company_address: ['https://autobyteus.example.com'],
      tailscale: ['https://desktop.example-tailnet.ts.net', 'http://100.101.102.103:29695'],
      vpn: [],
      local_network: ['http://192.168.1.20:29695'],
    };
    const readiness = readinessFromChecks(candidates, new Set(['http://100.101.102.103:29695', 'http://192.168.1.20:29695']));
    expect(readiness.tailscale).toEqual({ ready: true, address: 'http://100.101.102.103:29695' });
    expect(readiness.company_address.ready).toBe(false);
    expect(recommendedWay(readiness)).toBe('tailscale');
    expect(recommendedWay(readinessFromChecks(candidates, new Set(['https://autobyteus.example.com', 'http://192.168.1.20:29695']))))
      .toBe('company_address');
  });

  it('blocked: no network when there is no candidate; a Docker node unreachable when this computer has ways', () => {
    const none = readinessFromChecks({ company_address: [], tailscale: [], vpn: [], local_network: [] }, new Set());
    const empty = composeConnectionWays({ kind: 'embedded', targetBaseUrl: 'http://127.0.0.1:29695', targetNetwork: network() });
    expect(blockedReason('embedded', empty, none)).toBe('no_network');
    const docker = composeConnectionWays({ kind: 'local_container', targetBaseUrl: 'http://localhost:8001', targetNetwork: containerFacts(), hostNetwork: host });
    expect(blockedReason('local_container', docker, readinessFromChecks(docker.candidates, new Set()))).toBe('docker_unpublished');
    expect(blockedReason('local_container', docker, readinessFromChecks(docker.candidates, new Set(['http://10.8.0.2:8001'])))).toBeNull();
  });

  it('acknowledges plain HTTP for Tailscale, VPN and company addresses, and for the local network only once allowed', () => {
    expect(httpAcknowledgedFor('tailscale', false)).toBe(true);
    expect(httpAcknowledgedFor('vpn', false)).toBe(true);
    expect(httpAcknowledgedFor('company_address', false)).toBe(true);
    expect(httpAcknowledgedFor('local_network', false)).toBe(false);
    expect(httpAcknowledgedFor('local_network', true)).toBe(true);
  });
});

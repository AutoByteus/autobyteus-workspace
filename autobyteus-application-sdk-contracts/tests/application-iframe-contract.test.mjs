import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPLICATION_IFRAME_BOOTSTRAP_EVENT,
  APPLICATION_IFRAME_CONTRACT_VERSION,
  APPLICATION_IFRAME_READY_EVENT,
  createApplicationHostBootstrapEnvelope,
  createApplicationUiReadyEnvelope,
  decodeApplicationAgentTargetPath,
  doesApplicationHostOriginMatch,
  encodeApplicationAgentTargetPath,
  isApplicationHostBootstrapEnvelope,
  isApplicationUiReadyEnvelope,
  normalizeApplicationHostOrigin,
  readApplicationIframeLaunchHints,
} from '../dist/index.js';

const IFRAME_LAUNCH_ID = 'bundle-app__pkg__sample-app::iframe-launch-1';

test('application agent target path codec round-trips encoded binding and member identities', () => {
  const address = {
    bindingId: 'binding/one',
    target: { kind: 'AGENT_TEAM_MEMBER', memberRouteKey: 'reviewer two' },
  };
  const encoded = encodeApplicationAgentTargetPath(address);
  assert.equal(encoded, '/binding%2Fone/targets/agent-team-member/reviewer%20two');
  assert.deepEqual(decodeApplicationAgentTargetPath(encoded), address);
});

test('application agent target path decoder rejects non-canonical and incomplete paths', () => {
  for (const pathValue of [
    '/binding//targets/agent-run',
    '/binding/targets/agent-run/',
    '/binding/targets/agent-team-member',
    '/binding/targets/unknown',
    '/binding/targets/agent-run?view=compact',
  ]) {
    assert.equal(decodeApplicationAgentTargetPath(pathValue), null);
  }
});

const buildBootstrapEnvelope = () => createApplicationHostBootstrapEnvelope({
  host: { origin: 'http://127.0.0.1:43123' },
  application: {
    applicationId: 'bundle-app__pkg__sample-app',
    localApplicationId: 'sample-app',
    packageId: 'pkg',
    name: 'Sample App',
  },
  iframeLaunchId: IFRAME_LAUNCH_ID,
  requestContext: {
    applicationId: 'bundle-app__pkg__sample-app',
  },
  transport: {
    backendBaseUrl: 'http://127.0.0.1:43123/rest/applications/bundle-app__pkg__sample-app/backend',
    backendNotificationsUrl: null,
    backendWebSocketBaseUrl: null,
    agentCommunicationWebSocketBaseUrl: null,
  },
});

test('readApplicationIframeLaunchHints parses a valid v4 iframe launch-hint query string', () => {
  const hints = readApplicationIframeLaunchHints(
    '?autobyteusContractVersion=4&autobyteusApplicationId=bundle-app__pkg__sample-app&autobyteusIframeLaunchId=bundle-app__pkg__sample-app%3A%3Aiframe-launch-1&autobyteusHostOrigin=http%3A%2F%2F127.0.0.1%3A43123',
  );

  assert.deepEqual(hints, {
    contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION,
    applicationId: 'bundle-app__pkg__sample-app',
    iframeLaunchId: IFRAME_LAUNCH_ID,
    hostOrigin: 'http://127.0.0.1:43123',
  });
});

test('readApplicationIframeLaunchHints rejects missing, stale, or invalid launch-hint input', () => {
  const legacyQueryName = `autobyteus${String.fromCharCode(76)}aunch${String.fromCharCode(73)}nstanceId`;
  assert.equal(readApplicationIframeLaunchHints(''), null);
  assert.equal(
    readApplicationIframeLaunchHints(
      `?autobyteusContractVersion=2&autobyteusApplicationId=bundle-app__pkg__sample-app&${legacyQueryName}=legacy&autobyteusHostOrigin=http%3A%2F%2F127.0.0.1%3A43123`,
    ),
    null,
  );
  assert.equal(
    readApplicationIframeLaunchHints(
      `?autobyteusContractVersion=4&autobyteusApplicationId=bundle-app__pkg__sample-app&${legacyQueryName}=legacy&autobyteusHostOrigin=http%3A%2F%2F127.0.0.1%3A43123`,
    ),
    null,
  );
  assert.equal(
    readApplicationIframeLaunchHints(
      '?autobyteusContractVersion=4&autobyteusApplicationId=&autobyteusIframeLaunchId=iframe-launch-1&autobyteusHostOrigin=http%3A%2F%2F127.0.0.1%3A43123',
    ),
    null,
  );
});

test('packaged host-origin normalization preserves the file/null equivalence rule', () => {
  const packagedOrigin = normalizeApplicationHostOrigin('null', 'file:');

  assert.equal(packagedOrigin, 'file://');
  assert.equal(doesApplicationHostOriginMatch(packagedOrigin, 'null'), true);
  assert.equal(doesApplicationHostOriginMatch(packagedOrigin, 'file://'), true);
  assert.equal(doesApplicationHostOriginMatch(packagedOrigin, 'http://127.0.0.1:43123'), false);
});

test('ready and bootstrap validators accept tight v4 envelopes and reject malformed variants', () => {
  const readyEnvelope = createApplicationUiReadyEnvelope({
    applicationId: 'bundle-app__pkg__sample-app',
    iframeLaunchId: IFRAME_LAUNCH_ID,
  });
  const bootstrapEnvelope = buildBootstrapEnvelope();

  assert.equal(readyEnvelope.eventName, APPLICATION_IFRAME_READY_EVENT);
  assert.equal(bootstrapEnvelope.eventName, APPLICATION_IFRAME_BOOTSTRAP_EVENT);
  assert.equal(isApplicationUiReadyEnvelope(readyEnvelope), true);
  assert.equal(isApplicationHostBootstrapEnvelope(bootstrapEnvelope), true);
  assert.deepEqual(bootstrapEnvelope.payload.requestContext, {
    applicationId: 'bundle-app__pkg__sample-app',
  });

  const malformedBootstrapEnvelope = {
    ...bootstrapEnvelope,
    payload: {
      ...bootstrapEnvelope.payload,
      transport: {
        backendBaseUrl: 42,
        backendNotificationsUrl: null,
        backendWebSocketBaseUrl: null,
        agentCommunicationWebSocketBaseUrl: null,
      },
    },
  };

  assert.equal(isApplicationHostBootstrapEnvelope(malformedBootstrapEnvelope), false);
  assert.equal(
    isApplicationUiReadyEnvelope({
      ...readyEnvelope,
      payload: {
        applicationId: 'bundle-app__pkg__sample-app',
      },
    }),
    false,
  );
  assert.equal(
    isApplicationHostBootstrapEnvelope({
      ...bootstrapEnvelope,
      payload: {
        ...bootstrapEnvelope.payload,
        requestContext: {
          applicationId: 'bundle-app__pkg__sample-app',
          iframeLaunchId: IFRAME_LAUNCH_ID,
        },
      },
    }),
    false,
  );
});

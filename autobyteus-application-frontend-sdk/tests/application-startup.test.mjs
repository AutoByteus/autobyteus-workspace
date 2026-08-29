import test from 'node:test';
import assert from 'node:assert/strict';
import {
  startApplicationWithDependencies,
} from '../dist/application-startup/application-startup-coordinator.js';
import {
  normalizeStandaloneBootstrap,
} from '../dist/application-startup/standalone-same-origin-bootstrap-provider.js';

const APPLICATION_ID = 'bundle-app__pkg__sample-app';

const runtimeBootstrap = {
  contractVersion: '1',
  application: {
    applicationId: APPLICATION_ID,
    localApplicationId: 'sample-app',
    packageId: 'pkg',
    name: 'Sample App',
  },
  transport: {
    backendBaseUrl: `http://127.0.0.1:43123/_autobyteus/backend`,
    backendNotificationsUrl: null,
    backendWebSocketBaseUrl: null,
    agentCommunicationWebSocketBaseUrl: null,
  },
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test('startup coordinator acquires one runtime bootstrap and hands off once', async () => {
  const states = [];
  const rootElement = { innerHTML: '' };
  let context = null;
  const handle = startApplicationWithDependencies({
    rootElement,
    onBootstrapped: (value) => {
      context = value;
      value.rootElement.innerHTML = '<main>mounted</main>';
    },
  }, {
    provider: { acquire: async () => structuredClone(runtimeBootstrap) },
    render: ({ state }) => states.push(state),
  });
  await flush();
  assert.equal(handle.getState(), 'handoff_complete');
  assert.deepEqual(states, ['resolving_provider', 'acquiring_bootstrap', 'starting_application']);
  assert.equal(context.runtimeBootstrap.application.applicationId, APPLICATION_ID);
  assert.deepEqual(context.applicationClient.getApplicationInfo(), {
    applicationId: APPLICATION_ID,
    requestContext: { applicationId: APPLICATION_ID },
  });
  assert.match(rootElement.innerHTML, /mounted/);
});

test('startup coordinator contains business mount failures', async () => {
  const rendered = [];
  const handle = startApplicationWithDependencies({
    rootElement: { innerHTML: '' },
    onBootstrapped: () => {
      throw new Error('Mount failed');
    },
  }, {
    provider: { acquire: async () => structuredClone(runtimeBootstrap) },
    render: (input) => rendered.push(input),
  });
  await flush();
  assert.equal(handle.getState(), 'startup_failed');
  assert.equal(rendered.at(-1).errorMessage, 'Mount failed');
});

test('startup disposal aborts provider work and is idempotent', async () => {
  let observedSignal = null;
  const handle = startApplicationWithDependencies({
    rootElement: { innerHTML: '' },
    onBootstrapped: () => assert.fail('disposed startup must not hand off'),
  }, {
    provider: {
      acquire: (signal) => {
        observedSignal = signal;
        return new Promise(() => undefined);
      },
    },
    render: () => undefined,
  });
  handle.dispose();
  handle.dispose();
  assert.equal(observedSignal.aborted, true);
  assert.equal(handle.getState(), 'disposed');
});

test('standalone bootstrap normalization resolves visible same-origin HTTP and WebSocket URLs', () => {
  assert.deepEqual(normalizeStandaloneBootstrap({
    browserOrigin: 'https://apps.example.test',
    payload: {
      contractVersion: '1',
      application: runtimeBootstrap.application,
      transportPaths: {
        backendBasePath: '/_autobyteus/backend',
        backendNotificationsPath: '/_autobyteus/backend/notifications',
        backendWebSocketBasePath: '/_autobyteus/backend/ws',
        agentCommunicationWebSocketBasePath: '/_autobyteus/agent',
      },
    },
  }).transport, {
    backendBaseUrl: 'https://apps.example.test/_autobyteus/backend',
    backendNotificationsUrl: 'wss://apps.example.test/_autobyteus/backend/notifications',
    backendWebSocketBaseUrl: 'wss://apps.example.test/_autobyteus/backend/ws',
    agentCommunicationWebSocketBaseUrl: 'wss://apps.example.test/_autobyteus/agent',
  });
});

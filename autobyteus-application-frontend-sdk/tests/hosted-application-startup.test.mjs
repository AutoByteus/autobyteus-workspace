import test from 'node:test';
import assert from 'node:assert/strict';
import { startHostedApplication } from '../dist/index.js';
import { createApplicationHostBootstrapEnvelopeV2 } from '../../autobyteus-application-sdk-contracts/dist/index.js';

const LAUNCH_SEARCH = '?autobyteusContractVersion=2&autobyteusApplicationId=bundle-app__pkg__sample-app&autobyteusLaunchInstanceId=bundle-app__pkg__sample-app%3A%3Alaunch-1&autobyteusHostOrigin=http%3A%2F%2F127.0.0.1%3A43123';
const LAUNCH_INSTANCE_ID = 'bundle-app__pkg__sample-app::launch-1';
const APPLICATION_ID = 'bundle-app__pkg__sample-app';
const HOST_ORIGIN = 'http://127.0.0.1:43123';

const flushMicrotasks = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const createBootstrapEnvelope = (overrides = {}) => {
  const envelope = createApplicationHostBootstrapEnvelopeV2({
    host: { origin: HOST_ORIGIN },
    application: {
      applicationId: APPLICATION_ID,
      localApplicationId: 'sample-app',
      packageId: 'pkg',
      name: 'Sample App',
    },
    launch: { launchInstanceId: LAUNCH_INSTANCE_ID },
    requestContext: {
      applicationId: APPLICATION_ID,
      launchInstanceId: LAUNCH_INSTANCE_ID,
    },
    transport: {
      backendBaseUrl: `http://127.0.0.1:43123/rest/applications/${APPLICATION_ID}/backend`,
      backendNotificationsUrl: null,
    },
  });

  return {
    ...envelope,
    ...overrides,
    payload: {
      ...envelope.payload,
      ...overrides.payload,
      host: {
        ...envelope.payload.host,
        ...overrides.payload?.host,
      },
      application: {
        ...envelope.payload.application,
        ...overrides.payload?.application,
      },
      launch: {
        ...envelope.payload.launch,
        ...overrides.payload?.launch,
      },
      requestContext: {
        ...envelope.payload.requestContext,
        ...overrides.payload?.requestContext,
      },
      transport: {
        ...envelope.payload.transport,
        ...overrides.payload?.transport,
      },
    },
  };
};

const createStartupHarness = ({ search = '' } = {}) => {
  let messageListener = null;
  const postedMessages = [];
  const startupWindow = {
    location: { search },
    parent: {
      postMessage(message, targetOrigin) {
        postedMessages.push({ message, targetOrigin });
      },
    },
    addEventListener(type, listener) {
      if (type === 'message') {
        messageListener = listener;
      }
    },
    removeEventListener(type, listener) {
      if (type === 'message' && messageListener === listener) {
        messageListener = null;
      }
    },
  };

  return {
    rootElement: { innerHTML: '' },
    postedMessages,
    startupWindow,
    dispatchMessage(event) {
      assert.equal(typeof messageListener, 'function');
      messageListener(event);
    },
  };
};

test('startHostedApplication exposes framework-owned unsupported-entry behavior without launch hints', () => {
  const harness = createStartupHarness();

  const handle = startHostedApplication({
    rootElement: harness.rootElement,
    window: harness.startupWindow,
    onBootstrapped: () => {
      throw new Error('unsupported entry should not hand off to business UI');
    },
  });

  assert.equal(handle.getState(), 'unsupported_entry');
  assert.match(harness.rootElement.innerHTML, /Open this application from AutoByteus/);
  assert.equal(harness.postedMessages.length, 0);
});

test('startHostedApplication emits ready, accepts bootstrap, and reaches handoff_complete on success', async () => {
  const harness = createStartupHarness({ search: LAUNCH_SEARCH });
  let bootstrappedContext = null;

  const handle = startHostedApplication({
    rootElement: harness.rootElement,
    window: harness.startupWindow,
    onBootstrapped: ({ bootstrap, applicationClient, rootElement }) => {
      bootstrappedContext = {
        bootstrap,
        applicationInfo: applicationClient.getApplicationInfo(),
      };
      rootElement.innerHTML = '<main id="mounted">mounted</main>';
    },
  });

  assert.equal(handle.getState(), 'waiting_for_bootstrap');
  assert.equal(harness.postedMessages.length, 1);
  assert.equal(harness.postedMessages[0].message.eventName, 'autobyteus.application.ui.ready');
  assert.equal(harness.postedMessages[0].message.payload.applicationId, APPLICATION_ID);
  assert.equal(harness.postedMessages[0].message.payload.launchInstanceId, LAUNCH_INSTANCE_ID);

  harness.dispatchMessage({
    source: harness.startupWindow.parent,
    origin: HOST_ORIGIN,
    data: createBootstrapEnvelope(),
  });
  await flushMicrotasks();

  assert.equal(handle.getState(), 'handoff_complete');
  assert.deepEqual(bootstrappedContext?.applicationInfo, {
    applicationId: APPLICATION_ID,
    requestContext: {
      applicationId: APPLICATION_ID,
      launchInstanceId: LAUNCH_INSTANCE_ID,
    },
  });
  assert.equal(bootstrappedContext?.bootstrap.application.applicationId, APPLICATION_ID);
  assert.match(harness.rootElement.innerHTML, /mounted/);
});

test('startHostedApplication keeps post-delivery mount failures inside startup_failed', async () => {
  const harness = createStartupHarness({ search: LAUNCH_SEARCH });

  const handle = startHostedApplication({
    rootElement: harness.rootElement,
    window: harness.startupWindow,
    onBootstrapped: () => {
      throw new Error('Mount failed');
    },
  });

  harness.dispatchMessage({
    source: harness.startupWindow.parent,
    origin: HOST_ORIGIN,
    data: createBootstrapEnvelope(),
  });
  await flushMicrotasks();

  assert.equal(handle.getState(), 'startup_failed');
  assert.match(harness.rootElement.innerHTML, /Application failed to start/);
  assert.match(harness.rootElement.innerHTML, /Mount failed/);
});

test('startHostedApplication rejects mismatched bootstrap payloads before business handoff', async () => {
  const harness = createStartupHarness({ search: LAUNCH_SEARCH });
  let bootstrapped = false;

  const handle = startHostedApplication({
    rootElement: harness.rootElement,
    window: harness.startupWindow,
    onBootstrapped: () => {
      bootstrapped = true;
    },
  });

  harness.dispatchMessage({
    source: harness.startupWindow.parent,
    origin: HOST_ORIGIN,
    data: createBootstrapEnvelope({
      payload: {
        launch: { launchInstanceId: 'stale-launch' },
        requestContext: { launchInstanceId: 'stale-launch' },
      },
    }),
  });
  await flushMicrotasks();

  assert.equal(bootstrapped, false);
  assert.equal(handle.getState(), 'startup_failed');
  assert.match(harness.rootElement.innerHTML, /different launch instance/);
});

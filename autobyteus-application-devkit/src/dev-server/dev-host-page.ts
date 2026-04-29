import {
  APPLICATION_IFRAME_BOOTSTRAP_EVENT,
  APPLICATION_IFRAME_CHANNEL,
  APPLICATION_IFRAME_CONTRACT_VERSION_V3,
  APPLICATION_IFRAME_READY_EVENT,
  APPLICATION_IFRAME_QUERY_APPLICATION_ID,
  APPLICATION_IFRAME_QUERY_CONTRACT_VERSION,
  APPLICATION_IFRAME_QUERY_HOST_ORIGIN,
  APPLICATION_IFRAME_QUERY_IFRAME_LAUNCH_ID,
  createApplicationHostBootstrapEnvelopeV3,
  type ApplicationBootstrapPayloadV3,
  type ApplicationHostBootstrapEnvelopeV3,
} from '@autobyteus/application-sdk-contracts';

export type DevBootstrapSession = {
  hostOrigin: string;
  iframeLaunchId: string;
  localApplicationId: string;
  applicationId: string;
  applicationName: string;
  iframePath: string;
  launchQueryString: string;
  bootstrapEnvelope: ApplicationHostBootstrapEnvelopeV3;
};

const escapeHtml = (value: string): string => (
  value.replace(/[&<>\"]/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      default:
        return '&quot;';
    }
  })
);

const encodeScriptJson = (value: unknown): string => (
  JSON.stringify(value).replace(/</g, '\\u003c')
);

export const buildLaunchQueryString = (input: {
  applicationId: string;
  iframeLaunchId: string;
  hostOrigin: string;
}): string => {
  const searchParams = new URLSearchParams({
    [APPLICATION_IFRAME_QUERY_CONTRACT_VERSION]: APPLICATION_IFRAME_CONTRACT_VERSION_V3,
    [APPLICATION_IFRAME_QUERY_APPLICATION_ID]: input.applicationId,
    [APPLICATION_IFRAME_QUERY_IFRAME_LAUNCH_ID]: input.iframeLaunchId,
    [APPLICATION_IFRAME_QUERY_HOST_ORIGIN]: input.hostOrigin,
  });
  return searchParams.toString();
};

export const createDevBootstrapSession = (input: {
  hostOrigin: string;
  iframeLaunchId: string;
  localApplicationId: string;
  applicationId: string;
  applicationName: string;
  backendBaseUrl: string;
  backendNotificationsUrl: string | null;
  entryHtml?: string | null;
}): DevBootstrapSession => {
  const launchQueryString = buildLaunchQueryString({
    applicationId: input.applicationId,
    iframeLaunchId: input.iframeLaunchId,
    hostOrigin: input.hostOrigin,
  });
  const entryHtml = input.entryHtml?.trim() || 'index.html';
  const bootstrapPayload: ApplicationBootstrapPayloadV3 = {
    host: { origin: input.hostOrigin },
    application: {
      applicationId: input.applicationId,
      localApplicationId: input.localApplicationId,
      packageId: 'dev',
      name: input.applicationName,
    },
    iframeLaunchId: input.iframeLaunchId,
    requestContext: {
      applicationId: input.applicationId,
    },
    transport: {
      backendBaseUrl: input.backendBaseUrl,
      backendNotificationsUrl: input.backendNotificationsUrl,
    },
  };

  return {
    hostOrigin: input.hostOrigin,
    iframeLaunchId: input.iframeLaunchId,
    localApplicationId: input.localApplicationId,
    applicationId: input.applicationId,
    applicationName: input.applicationName,
    iframePath: `/ui/${entryHtml}?${launchQueryString}`,
    launchQueryString,
    bootstrapEnvelope: createApplicationHostBootstrapEnvelopeV3(bootstrapPayload),
  };
};

export const renderDevHostPage = (session: DevBootstrapSession): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(session.applicationName)} — AutoByteus dev host</title>
    <style>
      html, body { margin: 0; min-height: 100%; background: #020617; color: #e2e8f0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      .host-bar { display: flex; align-items: center; gap: 16px; padding: 10px 14px; background: #0f172a; border-bottom: 1px solid rgba(148, 163, 184, 0.24); font-size: 12px; }
      .host-bar strong { color: #93c5fd; }
      .status { margin-left: auto; color: #facc15; }
      iframe { display: block; width: 100vw; height: calc(100vh - 41px); border: 0; background: white; }
    </style>
  </head>
  <body>
    <div class="host-bar">
      <strong>AutoByteus dev iframe contract v3</strong>
      <span>applicationId: ${escapeHtml(session.applicationId)}</span>
      <span>iframeLaunchId: ${escapeHtml(session.iframeLaunchId)}</span>
      <span id="status" class="status">waiting for ${escapeHtml(APPLICATION_IFRAME_READY_EVENT)}</span>
    </div>
    <iframe id="application-frame" title="${escapeHtml(session.applicationName)} dev iframe" src="${escapeHtml(session.iframePath)}"></iframe>
    <script type="module">
      const iframe = document.getElementById('application-frame');
      const status = document.getElementById('status');
      const bootstrapEnvelope = ${encodeScriptJson(session.bootstrapEnvelope)};
      const constants = ${encodeScriptJson({
        channel: APPLICATION_IFRAME_CHANNEL,
        contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V3,
        readyEvent: APPLICATION_IFRAME_READY_EVENT,
        bootstrapEvent: APPLICATION_IFRAME_BOOTSTRAP_EVENT,
        applicationId: session.applicationId,
        iframeLaunchId: session.iframeLaunchId,
      })};
      let bootstrapped = false;

      window.addEventListener('message', (event) => {
        if (event.source !== iframe.contentWindow || event.origin !== window.location.origin || bootstrapped) {
          return;
        }
        const message = event.data;
        if (!message || message.channel !== constants.channel || message.contractVersion !== constants.contractVersion) {
          return;
        }
        if (message.eventName !== constants.readyEvent) {
          return;
        }
        if (message.payload?.applicationId !== constants.applicationId || message.payload?.iframeLaunchId !== constants.iframeLaunchId) {
          status.textContent = 'ready event did not match this iframe launch';
          status.style.color = '#f87171';
          return;
        }
        bootstrapped = true;
        iframe.contentWindow.postMessage(bootstrapEnvelope, window.location.origin);
        status.textContent = 'posted ' + constants.bootstrapEvent;
        status.style.color = '#86efac';
      });

      setTimeout(() => {
        if (!bootstrapped) {
          status.textContent = 'timed out waiting for iframe ready event';
          status.style.color = '#f87171';
        }
      }, 10000);
    </script>
  </body>
</html>
`;

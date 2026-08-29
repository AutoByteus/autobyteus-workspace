import { startApplication } from '@autobyteus/application-frontend-sdk';

const startupHandle = startApplication({
  rootElement: document.getElementById('app-root'),
  onBootstrapped: async ({ runtimeBootstrap, applicationClient, rootElement }) => {
    const appInfo = applicationClient.getApplicationInfo();
    const status = await applicationClient.backend.query('status');

    rootElement.innerHTML = `
      <section class="app-shell">
        <article class="app-card">
          <h1>${escapeHtml(runtimeBootstrap.application.name)}</h1>
          <p>
            This custom application started through the host-neutral AutoByteus runtime contract.
            Business UI begins only after <code>startApplication(...)</code> receives bootstrap data.
          </p>
          <pre>${escapeHtml(JSON.stringify({ appInfo, status }, null, 2))}</pre>
        </article>
      </section>
    `;
  },
});

window.addEventListener('pagehide', () => startupHandle.dispose(), { once: true });

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => {
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
  });
}

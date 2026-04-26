import { startHostedApplication } from '@autobyteus/application-frontend-sdk';

startHostedApplication({
  rootElement: document.getElementById('app-root'),
  onBootstrapped: async ({ bootstrap, applicationClient, rootElement }) => {
    const appInfo = applicationClient.getApplicationInfo();
    const status = await applicationClient.query('status');

    rootElement.innerHTML = `
      <section class="app-shell">
        <article class="app-card">
          <h1>${escapeHtml(bootstrap.application.name)}</h1>
          <p>
            This custom application started through the AutoByteus iframe contract v3.
            Business UI begins only after <code>startHostedApplication(...)</code> receives bootstrap data.
          </p>
          <pre>${escapeHtml(JSON.stringify({ appInfo, status }, null, 2))}</pre>
        </article>
      </section>
    `;
  },
});

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

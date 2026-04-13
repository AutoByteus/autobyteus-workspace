import { describe, expect, it } from 'vitest'
import {
  appendApplicationIframeLaunchHints,
  resolveApplicationAssetOrigin,
  resolveApplicationAssetUrl,
} from '../applicationAssetUrl'
import {
  APPLICATION_IFRAME_CONTRACT_VERSION_V1,
  APPLICATION_IFRAME_QUERY_APPLICATION_SESSION_ID,
  APPLICATION_IFRAME_QUERY_CONTRACT_VERSION,
  APPLICATION_IFRAME_QUERY_HOST_ORIGIN,
  serializeApplicationHostOrigin,
} from '~/types/application/ApplicationIframeContract'

describe('applicationAssetUrl', () => {
  it('resolves backend-served asset URLs from the bound REST base and appends topology hints', () => {
    const absoluteEntryHtmlUrl = resolveApplicationAssetUrl(
      '/application-bundles/sample-app/assets/ui/index.html',
      'http://127.0.0.1:43123/rest',
    )

    expect(absoluteEntryHtmlUrl).toBe(
      'http://127.0.0.1:43123/rest/application-bundles/sample-app/assets/ui/index.html',
    )
    expect(resolveApplicationAssetOrigin(absoluteEntryHtmlUrl)).toBe('http://127.0.0.1:43123')

    const iframeSrc = appendApplicationIframeLaunchHints(absoluteEntryHtmlUrl, {
      contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V1,
      applicationSessionId: 'app-session-123',
      hostOrigin: serializeApplicationHostOrigin('null'),
    })

    const launchUrl = new URL(iframeSrc)
    expect(launchUrl.searchParams.get(APPLICATION_IFRAME_QUERY_CONTRACT_VERSION)).toBe('1')
    expect(launchUrl.searchParams.get(APPLICATION_IFRAME_QUERY_APPLICATION_SESSION_ID)).toBe(
      'app-session-123',
    )
    expect(launchUrl.searchParams.get(APPLICATION_IFRAME_QUERY_HOST_ORIGIN)).toBe('null')
  })

  it('rejects legacy /rest-prefixed asset paths so packaged topology does not regress', () => {
    expect(() =>
      resolveApplicationAssetUrl(
        '/rest/application-bundles/sample-app/assets/ui/index.html',
        'http://127.0.0.1:43123/rest',
      ),
    ).toThrow('must not include a /rest prefix')
  })
})

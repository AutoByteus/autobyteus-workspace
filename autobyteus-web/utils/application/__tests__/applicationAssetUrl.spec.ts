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
  APPLICATION_IFRAME_QUERY_LAUNCH_INSTANCE_ID,
} from '~/types/application/ApplicationIframeContract'
import {
  doesApplicationHostOriginMatch,
  normalizeApplicationHostOrigin,
} from '~/utils/application/applicationLaunchDescriptor'

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
      launchInstanceId: 'app-session-123::launch-1',
      hostOrigin: normalizeApplicationHostOrigin('null', 'file:'),
    })

    const launchUrl = new URL(iframeSrc)
    expect(launchUrl.searchParams.get(APPLICATION_IFRAME_QUERY_CONTRACT_VERSION)).toBe('1')
    expect(launchUrl.searchParams.get(APPLICATION_IFRAME_QUERY_APPLICATION_SESSION_ID)).toBe(
      'app-session-123',
    )
    expect(launchUrl.searchParams.get(APPLICATION_IFRAME_QUERY_LAUNCH_INSTANCE_ID)).toBe(
      'app-session-123::launch-1',
    )
    expect(launchUrl.searchParams.get(APPLICATION_IFRAME_QUERY_HOST_ORIGIN)).toBe('file://')
  })

  it('normalizes packaged host origins and accepts the packaged file/null equivalence rule', () => {
    const expectedHostOrigin = normalizeApplicationHostOrigin('null', 'file:')
    expect(expectedHostOrigin).toBe('file://')
    expect(doesApplicationHostOriginMatch(expectedHostOrigin, 'null')).toBe(true)
    expect(doesApplicationHostOriginMatch(expectedHostOrigin, 'file://')).toBe(true)
    expect(doesApplicationHostOriginMatch(expectedHostOrigin, 'http://127.0.0.1:3000')).toBe(false)
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

/**
 * The app's icons, local in every build (autobyteus-279, AR-003, REQ-011): each Iconify collection the source names is
 * registered from the generated bundle (`scripts/build-icon-bundle.mjs`) before anything renders, and the Iconify API is
 * replaced by a module that fetches nothing: an icon the bundle lacks is a console error, never a network request.
 */
import { _api, addCollection, type IconifyJSON } from '@iconify/vue';
import bundle from '~/assets/icons/phone-icon-bundle.json';

type ApiParams = { type: 'icons'; provider: string; prefix: string; icons: string[] };

export default defineNuxtPlugin({
  name: 'local-icons',
  enforce: 'pre',
  setup() {
    // A JSON import is typed as a union of its literal shapes; the file is Iconify's own format, written by
    // `build-icon-bundle.mjs` from the `@iconify-json` sets (`buildIconBundle.spec.ts` checks it).
    for (const collection of bundle as unknown as IconifyJSON[]) addCollection(collection);
    _api.setAPIModule('', {
      prepare: (provider: string, prefix: string, icons: string[]): ApiParams[] => [{ type: 'icons', provider, prefix, icons }],
      send: (_host: string, params: ApiParams, callback: (status: 'abort', data: number) => void) => {
        console.error(`[icons] not in the local bundle: ${params.icons.map((name) => `${params.prefix}:${name}`).join(', ')}`);
        callback('abort', 404);
      },
    } as unknown as Parameters<typeof _api.setAPIModule>[1]);
  },
});

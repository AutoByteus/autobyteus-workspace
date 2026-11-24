import { ref, type Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import { isProtectedRemoteAccessResourceUrl } from '~/utils/remoteAccess/authorizedResourceUrl';
import { getShellBridge } from '~/utils/remoteAccess/shellBridge';

/**
 * How a video is played here (autobyteus-574 D-2):
 * - `native`: the phone app's own player streams it by range (it is a protected file of this node and the app has the player);
 * - `page`: the page plays it as before (a browser, an older app, another site's video, or no credential);
 * - `pending`: the app has not said yet whether it has the player; nothing is loaded meanwhile.
 */
export type VideoPlaybackMode = 'native' | 'page' | 'pending';

type AppVideoPlayer = 'asking' | 'present' | 'absent';

/** The app's answer, asked once per page: it does not change while the page is open. */
let appVideoPlayer: Ref<AppVideoPlayer> | null = null;

const appVideoPlayerState = (): Ref<AppVideoPlayer> => {
  if (appVideoPlayer) return appVideoPlayer;
  const bridge = getShellBridge();
  const state = ref<AppVideoPlayer>(bridge ? 'asking' : 'absent');
  appVideoPlayer = state;
  void bridge?.hello().then((hello) => {
    state.value = hello?.videoPlayer ? 'present' : 'absent';
  });
  return state;
};

/** The URL on this node's origin, absolute; `null` for another site's URL or one that does not parse. */
const nodeVideoUrl = (url: string): string | null => {
  try {
    const absolute = new URL(url, window.location.origin);
    return absolute.origin === window.location.origin ? absolute.toString() : null;
  } catch {
    return null;
  }
};

/** The file's name, for the player's title: the last segment of its `path` query (workspace and node files) or of the path. */
export const videoTitleOf = (url: string): string => {
  try {
    const parsed = new URL(url, 'http://node.invalid');
    const filePath = parsed.searchParams.get('path') ?? decodeURIComponent(parsed.pathname);
    return filePath.split(/[\\/]/).filter(Boolean).pop() ?? '';
  } catch {
    return '';
  }
};

/**
 * The page's one owner of native video playback (autobyteus-574 D-2, D-5). A viewer asks how a URL plays and, for
 * `native`, hands it to the app with `play`; the credential goes from the session to the bridge here, never through a
 * component.
 */
export function useNativeVideoPlayback(): {
  modeFor: (url: string | null | undefined) => VideoPlaybackMode;
  play: (url: string, title?: string) => boolean;
} {
  const app = appVideoPlayerState();
  const { activeCredential } = storeToRefs(useMobileNodeSessionStore());

  const modeFor = (url: string | null | undefined): VideoPlaybackMode => {
    const trimmed = url?.trim();
    if (!trimmed || app.value === 'absent' || !activeCredential.value) return 'page';
    if (!isProtectedRemoteAccessResourceUrl(trimmed) || !nodeVideoUrl(trimmed)) return 'page';
    return app.value === 'asking' ? 'pending' : 'native';
  };

  const play = (url: string, title: string = videoTitleOf(url)): boolean => {
    const bridge = getShellBridge();
    const credential = activeCredential.value;
    const absolute = nodeVideoUrl(url.trim());
    if (!bridge || !credential || !absolute || modeFor(url) !== 'native') return false;
    bridge.playVideo({ url: absolute, title, credential });
    return true;
  };

  return { modeFor, play };
}

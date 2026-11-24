import { ref, type Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import { isProtectedRemoteAccessResourceUrl } from '~/utils/remoteAccess/authorizedResourceUrl';
import { getShellBridge, type ShellMediaKind, type ShellMediaPlayer } from '~/utils/remoteAccess/shellBridge';

/**
 * How a video or audio file is played here (autobyteus-574 D-2, autobyteus-642 D-2):
 * - `native`: the phone app's own player streams it by range (a protected file of this node, of a type the app says its
 *   player plays);
 * - `page`: the page plays it as before (a browser, an older app, a type the app's player does not play, another site's
 *   file, or no credential);
 * - `pending`: the app has not said yet what its player plays; nothing is loaded meanwhile.
 */
export type MediaPlaybackMode = 'native' | 'page' | 'pending';

type AppMediaPlayer = 'asking' | 'absent' | ShellMediaPlayer;

/** The app's answer, asked once per page: it does not change while the page is open. */
let appMediaPlayer: Ref<AppMediaPlayer> | null = null;

const appMediaPlayerState = (): Ref<AppMediaPlayer> => {
  if (appMediaPlayer) return appMediaPlayer;
  const bridge = getShellBridge();
  const state = ref<AppMediaPlayer>(bridge ? 'asking' : 'absent');
  appMediaPlayer = state;
  void bridge?.hello().then((hello) => {
    state.value = hello?.mediaPlayer ?? 'absent';
  });
  return state;
};

/** The URL on this node's origin, absolute; `null` for another site's URL or one that does not parse. */
const nodeMediaUrl = (url: string): string | null => {
  try {
    const absolute = new URL(url, window.location.origin);
    return absolute.origin === window.location.origin ? absolute.toString() : null;
  } catch {
    return null;
  }
};

/**
 * The file's name: the last segment of the file path the URL names, which is its `path` query (workspace and node files:
 * `…/content?path=notes%2Fmemo.m4a`) or else its path (`…/static/site/intro.mp4`). The player's title, and its type.
 */
export const mediaTitleOf = (url: string): string => {
  try {
    const parsed = new URL(url, 'http://node.invalid');
    const filePath = parsed.searchParams.get('path') ?? decodeURIComponent(parsed.pathname);
    return filePath.split(/[\\/]/).filter(Boolean).pop() ?? '';
  } catch {
    return '';
  }
};

/** The lowercase extension of the file the URL names; `''` when it has none (autobyteus-642 N-4). */
const mediaExtensionOf = (url: string): string => {
  const name = mediaTitleOf(url);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
};

/**
 * The page's one owner of native media playback (autobyteus-574 D-2, D-5; autobyteus-642 D-2), for one kind of file. A
 * viewer asks how a URL plays and, for `native`, hands it to the app with `play`; the credential goes from the session to
 * the bridge here, never through a component. The app says which file types its player plays, per kind; any other type
 * plays in the page.
 */
export function useNativeMediaPlayback(kind: ShellMediaKind): {
  modeFor: (url: string | null | undefined) => MediaPlaybackMode;
  play: (url: string, title?: string) => boolean;
} {
  const app = appMediaPlayerState();
  const { activeCredential } = storeToRefs(useMobileNodeSessionStore());

  const modeFor = (url: string | null | undefined): MediaPlaybackMode => {
    const trimmed = url?.trim();
    const player = app.value;
    if (!trimmed || player === 'absent' || !activeCredential.value) return 'page';
    if (!isProtectedRemoteAccessResourceUrl(trimmed) || !nodeMediaUrl(trimmed)) return 'page';
    if (player === 'asking') return 'pending';
    return player[kind].includes(mediaExtensionOf(trimmed)) ? 'native' : 'page';
  };

  const play = (url: string, title: string = mediaTitleOf(url)): boolean => {
    const bridge = getShellBridge();
    const credential = activeCredential.value;
    const absolute = nodeMediaUrl(url.trim());
    if (!bridge || !credential || !absolute || modeFor(url) !== 'native') return false;
    bridge.playMedia({ kind, url: absolute, title, credential });
    return true;
  };

  return { modeFor, play };
}

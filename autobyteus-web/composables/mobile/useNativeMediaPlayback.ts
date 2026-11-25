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

/** The base name of `fileName` (a name or a path): the player's title. */
const baseNameOf = (fileName: string): string => fileName.split(/[\\/]/).filter(Boolean).pop() ?? '';

/** The lowercase extension of `fileName`; `''` when it has none. */
const extensionOf = (fileName: string): string => {
  const name = baseNameOf(fileName);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
};

/**
 * The page's one owner of native media playback (autobyteus-574 D-2, D-5; autobyteus-642 D-2), for one kind of file. A
 * viewer asks how a URL plays and, for `native`, hands it to the app with `play`; the credential goes from the session to
 * the bridge here, never through a component. The app says which file types its player plays, per kind; any other type
 * plays in the page. The caller names the file (`fileName`, a name or a path): a URL need not name it, as a message
 * reference's `…/references/<id>/content` does not (autobyteus-642 SR-004). Its extension decides the type, its base name
 * is the player's title.
 */
export function useNativeMediaPlayback(kind: ShellMediaKind): {
  modeFor: (url: string | null | undefined, fileName: string) => MediaPlaybackMode;
  play: (url: string, fileName: string) => boolean;
} {
  const app = appMediaPlayerState();
  const { activeCredential } = storeToRefs(useMobileNodeSessionStore());

  const modeFor = (url: string | null | undefined, fileName: string): MediaPlaybackMode => {
    const trimmed = url?.trim();
    const player = app.value;
    if (!trimmed || player === 'absent' || !activeCredential.value) return 'page';
    if (!isProtectedRemoteAccessResourceUrl(trimmed) || !nodeMediaUrl(trimmed)) return 'page';
    if (player === 'asking') return 'pending';
    return player[kind].includes(extensionOf(fileName)) ? 'native' : 'page';
  };

  const play = (url: string, fileName: string): boolean => {
    const bridge = getShellBridge();
    const credential = activeCredential.value;
    const absolute = nodeMediaUrl(url.trim());
    if (!bridge || !credential || !absolute || modeFor(url, fileName) !== 'native') return false;
    bridge.playMedia({ kind, url: absolute, title: baseNameOf(fileName), credential });
    return true;
  };

  return { modeFor, play };
}

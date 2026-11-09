import { useMobileNavigation } from '~/composables/mobile/useMobileNavigation';
import { openMobileFilePath } from '~/composables/mobile/mobileFileOpening';
import type { ContextAttachment } from '~/types/conversation';
import { contextAttachmentPresentation } from '~/utils/contextFiles/contextAttachmentPresentation';

/**
 * How a message's attachment opens on the phone (autobyteus-450 DS-001): in the phone's own viewer, loaded with the
 * phone's key, never by navigating the page to the node's file URL (which carries no key and, in the Android app, reads
 * as a rejected pairing).
 * - an uploaded file: the Files screen's attached-file entry;
 * - a path on the node: the phone's path open (a workspace file, or a node file elsewhere), as a file link opens;
 * - an external URL (another site): as everywhere, outside the page.
 *
 * Call it in setup: the phone navigation reads the route through `inject`.
 */
export function useMobileAttachmentOpening() {
  const mobileNavigation = useMobileNavigation();

  const open = async (attachment: ContextAttachment): Promise<void> => {
    if (!contextAttachmentPresentation.isOpenable(attachment)) return;
    if (attachment.kind === 'uploaded') {
      await mobileNavigation.openContextFile({ locator: attachment.locator, name: attachment.displayName });
      return;
    }
    if (attachment.kind === 'workspace_path' && attachment.locator.startsWith('/')) {
      const outcome = await openMobileFilePath({ absolutePath: attachment.locator, mobileNavigation, isOriginCurrent: () => true });
      if (outcome.status !== 'opened') console.warn(`[MobileAttachment] '${attachment.displayName}' could not be opened here (${outcome.status}).`);
      return;
    }
    contextAttachmentPresentation.openAttachment(attachment);
  };

  return { open };
}

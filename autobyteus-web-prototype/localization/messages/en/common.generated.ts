import type { TranslationCatalog } from '../../runtime/types';

const messages = {
  'common.components.common.CopyButton.tooltiptext': 'tooltipText',
  'common.components.common.ExpandableInstructionCard.togglelabel': 'toggleLabel',
  'common.components.common.FullScreenAudioModal.audio_player': 'Audio Player',
  'common.components.common.FullScreenAudioModal.close': 'Close',
  'common.components.common.FullScreenAudioModal.copybuttontitle': 'copyButtonTitle',
  'common.components.common.FullScreenAudioModal.no_audio_to_display': 'No audio to display.',
  'common.components.common.FullScreenAudioModal.your_browser_does_not_support_the': 'Your browser does not support the audio element.',
  'common.components.common.FullScreenImageModal.alttext': 'altText',
  'common.components.common.FullScreenImageModal.close': 'Close',
  'common.components.common.FullScreenImageModal.copybuttontitle': 'copyButtonTitle',
  'common.components.common.FullScreenImageModal.download': 'Download',
  'common.components.common.FullScreenImageModal.no_image_to_display': 'No image to display.',
  'common.components.common.FullScreenImageModal.reset_view': 'Reset View',
  'common.components.common.FullScreenVideoModal.close': 'Close',
  'common.components.common.FullScreenVideoModal.copy_url': 'Copy URL',
  'common.components.common.FullScreenVideoModal.copybuttontitle': 'copyButtonTitle',
  'common.components.common.FullScreenVideoModal.no_video_to_display': 'No video to display.',
  'common.components.common.FullScreenVideoModal.your_browser_does_not_support_the': 'Your browser does not support the video tag.',
  'common.components.common.ConfirmationModal.cancel': 'Cancel',
  'common.components.common.SearchableSelect.loading': 'Loading...',
  'common.components.common.SearchableSelect.searchplaceholder': 'searchPlaceholder',
  'common.components.ui.UiErrorPanel.no_additional_details': 'No additional details.',
  'common.components.ui.UiErrorPanel.no_errors_captured': 'No errors captured.',
} satisfies TranslationCatalog;

export default messages;

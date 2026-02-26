import type { CompleteResponse } from "autobyteus-ts/llm/utils/response-types.js";

export type FormattedExternalChannelReply = {
  text: string | null;
  metadata: Record<string, unknown>;
};

export class ExternalChannelReplyContentFormatter {
  format(response: CompleteResponse): FormattedExternalChannelReply {
    const normalizedText = normalizeReplyText(response.content);
    return {
      text: normalizedText,
      metadata: {
        hasReasoning: Boolean(response.reasoning && response.reasoning.trim().length > 0),
        imageCount: response.image_urls?.length ?? 0,
        audioCount: response.audio_urls?.length ?? 0,
        videoCount: response.video_urls?.length ?? 0,
      },
    };
  }
}

const normalizeReplyText = (value: string): string | null => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }
  return normalized;
};

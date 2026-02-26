import path from "node:path";
import { randomUUID } from "node:crypto";
import { BaseLLMResponseProcessor, type AgentContext } from "autobyteus-ts";
import type { LLMCompleteResponseReceivedEvent } from "autobyteus-ts/agent/events/agent-events.js";
import type { CompleteResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { SegmentEvent, SegmentType } from "autobyteus-ts/agent/streaming/segments/segment-events.js";
import { MediaStorageService } from "../../../services/media-storage-service.js";

const logger = {
  debug: (...args: unknown[]) => console.debug(...args),
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class MediaUrlTransformerProcessor extends BaseLLMResponseProcessor {
  private mediaStorageService: MediaStorageService;

  constructor() {
    super();
    this.mediaStorageService = new MediaStorageService();
    logger.debug("MediaUrlTransformerProcessor initialized.");
  }

  static override getName(): string {
    return "MediaUrlTransformerProcessor";
  }

  static override getOrder(): number {
    return 700;
  }

  static override isMandatory(): boolean {
    return true;
  }

  private async processUrlList(urls?: string[] | null): Promise<string[] | null> {
    if (!urls || urls.length === 0) {
      return null;
    }

    const tasks = urls.map(async (url) => {
      let cleanedStem = "";
      try {
        const parsedPath = new URL(url).pathname;
        const filename = path.basename(parsedPath);
        const ext = path.extname(filename);
        const stem = path.basename(filename, ext);

        if (ext && stem) {
          cleanedStem = stem
            .split("")
            .filter((char) => /[a-zA-Z0-9_-]/.test(char))
            .join("");
        }
      } catch {
        cleanedStem = "";
      }

      const desiredName = cleanedStem ? cleanedStem : `media_${randomUUID()}`;
      return this.mediaStorageService.storeMediaAndGetUrl(url, desiredName);
    });

    return Promise.all(tasks);
  }

  async processResponse(
    response: CompleteResponse,
    context: AgentContext,
    _triggeringEvent: LLMCompleteResponseReceivedEvent,
  ): Promise<boolean> {
    const agentId = context.agentId;

    try {
      const [newImageUrls, newAudioUrls, newVideoUrls] = await Promise.all([
        this.processUrlList(response.image_urls),
        this.processUrlList(response.audio_urls),
        this.processUrlList(response.video_urls),
      ]);

      if (newImageUrls) {
        response.image_urls = newImageUrls;
      }
      if (newAudioUrls) {
        response.audio_urls = newAudioUrls;
      }
      if (newVideoUrls) {
        response.video_urls = newVideoUrls;
      }

      logger.info(
        `Agent '${agentId}': MediaUrlTransformerProcessor successfully processed media URLs for the CompleteResponse.`,
      );
    } catch (error) {
      logger.error(
        `Agent '${agentId}': Error during media URL transformation: ${String(error)}`,
      );
    }

    this.emitMediaSegments(context, response.image_urls, "image");
    this.emitMediaSegments(context, response.audio_urls, "audio");
    this.emitMediaSegments(context, response.video_urls, "video");

    return false;
  }

  private emitMediaSegments(
    context: AgentContext,
    urls: string[] | null | undefined,
    mediaType: "image" | "audio" | "video",
  ): void {
    if (!urls || urls.length === 0) {
      return;
    }

    const notifier = context.statusManager?.notifier;
    if (!notifier) {
      logger.debug("MediaUrlTransformerProcessor: notifier not available for media segments.");
      return;
    }

    const cleanUrls = urls
      .map((url) => (typeof url === "string" ? url.trim() : ""))
      .filter((url) => url.length > 0);
    if (cleanUrls.length === 0) {
      return;
    }

    const segmentId = `media_${randomUUID()}`;
    const startEvent = SegmentEvent.start(segmentId, SegmentType.MEDIA, {
      media_type: mediaType,
      urls: cleanUrls,
    });
    notifier.notifyAgentSegmentEvent(startEvent.toDict());

    const endEvent = SegmentEvent.end(segmentId);
    notifier.notifyAgentSegmentEvent(endEvent.toDict());
  }
}

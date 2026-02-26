import { describe, expect, it, vi } from "vitest";
import { MediaUrlTransformerProcessor } from "../../../../../src/agent-customization/processors/response-customization/media-url-transformer-processor.js";
import { CompleteResponse } from "autobyteus-ts/llm/utils/response-types.js";
const mockMediaStorageService = vi.hoisted(() => ({
    storeMediaAndGetUrl: vi.fn(),
}));
vi.mock("../../../../../src/services/media-storage-service.js", () => {
    class MockMediaStorageService {
        storeMediaAndGetUrl = mockMediaStorageService.storeMediaAndGetUrl;
    }
    return {
        MediaStorageService: MockMediaStorageService,
    };
});
describe("MediaUrlTransformerProcessor", () => {
    it("derives filenames from clean URLs", async () => {
        mockMediaStorageService.storeMediaAndGetUrl.mockImplementation(async (_url, desiredName) => {
            return `http://server/${desiredName}.png`;
        });
        const processor = new MediaUrlTransformerProcessor();
        const response = new CompleteResponse({
            content: "",
            image_urls: ["http://example.com/happy_dog.png"],
            audio_urls: [],
            video_urls: [],
        });
        const context = { agentId: "test_agent" };
        await processor.processResponse(response, context, {});
        expect(response.image_urls).toEqual(["http://server/happy_dog.png"]);
    });
    it("falls back to media UUID for opaque URLs", async () => {
        mockMediaStorageService.storeMediaAndGetUrl.mockImplementation(async (_url, desiredName) => {
            return `http://server/${desiredName}.png`;
        });
        const processor = new MediaUrlTransformerProcessor();
        const response = new CompleteResponse({
            content: "",
            image_urls: ["http://example.com/api?id=123"],
            audio_urls: [],
            video_urls: [],
        });
        const context = { agentId: "test_agent" };
        await processor.processResponse(response, context, {});
        const newUrl = response.image_urls[0] ?? "";
        expect(newUrl.startsWith("http://server/media_")).toBe(true);
        expect(newUrl.length).toBeGreaterThan("http://server/media_.png".length);
    });
    it("processes multiple URLs concurrently", async () => {
        mockMediaStorageService.storeMediaAndGetUrl.mockImplementation(async (_url, desiredName) => {
            return `http://server/${desiredName}.png`;
        });
        const processor = new MediaUrlTransformerProcessor();
        const response = new CompleteResponse({
            content: "",
            image_urls: ["http://a.com/i1.jpg", "http://b.com/i2.jpg"],
            audio_urls: ["http://c.com/a1.mp3"],
            video_urls: [],
        });
        const context = { agentId: "test_agent" };
        await processor.processResponse(response, context, {});
        expect(response.image_urls).toEqual(["http://server/i1.png", "http://server/i2.png"]);
        expect(response.audio_urls).toEqual(["http://server/a1.png"]);
    });
    it("emits media segment events", async () => {
        mockMediaStorageService.storeMediaAndGetUrl.mockImplementation(async (_url, desiredName) => {
            return `http://server/${desiredName}.png`;
        });
        const processor = new MediaUrlTransformerProcessor();
        const response = new CompleteResponse({
            content: "",
            image_urls: ["http://example.com/happy_dog.png"],
            audio_urls: ["http://example.com/sound.mp3"],
            video_urls: [],
        });
        const notifyAgentSegmentEvent = vi.fn();
        const context = {
            agentId: "test_agent",
            statusManager: { notifier: { notifyAgentSegmentEvent } },
        };
        await processor.processResponse(response, context, {});
        const events = notifyAgentSegmentEvent.mock.calls.map((call) => call[0]);
        const startEvents = events.filter((event) => event.type === "SEGMENT_START");
        expect(startEvents.some((event) => event.segment_type === "media" &&
            event.payload?.metadata?.media_type === "image" &&
            event.payload?.metadata?.urls?.[0] === "http://server/happy_dog.png")).toBe(true);
        expect(startEvents.some((event) => event.segment_type === "media" &&
            event.payload?.metadata?.media_type === "audio" &&
            event.payload?.metadata?.urls?.[0] === "http://server/sound.png")).toBe(true);
    });
});

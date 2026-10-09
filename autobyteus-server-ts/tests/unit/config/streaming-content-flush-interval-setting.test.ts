import { afterEach, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  DEFAULT_STREAMING_CONTENT_FLUSH_INTERVAL_MS,
  STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY,
  normalizeStreamingContentFlushIntervalForPersistence,
  resolveStreamingContentFlushIntervalMs,
} from "../../../src/config/streaming-content-flush-interval-setting.js";

describe("streaming content flush interval setting", () => {
  it.each(["100", "500", "1000", "2000", "0500"])(
    "normalizes valid integer input %s",
    (raw) => {
      expect(normalizeStreamingContentFlushIntervalForPersistence(raw)).toEqual([
        true,
        String(Number(raw)),
      ]);
      expect(resolveStreamingContentFlushIntervalMs(raw)).toBe(Number(raw));
    },
  );

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([undefined, "", "   ", "99", "2001", "500.5", "5e2", "-500", "abc"])(
    "falls back for invalid runtime input %s",
    (raw) => {
      // Without runtime input the resolver reads the configured setting; make it
      // unset here so the result does not depend on the ambient configuration.
      const config = appConfigProvider.config;
      const readSetting = config.get.bind(config);
      vi.spyOn(config, "get").mockImplementation((key, defaultValue) =>
        key === STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY ? undefined : readSetting(key, defaultValue));
      expect(resolveStreamingContentFlushIntervalMs(raw)).toBe(
        DEFAULT_STREAMING_CONTENT_FLUSH_INTERVAL_MS,
      );
    },
  );

  it.each(["", "   ", "99", "2001", "500.5", "5e2", "-500", "abc"])(
    "rejects invalid persisted input %s",
    (raw) => {
      const result = normalizeStreamingContentFlushIntervalForPersistence(raw);
      expect(result[0]).toBe(false);
      expect(result[1]).toContain("100 through 2000");
    },
  );
});

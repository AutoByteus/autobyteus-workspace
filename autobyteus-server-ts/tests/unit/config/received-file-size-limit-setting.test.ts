import { afterEach, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  RECEIVED_FILE_MAX_MB_SETTING_KEY,
  normalizeReceivedFileMaxMbForPersistence,
  resolveReceivedFileMaxBytes,
} from "../../../src/config/received-file-size-limit-setting.js";

/** autobyteus-587 RF-4: the largest file this node accepts from another node, in MiB (default 2048, 1 through 4096). */
const MiB = 1024 * 1024;
const withSetting = (value: string | undefined) => {
  const config = appConfigProvider.config;
  const read = config.get.bind(config);
  vi.spyOn(config, "get").mockImplementation((key, defaultValue) => key === RECEIVED_FILE_MAX_MB_SETTING_KEY ? value : read(key, defaultValue));
};

describe("received file size limit setting", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it.each([["1", 1], ["512", 512], [" 4096 ", 4096], ["0100", 100]])("accepts %s MiB", (raw, mb) => {
    expect(normalizeReceivedFileMaxMbForPersistence(raw)).toEqual([true, String(mb)]);
    withSetting(raw);
    expect(resolveReceivedFileMaxBytes()).toBe(mb * MiB);
  });

  it.each([undefined, "", "0", "4097", "1.5", "-1", "2e3", "abc"])("refuses %s and reads the default 2048 MiB", (raw) => {
    if (raw !== undefined) expect(normalizeReceivedFileMaxMbForPersistence(raw)).toEqual([false, "Received file size limit must be a whole number of MiB from 1 through 4096."]);
    withSetting(raw);
    expect(resolveReceivedFileMaxBytes()).toBe(2048 * MiB);
  });
});

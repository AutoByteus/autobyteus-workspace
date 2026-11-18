import { afterEach, describe, expect, it } from 'vitest';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import { contextFileFailureMessage } from '../contextFileFailureMessage';
import type { ContextFileFailureGroup } from '../contextFileUploadFailure';

const MB = 1024 * 1024;
const group = (failure: ContextFileFailureGroup['failure'], ...fileNames: string[]): ContextFileFailureGroup => ({ key: failure.reason, failure, fileNames });
const message = (g: ContextFileFailureGroup) =>
  contextFileFailureMessage(g, (key, params) => localizationRuntime.translate(key, params), localizationRuntime.resolvedLocale.value);

describe('context-file failure messages', () => {
  afterEach(async () => { await localizationRuntime.setPreference('en'); });

  it('says each reason in English, with the names and the limit', async () => {
    await localizationRuntime.setPreference('en');
    expect(message(group({ reason: 'too_large', maxBytes: 2048 * MB }, 'VID_1.mp4', 'VID_2.mp4'))).toBe("Couldn't attach VID_1.mp4, VID_2.mp4: over the 2 GB size limit.");
    expect(message(group({ reason: 'unsupported_type' }, 'tool.exe'))).toBe("Couldn't attach tool.exe: this file type isn't supported.");
    expect(message(group({ reason: 'interrupted' }, 'a.mp4'))).toBe("Couldn't attach a.mp4: the upload was interrupted. Check your connection and try again.");
    expect(message(group({ reason: 'other' }, 'a.mp4'))).toBe("Couldn't attach a.mp4.");
  });

  it('says each reason in Simplified Chinese, with the names and the limit', async () => {
    await localizationRuntime.setPreference('zh-CN');
    expect(message(group({ reason: 'too_large', maxBytes: 2048 * MB }, 'VID_1.mp4', 'VID_2.mp4', 'VID_3.mp4')))
      .toBe('无法附加 VID_1.mp4, VID_2.mp4, VID_3.mp4：文件超过 2 GB 大小限制。');
    expect(message(group({ reason: 'too_large', maxBytes: 25 * MB }, 'b.pdf'))).toBe('无法附加 b.pdf：文件超过 25 MB 大小限制。');
    expect(message(group({ reason: 'unsupported_type' }, 'b.exe'))).toBe('无法附加 b.exe：不支持此文件类型。');
    expect(message(group({ reason: 'interrupted' }, 'a.mp4'))).toBe('无法附加 a.mp4：上传中断，请检查网络后重试。');
    expect(message(group({ reason: 'other' }, 'a.mp4'))).toBe('无法附加 a.mp4。');
  });
});

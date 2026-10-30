import { browserToolConverters } from "./browser-tool-converters.js";
import { discoveryToolConverters } from "./discovery-tool-converters.js";
import { mediaToolConverters } from "./media-tool-converters.js";
import { messageToolConverters } from "./message-tool-converters.js";
import type { PlatformToolConverter } from "./platform-line-parts.js";
import { projectTaskToolConverters } from "./project-task-tool-converters.js";

/**
 * The platform tools: tools every runtime can call under the same plain name, so their neutral line
 * is the same on every runtime (contract §3). Keyed by the name as recorded, written as literals, not
 * imported from the tools: a journal of an earlier run keeps the name a tool had then.
 */
export const platformToolConverters: ReadonlyMap<string, PlatformToolConverter> = new Map([
  ...messageToolConverters,
  ...projectTaskToolConverters,
  ...browserToolConverters,
  ...mediaToolConverters,
  ...discoveryToolConverters,
]);

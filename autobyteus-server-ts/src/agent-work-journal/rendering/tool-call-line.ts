import { genericToolLine } from "./generic-tool-line.js";
import { platformToolConverters } from "./platform/platform-tool-converters.js";
import type { BuiltInLine, RecordedCall, RecordedResult, RuntimeTranslation } from "./runtimes/runtime-translation.js";

/**
 * The line of one recorded tool call (contract §2): the one owner of the order in which the
 * lookup steps are tried.
 *
 *  1. the runtime unwraps its wrapper (`call_mcp_tool`);
 *  2. a name the runtime qualifies with a server (`server.tool`, `mcp__server__tool`) is another
 *     server's tool: the generic rule names the tool and its server, and it never reaches the
 *     platform table, so a user's tool that shares a platform tool's name is not mistaken for it;
 *  3. the runtime's own table (its built-in and runtime-only tools) comes before the platform's, because
 *     one name can be a tool of one runtime and an ordinary tool of another;
 *  4. the platform table: the same line on every runtime;
 *  5. the generic rule: any other tool.
 */
export const toolCallLine = (
  translation: RuntimeTranslation,
  recorded: RecordedCall,
  result: RecordedResult | null,
): BuiltInLine => {
  const call = translation.unwrapCall ? translation.unwrapCall(recorded) : recorded;
  const normalized = () => result ? translation.normalizeResult(result) : null;

  const qualified = translation.splitToolName?.(call.name) ?? null;
  if (qualified) return genericToolLine({ ...call, name: qualified.tool }, normalized(), qualified.server);

  const own = translation.builtInTools.get(call.name);
  if (own) return own(call, result);

  const platform = platformToolConverters.get(call.name);
  if (platform) return platform(call, normalized());

  return genericToolLine(call, normalized());
};

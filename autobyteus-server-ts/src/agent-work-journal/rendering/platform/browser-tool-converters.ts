import { asText } from "../command-text.js";
import { actionLine, readLine, type PlatformToolConverter } from "./platform-line-parts.js";

/** The browser tools (contract §3): `Browser: <what>` with the tab the call named. */

const tab = (args: Readonly<Record<string, unknown>>): string => ` (tab ${asText(args.tab_id) ?? "not recorded"})`;

const openTab: PlatformToolConverter = (call, result) =>
  readLine(`Browser: open ${asText(call.args.url) ?? "(URL not recorded)"}`, result);

const navigateTo: PlatformToolConverter = (call, result) =>
  actionLine(`Browser: go to ${asText(call.args.url) ?? "(URL not recorded)"}${tab(call.args)}`, result);

const closeTab: PlatformToolConverter = (call, result) =>
  actionLine(`Browser: close tab ${asText(call.args.tab_id) ?? "(not recorded)"}`, result);

const listTabs: PlatformToolConverter = (_call, result) => readLine("Browser: list tabs", result);

const readPage: PlatformToolConverter = (call, result) => readLine(`Browser: read page${tab(call.args)}`, result);

const screenshot: PlatformToolConverter = (call, result) => actionLine(`Browser: screenshot${tab(call.args)}`, result);

const domSnapshot: PlatformToolConverter = (call, result) => readLine(`Browser: page snapshot${tab(call.args)}`, result);

/** The script is under the line, then its result. */
const runScript: PlatformToolConverter = (call, result) => {
  const line = readLine(`Browser: run script${tab(call.args)}`, result);
  const script = asText(call.args.javascript);
  return script === null ? line : { ...line, parts: [{ kind: "message", text: script }, ...line.parts] };
};

const setDeviceEmulation: PlatformToolConverter = (call, result) =>
  actionLine(`Browser: set device emulation ${asText(call.args.mode) ?? "(mode not recorded)"}${tab(call.args)}`, result);

export const browserToolConverters: ReadonlyMap<string, PlatformToolConverter> = new Map([
  ["open_tab", openTab],
  ["navigate_to", navigateTo],
  ["close_tab", closeTab],
  ["list_tabs", listTabs],
  ["read_page", readPage],
  ["screenshot", screenshot],
  ["dom_snapshot", domSnapshot],
  ["run_script", runScript],
  ["set_device_emulation", setDeviceEmulation],
]);

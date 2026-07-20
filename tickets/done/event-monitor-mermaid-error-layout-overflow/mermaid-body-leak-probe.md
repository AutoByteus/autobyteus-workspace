# Mermaid Body-Leak Probe

## Purpose

This retained probe is investigation evidence for event-monitor-mermaid-error-layout-overflow. It isolates the browser-DOM behavior behind the reported outer bottom overflow without requiring a running Electron build.

## Setup

- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-mermaid-error-layout-overflow
- Mermaid package resolved by pnpm-lock.yaml: 11.12.3
- Setup command:

  ~~~bash
  pnpm install --offline --ignore-scripts --filter autobyteus
  ~~~

- The probe uses the installed Mermaid ESM bundle with JSDOM. It is not a product test and does not replace browser/Electron validation.

## Probe

The following behavior was executed with Mermaid initialized using the same relevant settings as the product service (startOnLoad: false, securityLevel: loose):

~~~js
for (let i = 0; i < 3; i += 1) {
  try {
    await mermaid.render('probe-invalid-' + i, 'this is not a valid mermaid diagram');
  } catch (error) {
    console.log(error.message);
  }
}
~~~

The equivalent disposable command was:

~~~bash
node /tmp/probe-mermaid-body-leak-three.mjs
~~~

## Observed Result

~~~text
caught-0: No diagram type detected matching given configuration for text: this is not a valid mermaid diagram
caught-1: No diagram type detected matching given configuration for text: this is not a valid mermaid diagram
caught-2: No diagram type detected matching given configuration for text: this is not a valid mermaid diagram
beforeChildren: 4
afterChildren: 4
leakedIds: [
  'app',
  'dprobe-invalid-0',
  'probe-invalid-0',
  'dprobe-invalid-1',
  'probe-invalid-1',
  'dprobe-invalid-2',
  'probe-invalid-2'
]
~~~

The leaked body nodes contain Mermaid's fallback error SVG with:

~~~text
Syntax error in text
mermaid version 11.12.3
~~~

A separate parse-only probe showed that mermaid.parse rejects the same invalid text without adding a body child. A second render probe initialized Mermaid with suppressErrorRendering: true and also left the body unchanged.

## Conclusion

The reported screenshot is reproducible at the underlying DOM boundary: each failed mermaid.render appends a fallback error diagram under document.body while also rejecting. The product's MermaidDiagram catches the rejection, but Mermaid's body-level fallback remains because the current service does not enable suppressErrorRendering. The leaked nodes extend document height outside the application's intentionally bounded layout, so the user sees an outer bottom scroll area and repeated Mermaid error cards. This does not indicate router or URL mutation.

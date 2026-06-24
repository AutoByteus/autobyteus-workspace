# Release Notes: Browser MCP Activity Result Fix

- Fixed Browser MCP Activity details so successful `run_script` and other serializable Browser tool results show the actual structured result instead of a false `[Circular]` placeholder.
- Preserved legitimate literal `[Circular]` string results and kept true circular payloads safely represented without crashing event streaming or run-history projection.
- Strengthened backend regression coverage for shared result references, Browser MCP result normalization, runtime memory projection, and GraphQL run-history projection.

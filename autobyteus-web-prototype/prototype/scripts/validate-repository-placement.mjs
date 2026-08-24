#!/usr/bin/env node
// Historical compatibility entry point. Current RER-015 ownership is
// validated by validate-workspace-ownership.mjs.
await import('./validate-workspace-ownership.mjs')

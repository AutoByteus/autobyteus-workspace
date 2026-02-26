# Mandatory Processor Defaults (TypeScript)

## Purpose

Agent definitions store processor lists, but some processors are mandatory and should not appear as optional user-specified values.

## TS Implementation

- Filter helper: `src/agent-definition/utils/processor-defaults.ts`
- Service usage: `src/agent-definition/services/agent-definition-service.ts`

## Behavior

- On create/update/read paths, optional processor lists are normalized.
- Mandatory processors remain enforced by registry configuration.
- API responses avoid exposing mandatory defaults as user-editable noise.

## Registries

Processor defaults are sourced from registries imported from `autobyteus-ts`.

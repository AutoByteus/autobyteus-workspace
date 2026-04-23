# Run Config Runtime/Model Fields Regression Design

## Current-State Read

The merged application-owned-runtime-orchestration work reused a shared UI component:

- `RuntimeModelConfigFields.vue`

for two different responsibilities:

1. **normal platform run/definition configuration**
   - agent run config
   - team run config
   - definition launch preferences

2. **application-specific launch/setup configuration**
   - host-managed application resource/default setup

To support the application setup surface, the shared component was extended with app-specific visibility toggles:

- `showRuntimeField`
- `showModelField`
- `showModelConfigSection`

Because those were optional boolean props in the current Vue prop model, omitted values defaulted unsafely for existing callers and hid the fields in unrelated platform run configuration.

## Problem Statement

The problem is not that all reuse is bad.

The problem is that **field-presence policy** for two different product surfaces was centralized into one shared component whose default semantics were not safe for older callers.

That means the application feature gained the power to accidentally change the ordinary agent/team run flow.

## Design Goal

Restore a clear ownership boundary:

- **platform run configuration** owns agent/team run semantics
- **application setup** owns app launch/default setup semantics

The application surface must not be able to redefine the platform run-config surface through shared default behavior.

## Chosen Design

### 1. Separate the top-level form responsibility

Keep application setup on its own dedicated boundary.

Preferred target:

- new dedicated application-only component such as:
  - `ApplicationLaunchDefaultsFields.vue`
  - or equivalent app-owned launch-defaults section under `components/applications/`

This component owns:

- optional runtime field presence based on slot declaration
- optional model field presence based on slot declaration
- optional workspace default field presence based on slot declaration
- application-mode locked `autoExecuteTools = true` presentation

It must **not** redefine the generic run-config component API.

### 2. Restore `RuntimeModelConfigFields.vue` to stable run/definition semantics

`RuntimeModelConfigFields.vue` should return to being a stable shared component for surfaces where runtime/model/model-config are core concepts.

That means its default behavior should be:

- runtime field present
- model field present
- model-config section present

And it should not carry app-specific field-presence policy as its main extension point.

### 3. If sharing remains, share lower-level primitives only

If code reuse is still desirable, reuse below the policy boundary, for example:

- runtime selector primitive
- model selector primitive
- model config section primitive

But the **decision of which fields exist** should live in:

- the run-config surface for agent/team run config, or
- the application setup surface for application launch defaults

not inside one mixed multi-purpose wrapper.

### 4. Immediate containment fix

The fixing branch may first apply a narrow containment fix so users recover quickly.

Acceptable immediate containment:

- remove the new `show*` props from `RuntimeModelConfigFields.vue`, or
- give them explicit runtime defaults that preserve legacy behavior for omitted callers.

But the shipped ticket should still land the stronger boundary cleanup, not only the hotfix, because the bug exposed a real ownership problem.

## Concrete File Direction

### Restore / harden platform run configuration

- `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue`
- `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`
- `autobyteus-web/components/launch-config/DefinitionLaunchPreferencesSection.vue`
- `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue`

### Move application-specific field policy into application-owned host UI

- `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue`
- add dedicated app-specific subcomponent if needed:
  - `autobyteus-web/components/applications/ApplicationLaunchDefaultsFields.vue`

## Test / Validation Design

Required durable validation:

1. `AgentRunConfigForm.spec.ts`
   - asserts runtime selector exists
   - asserts model selector exists

2. `TeamRunConfigForm.spec.ts`
   - asserts runtime selector exists
   - asserts model selector exists

3. application setup spec
   - asserts app setup still supports conditional field visibility without breaking run config

4. optional shared-component spec
   - if any shared visibility API remains, assert omitted props preserve intended defaults explicitly

## Rejected Design

### Rejected: keep one multipurpose shared component and just “be more careful”

Rejected because this exact bug already proves that the mixed boundary is too easy to break.

### Rejected: let application setup continue to drive visibility in the run-config component

Rejected because application-specific slot/default semantics should not own platform run-config semantics.

## One-Sentence Decision

The fix should do more than restore missing selectors: it should re-separate **application launch setup** from **platform run configuration** so application-specific field policy can no longer leak into agent/team run configuration through a shared component default bug.

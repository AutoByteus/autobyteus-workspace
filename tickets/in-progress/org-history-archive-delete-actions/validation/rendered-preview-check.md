# IR-001 rendered preview check

- Date: 2026-09-21 (Europe/Berlin)
- Surface: actual `WorkspaceAgentOrgHistoryCollection.vue` rendered through a temporary local Nuxt preview page against disposable in-memory props. The temporary page was removed after inspection.
- Browser: Chrome through the local development renderer at `127.0.0.1`; no user profile/server data was read or changed.
- Desktop/default viewport:
  - stopped root retained its unified primary summary row;
  - Archive/Delete were discoverable on focus and aligned before the relative time;
  - active root exposed Stop only;
  - focus outline/visibility and labels were coherent with the existing Team action language.
- Narrow viewport: explicit 390 x 844 viewport showed Archive/Delete without hover dependency, with no label/time collision or row overflow.
- Interactions:
  - mouse activation of Archive updated only the disposable action witness and did not open/collapse the row;
  - Tab moved focus from Archive to Delete;
  - Enter activated Delete through native button semantics;
  - accessibility tree exposed `Archive Agent Org history` and `Delete Agent Org history permanently` and active `Stop Agent Org`.
- Browser console/network qualification: the surrounding normal workspace shell reported expected `Failed to fetch` messages because the isolated preview deliberately did not start a backend. The previewed component and interactions remained rendered and functional.
- Result: PASS for implementation-level visual/interaction inspection. This is not downstream API/E2E acceptance and does not validate real durable deletion.

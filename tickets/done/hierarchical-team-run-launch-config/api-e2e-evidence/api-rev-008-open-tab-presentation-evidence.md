# API-REV-008 AutoByteus `open_tab` Presentation Evidence

## Owned Environment

- Current source: `cf527998f58d05a34925abc7b5fa2ccf1c3b1fa5` (IR-009 presentation state).
- Actual AutoByteus browser tool: `open_tab`, tab `3efdcb`.
- Current Nuxt renderer: `http://127.0.0.1:58924`, proxied only to the owned backend on `http://127.0.0.1:58849`.
- Backend/profile owner: the official Electron E2E launcher using `/private/tmp/autobyteus-api-rev-008-owned`; the already-running user application on port 29695 was not used or modified.
- Private read-only fixture discovered through the inherited package roots: `nested-classroom-test` / `Nested Classroom Test Team`, including nested Team `/StudentStudyGroup`.
- No secrets were imported and no external provider run was started. API-REV-006's real Codex Luna / AutoByteus DeepSeek message, delegation, API, and V2-disk proof remains the functional baseline because IR-009 changed presentation only.

## Direct Browser Results

1. **Root quiet form and order — Pass.** The visible root labels were strictly ordered at Y positions `16`, `94`, `190.5`, `288.5`, `484.5`, and `575.5`: Team Definition, Runtime, Default LLM Model (Global), Workspace Directory, Auto approve tools, Team Members Override (3). The root form and root-fields containers both use the quiet `space-y-4` composition. `Root Team defaults`, a root `/` identity line, `Effective`, and `Customized fields` were absent.
2. **Disclosure defaults and semantics — Pass.** On first rendering, `Team Members Override (3)` had `aria-expanded="false"` and `aria-controls="team-member-overrides-panel"`. One click exposed the hierarchy. `/StudentStudyGroup` then rendered its identity, TEAM marker, canonical address, indentation, `Inherited` state, and a nested disclosure with `aria-expanded="false"` / `aria-controls="team-scope-StudentStudyGroup-panel"`.
3. **Actual nested controls — Pass.** One nested-disclosure activation exposed the real Runtime, Default LLM Model, Workspace Directory, and Auto approve tools controls plus both nested Agent override groups. No `Effective` or `Customized fields` summary was present.
4. **Inherited / Customized / Reset — Pass.** Toggling only the actual `/StudentStudyGroup` auto-approve switch changed the exact Team override to `{autoExecuteTools:false}`, the header to `Customized`, and exposed Reset with accessible name `Reset settings for StudentStudyGroup (/StudentStudyGroup)`. Reset removed the override, returned the header and switch to `Inherited` / checked, removed Reset, and retained expansion.
5. **Exact-address non-happy state — Pass.** Selecting New only at `/StudentStudyGroup` and entering whitespace left root `/` in Existing mode, disabled Run Team, and produced `WORKSPACE_REQUIRED` with `subjectAddress: "/StudentStudyGroup"`, `subjectKind: "TEAM"`, and exact visible message `Enter a workspace path to run this team.` Restoring nested Existing removed the blocker. A second controlled owned-page probe used the public catalog-error store action and rendered `Could not load models for /StudentStudyGroup: API-REV-008 scoped catalog probe` with enabled Retry, then restored the prior ready state.
6. **Disabled/read-only state — Pass.** A controlled owned-page in-flight-state probe, without provider or GraphQL launch, caused the actual form to render `Selected team run configuration is read-only. Start a new team run to use different runtime or model settings.` Root controls, nested controls, and Reset were disabled; the nested disclosure itself remained enabled and inspectable. The injected state and override were removed afterward.
7. **ARIA and focus order — Pass.** Both disclosure `aria-controls` values resolved to existing panels; the nested section's `aria-labelledby` resolved to its existing heading. With the hierarchy expanded, DOM/tab order followed root controls -> outer disclosure -> direct Agent controls -> nested Team disclosure -> nested Team controls -> nested Agent controls. When the nested Team was collapsed, its only visible focusable was the disclosure. When the outer hierarchy was collapsed, it exposed zero descendant focusables.
8. **Narrow geometry and sticky reachability — Pass.** The browser supplied a real `1040 x 738` CSS-pixel viewport (DPR 2) during the narrow capture. The configuration panel was `667px` wide with `scrollWidth === clientWidth`; the customized nested section was `633px` wide with the same equality. Disclosure and Reset overlap area was zero, the document had no horizontal overflow, and at the bottom of the form the last nested control retained `72.09px` clearance above Run Team.

## Visual Artifacts

- `api-rev-008-open-tab-desktop-root-collapsed.png`
- `api-rev-008-open-tab-members-nested-collapsed.png`
- `api-rev-008-open-tab-nested-expanded-inherited.png`
- `api-rev-008-open-tab-nested-customized.png`
- `api-rev-008-open-tab-nested-new-empty.png`
- `api-rev-008-open-tab-read-only.png`
- `api-rev-008-open-tab-narrow-nested-customized.png`

The machine-readable observations are in `api-rev-008-browser-presentation-result.json`.

## Result And Limits

- Presentation result: **Pass**.
- Repository-resident durable coverage changed in API-REV-008: **No**.
- Proportional test-code review of API-REV-008: **Not Applicable** unless the reviewer identifies an artifact/report issue; no test source changed.
- This independent result does not replace the explicitly required hands-on user verification of the rebuilt candidate before delivery finalization.

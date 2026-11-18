# Solution Revision Record — integrations-page (autobyteus-337)

## Revision Index

| Revision ID | Phase | Trigger | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-337, 2026-10-30 | N/A | Ready for Approval | REQ-001…REQ-010, AC-001…AC-007, DEC-001…DEC-006 | DEC-001 and DEC-002 asked to the user |
| SR-002 | Requirements (Product integration) | The Product Team's Design Completed, approved by the user 2026-10-31 | Ready for Approval | Ready for Approval (DEC-001, DEC-002 open) | UI section; REQ-001…REQ-010 unchanged | Approved UI/UX linked; three integration decisions |
| SR-003 | Requirements (approval) | The user decided DEC-001 (a) and DEC-002 (Yes) | Ready for Approval | **Approved** | DEC-001, DEC-002, REQ-005, UI section | Architecture design next |
| SR-004 | Design | Requirements approved (SR-003) | N/A | Design Ready, awaiting the user's approval | DS-001…DS-005 | `design-spec.md`; asked to the user before review |
| SR-005 | Requirements (user change) | The user, 2026-11-01: no built-in link; import from a link like agent packages | Approved (SR-003) | Approved (SR-005); the UI needs a Product revision; the design needs revision | REQ-001…REQ-003, REQ-009; DEC-011…DEC-013 | Product revision requested |
| SR-006 | Requirements (user change, via the Product review) | The user in the r2 review: local folders too | Approved (SR-005) | Approved (SR-006) | REQ-003, DEC-012, DEC-014, DEC-015 | Answered to the Product designer |
| SR-007 | Design (revision) | SR-005/SR-006 changes | Needs Revision | Ready, waiting for the r2 UI approval and the user's design approval | DS-001…DS-006 | `design-spec.md` rewritten |
| SR-008 | Requirements + Design (Product r2 integration) | r2 approved by the user | Ready | **Ready**, routed to architecture review | UI section, Web section | Skills `integrationId` field added |
| SR-009 | Requirements alignment + Design (revision) | ARCH-REV-001 Fail | Ready | Ready | AC-001, AC-002, QR-002, SCN-001, DEC-017; DS-001, DS-002, DS-005, interfaces, refusal texts | Back to architecture review |

## Revision Entries

### SR-001 — Baseline

- Trigger: the Task (the user's direction for one card per integration; install from the card; access follows the skill; the card leaves Server Settings) and the PTM's message.
- Inputs: the delivered manifest contract (`autobyteus-integrations` `8887475`), integrations-1's verification (REQ-010 there), and 311 step 1's code.
- Approval: pending, for DEC-001 (who decides where a token goes) and DEC-002 ("all installed skills" agents).
- 2026-10-31, the user: "maybe we work on the ui first? … you can task @Product Team to work on the UI?" Classified as `Product Design Requested` (New Request). Delegated to `/product_team` with `product-design-request.md`, `requirements-doc.md` and `investigation-notes.md`.
  - Team run `product_team_b6c6a7919cdf4df1a0e28c907cb13c19`; coordinator `product_ui_ux_designer_e1cb1547128a44a2b50b7dcb0b014d49`.
  - No task_id: this work is part of autobyteus-337.
  - DEC-001 and DEC-002 stay open with the user and are marked as open in the brief.
- 2026-10-31, the Product designer asked, during the user's review, about empty states, order and listing rules, and the connect step. Decided within the direction as DEC-007…DEC-010 (requirements), and answered to the designer.

### SR-002 — The approved UI/UX integrated

- Product result: the spec, 19 references and a runnable reference in `/Users/normy/autobyteus_org/autobyteus-web-design`, commits `365a8ac0b9` and `31fc0bc54b`. Approved by the user: "its much better now. approve".
- Verified:
  - the spec links the runnable reference and the final references;
  - the spec and the ticket record name the same repository, ticket and approval;
  - DEC-007…DEC-010 were applied as stated;
  - the requirements needed no change.
- Integration decisions: the chip text is kept; focus return is required; the menu-height fix is in scope.
- Still open with the user: DEC-001, DEC-002.
- The delegated design has no Task of its own to close (this work is part of 337).
- 2026-10-31, the user decided DEC-001 = (a): "app keeps the rule, which is definitely true. That's really, really much higher security." He asked how DEC-002's recommendation would be enforced; the mechanism was explained (below), and his answer is pending.

### SR-003 — Requirements approved

- DEC-001 = (a), the app keeps the rule (the user, 2026-10-31).
- DEC-002 = Yes, the user, 2026-11-01: the installed integration's skill is a normal skill, and "all installed skills" agents can use it too. REQ-005 now says "effective skills".
- The approved design's "all installed" line is removed, as its spec foresaw for this answer.
- Next: the architecture design, then the user's approval of the design (Task: "Design first; the user approves the design before the build"), then review.

### SR-004 — Architecture design

- Design: an integration catalog (remote latest per commit plus the installed copy, validated by the manifest contract, joined with the delivery definitions and connections); install through `SkillSourceService`; a per-integration connection service; one `IntegrationAccessRule`, full at run start (effective skills, with the official source's copy only) and cheap per call (the definition's scope and names, disabled, source active); a GraphQL clean cut; the web page per the approved spec.
- Evidence: `loadCatalog` rebuilds from disk on every lookup, hence the two-form rule. The public transport allows `api.github.com`.
- Classification: Large / High.
- User approval of the design: pending (Task: "the user approves the design before the build").

### SR-005 — Import from a link (the user's change)

- The user, 2026-11-01: "I don't think it's a good idea. We directly put that GitHub link inside the system … it should be down to the user … here you can import from this link, and then click Import … like how we import agent package."
- Then he asked whether to import as a skill source or as integrations, and accepted the recommendation ("Sounds good"). He confirmed the understanding: an integration skill is a normal skill plus a connection, shown on two pages.
- Changed: REQ-001, REQ-002, REQ-003, REQ-009. DEC-003, DEC-004, DEC-007 and DEC-009 are superseded or revised. DEC-011, DEC-012 and DEC-013 are added.
- The UI change goes to the Product Team as a revision of the approved design (recommended, accepted: "Sounds good").
- `design-spec.md` (SR-004) needs revision after the Product result.
- 2026-11-01: the revision was delegated to `/product_team` with `product-design-request-r2.md`.
  - Team run `product_team_f6086981a3b047a6a101d4dea94ee96f`; coordinator `product_ui_ux_designer_b6a5165b0a5043c394650958313894e9`.
  - `design-spec.md` is marked `Needs Revision`.

### SR-006 — Local folders too

- The user, in the Product designer's r2 review (2026-11-01): "Can they also use, if they develop integrations on their local system, just like skills and agent packages? So I guess we should support both, support both local and also GitHub."
- REQ-003 now takes a GitHub link or a folder path; DEC-012 is extended.
- DEC-014 (decided): Remove on a local source unlinks it; files are never deleted; no Update.
- DEC-015 (decided): removing a source also removes its integrations' tokens, from either page, and the confirmation says so.

### SR-007 — Design revised for import from a link or a folder

- Removed the remote catalog reader (cards are read from imported sources only).
- Import goes through `SkillSourceService` with a named `requireIntegrationFolder` option, checked before publication (GitHub) or before registration (folder).
- A removal observer in `SkillSourceService` disconnects a source's integrations before removal on either page; a failed disconnect refuses the removal (DEC-015).
- Access: the resolved skill's `rootPath` must be the integration's folder; the per-call check also requires the run's source to still be registered.
- Done in parallel with the Product r2 review; the web section is reconciled when the approved r2 result arrives. Then the user's approval of the design is asked, before review.
- 2026-11-01: the user asked about updates. DEC-016 was added: an update that drops an integration removes its connection, and a failure refuses the update. The design gained `sourceChanging`, which covers automatic updates too.
- The user approved the technical design: "if you think it's reasonable, then I would already approve … if you think all of the things are consistent now, and I would also approve". He was told it is consistent. The r2 UI approval is still needed in the Product review, then the package goes to architecture review.

### SR-008 — The approved r2 integrated

- The r2 result was verified:
  - the spec is `Approved` with the user's words, and the designer's consistency check is recorded;
  - 35 references; commits `6ad06427f1` and `2f31380eb9`;
  - the runnable reference is linked;
  - DEC-011…DEC-015 were applied.
- The design was reconciled:
  - the Skills page label needs `integrationId` per skill, set by the catalog;
  - Manage Skill Sources removal goes through DS-005 (already in the design);
  - the shared modal behavior is used for the three dialogs.
- The user's design approval (2026-11-01) stands. The package goes to architecture review (Large / High).
- The Product delegations have no Tasks of their own to close (this work is part of 337).
- Before the handoff, the Task was re-read. A comment of 2026-10-30 moved integrations-1's AC-009 here: the teammate-way install through the page (list and comment on the test repository), and the README rewrite in `AutoByteus/autobyteus-integrations`. Added as AC-008 and AC-009, and in the design's scope and tests. The test-vault token already has write access to the test repository (integrations-1 UP-001).

### SR-009 — Revision after ARCH-REV-001

- AR-001: AC-001, AC-002, QR-002 and SCN-001 aligned with REQ-002, REQ-009 and the approved r2 UI. The design header is refreshed; the scope contradiction about the integrations repository is removed; the Skills label is now approved.
- AR-002: `IntegrationCatalog.import` owns the input and outcome classification (the mapping table). It returns only newly imported integrations.
- AR-003: only `https:` links in `token.help`, from text nodes, through the external-link path; `javascript:` and `data:` are tested.
- AR-004: DEC-017. The Integrations import refuses a second source with the same integration ID; the catalog keeps the earliest entry for Skills-page cases; removal and update disconnect only the kept entry.
- AR-005: the refusal texts are rewritten, with the name from the manifest.
- AR-006: `addSkillSource` and `removeSkillSource` become async, and their resolvers too.
- R-4 recorded. No change to the user-approved intent, so no new user approval is needed.
- ARCH-REV-002 (2026-11-01): Pass. AR-007 fixed (2 DS-002 mentions now use `{reservedIds}`). AR-008 fixed: "earliest" means the skill catalog's source precedence. AR-009 fixed: the requirements status lines record SR-009. The reviewer handed the package to the Implementation Engineer.

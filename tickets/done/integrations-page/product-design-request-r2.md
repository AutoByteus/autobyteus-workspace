# Product Design Request (revision) — Integrations page, import from a link (autobyteus-337)

- From: Solution Designer (run `solution_designer_9a83b5676cdb4488a7e25094626f527c`)
- Purpose: `New Request`, a revision of the approved design (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/integrations-page/`, approved 2026-10-31) after the user changed the intended behavior on 2026-11-01
- The user asked for this revision on 2026-11-01. His answer to the recommendation "the Product Team updates the design and shows it to you again": "Sounds good".

## The user's change, in his words

"How do you plan to make this integration able to be seen on the card? … it's a GitHub repository link … I don't think it's a good idea. We directly put that GitHub link inside the system. I think it should be down to the user how they want to. When they want to import … here you can import from this link, and then click Import … So basically, it's like how we import agent package."

He also agreed that an integration is imported as a skill source underneath but shown and managed as integrations, and that the same skill appears on the Skills page (as a skill) and on the Integrations page (its card and connection).

## What changes in the design (requirements SR-005: REQ-001, REQ-002, REQ-003, REQ-009; DEC-011…DEC-013)

- **Import.** The page has an **Import** action: the user pastes a GitHub repository link and imports it, the way agent packages and skill sources are imported today.
  - A repository with no integration in it is refused: "No integrations in this repository", and nothing is imported.
  - Import errors are shown, for example a skill-name clash, or GitHub unreachable with the reason.
- **No built-in repository** and no "Not installed" cards. A card exists only for an imported integration. That includes integrations from a repository imported on the Skills page.
- **Card states:** Installed, needs a token · Connected as @login · Needs a newer AutoByteus. The Install action on a card is gone.
- **Manage.** The page has a **Manage** action listing the imported sources that contain integrations, with Update and Remove (the skill-source operations). Remove removes the whole source and its skills.
- **Empty state.** With nothing imported, the page invites Import.
- **No repository-unreachable states for the cards**, because cards are read locally. The network matters only for Import and Update.
- **Trust.** AutoByteus still decides where a token may go, so an imported repository can't send the token elsewhere. Its scripts can still use the service as the user, so the import surface may say to import only repositories you trust.

## What stays as approved

The card grid and card anatomy, one action per card (Connect / Manage / Check for updates), the integration dialog with its three steps and the tools row, the token form (DEC-010), the menu position after Nodes, the left-menu height fix, and focus return.

## Open question for the design

Should the Skills page mark an integration's skill, for example with a small "Integration" label linking to its card? The recommendation is a small label. It's the designer's and the user's call.

## Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/integrations-page/tickets/in-progress/integrations-page/requirements-doc.md` (SR-005)
- The approved design to revise: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/integrations-page/ui-ux-spec.md` and `visual-references/`
- Existing import patterns in the app (read only), at worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/integrations-page`: the agent package import (`autobyteus-web/components/settings/AgentPackagesManager.vue`) and the Skills page's Manage Skill Sources dialog

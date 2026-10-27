# Skill Improvement Request: the Solution Designer must challenge requirements its evidence contradicts

- **From:** Solution Designer, run `solution_designer_80624588913d473bac3ef7d8c3d4d305`, 2026-10-27, at the user's request.
- **Raised in:** Project Task `autobyteus-185` (ticket `work-journal-search`).
- **Skill package to change:** `autobyteus-agents` repository, `agent-teams/software-engineering-team/agents/solution-designer/`: `skills/solution-designer/SKILL.md`, `references/requirements-engineering.md` (a link into the team's `shared/` folder), `templates/requirements-doc-template.md`, `templates/investigation-notes-template.md`. Possibly `agent.md`.

## What Happened

1. **The Task asked** that each memory search result show "how strong and by what kind of match (text or meaning)". The Project Task Manager wrote it down from the user's idea; it was direction, not a verified technical fact.
2. **The investigation measured the opposite.** The evaluation report (§ 5.3) showed that embedding scores have no absolute meaning: unrelated questions scored 0.74–0.83, real answers 0.80–0.92. The same lesson was already recorded in `autobyteus-71` (FO-001).
3. **The Solution Designer did not challenge the requirement.**
   - It wrote R-002 as "each match with its strength". It explained the evidence away as "show words, not a number", although three words are only a number in three bands.
   - The Product Team (not technical) designed Strong / Fair / Weak on that basis, and the user approved the page.
4. **The cost:**
   - an API/E2E failure (F-001);
   - three calibration rounds (SR-005, SR-005b, SR-005c), each with an implementation escalation;
   - per-model threshold tables;
   - two architecture reviews and a code review on that machinery;
   - passing margins of ±0.0078 and ±0.0022;
   - finally, a paused implementation.
5. **How it ended:** the user asked "is it really possible to know strong or weak using embedding?" and removed the labels (UD-020). The replacement is factual: the matched words, "related by meaning", and the words found in no journal. That solution was available on day one.
6. **The user's view of the role (2026-10-27, paraphrased):**
   - The Project Task Manager and the Product Team give perhaps 80% of the direction; they are not technical.
   - The Solution Designer does the experiments and knows the details, so its job is to take the requirements to 100% correct: fill in what is missing and correct what is wrong, challenging any piece that investigation shows is not feasible or achievable.

## Gaps In The Current Skill

| Where | What it says now | Gap |
| --- | --- | --- |
| `requirements-engineering.md`, Investigation Rules | "Treat feasibility findings as evidence. Do not silently weaken an intended outcome because the current code makes it inconvenient." | It only warns against weakening an outcome. There is no duty to **challenge** an outcome that evidence shows is infeasible or unreliable, nor any rule for how to do it. |
| `SKILL.md` step 1 | "Technical feasibility investigation is appropriate before approval" | Optional ("appropriate"). Feasibility is not required **per requirement**, and the requirement promises are not traced to the experiments that prove them. |
| `SKILL.md` approval step | The Solution Designer approves within the direction | The incoming direction is treated as correct by default. Nothing says that the request's wording is a hypothesis to verify, or that the Solution Designer completes and corrects it. |
| Product integration | The Product request passes the requirements on | Feasibility risks are not passed to the Product Team, so a non-technical designer can turn an unproven claim into visible UI (here: three strength levels). |
| Downstream recovery | Design Impact → revise the design | No stop rule. After repeated failed fixes of the same requirement, the skill does not ask whether the requirement itself is wrong. The designer kept tuning. |
| Test-case quality | — | "Expected absent" cases were not verified by count, so the test that would have exposed the problem early was faulty (N01 "kubernetes" occurs in 301 runs). |
| Templates | Requirements template: "Known feasibility or integration risks" (free text, in the architecture input) | There is no per-requirement field for the proof or the evidence, and no "challenged / corrected requirement" record. |

## Proposed Changes (For The Skill Owner To Refine)

1. **Role statement** (`SKILL.md` and `agent.md`):
   - The Solution Designer owns the **correctness and completeness** of the requirements, not only their recording.
   - Incoming direction (user, Project Task Manager, Product) is treated as intent.
   - The Solution Designer fills in what is missing and corrects what its evidence contradicts.
2. **Feasibility gate per requirement, before approval:**
   - Each requirement that promises an outcome depending on uncertain technology (model output, ranking, classification, a "confidence" or "relevance" grade, performance, an external service) names the experiment or evidence that shows it is achievable.
   - A requirement without that proof is not `Approved`; it is `Unclear` or challenged.
   - Add a column to the requirements template (`Feasibility evidence`).
3. **Challenge rule:**
   - When evidence contradicts or does not support a requested outcome, the Solution Designer raises it with the user **before approval**, whoever wrote the requirement.
   - The challenge has three parts: the evidence (numbers); what can be delivered instead (a concrete alternative); and the decision needed.
   - It must not keep the wording and reinterpret it ("words, not a number").
   - The challenge and the decision are recorded as a user decision (UD) and in the revision record.
4. **Model-output judgements:** any requirement that grades, labels or filters results from scores (embeddings, rerankers, LLM judgements) is checked against measured score distributions of positive and verified-negative cases before approval. Overlapping distributions mean that no absolute grade can be promised.
5. **Product handoff:** the Product design request lists the feasibility status of each requirement, and the unproven ones are marked, so that the Product Team designs no visible element on an unproven claim.
6. **Stop rule in recovery:** after a second failed correction of the same requirement or behavior (for example repeated calibration), the Solution Designer stops tuning and re-examines the requirement itself, with the user if intended behavior may change.
7. **Negative test cases:** "expected absent / off-topic" cases are verified by count against the real data before use.
8. **Design case:** add this case (strength labels from embedding scores) to the skill's examples as a worked example of a requirement that should have been challenged.

## Evidence (In The Ticket Folder)

`/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search/tickets/in-progress/work-journal-search/`:
- `solution-revision-record.md` (SR-004 to SR-006, with the lesson);
- `requirements-doc.md` (R-002, UD-017, UD-019, UD-020);
- `design-spec.md` § Match Facts (SR-006);
- `memory-search-evaluation-report.md` § 5.3;
- `api-e2e-execution-coverage-report.md` (F-001);
- `implementation-revision-record.md`;
- `evidence/IMP-18` to `IMP-24`.

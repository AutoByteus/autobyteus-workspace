# Flat AgentTeam And AgentOrg Boundary — Concept Supplement

## Status And Authority

- Status: `Draft`
- Type: intended-behavior and scenario supplement
- Approval applicability: requires approval with `requirements.md`
- Purpose: make the proposed simplification concrete enough for the receiving team to test, refine, and design without reconstructing the brainstorming conversation.

## Proposed Domain Boundary

```text
Agent
  one worker

AgentTeam
  one flat collaboration unit
  members: Agents only
  coordinator: one direct Agent
  internal handoffs: natural-language edges whose sources are Agents

AgentOrg
  one organization/composition boundary
  members: independent Agents and flat AgentTeams
  coordinator: none
  cross-member handoffs: natural-language edges whose sources are Agents
```

Containment expresses organizational home. Handoff edges express operational relationships. Workflow complexity does not require recursive Team containment.

## Representative Product Company

```text
Product Company — AgentOrg
├── chief_executive_officer                       (independent Agent)
├── product_design_team                           (flat AgentTeam)
│   ├── product_designer                          (coordinator)
│   ├── ux_researcher
│   ├── interaction_designer
│   ├── product_prototyper
│   └── design_reviewer
├── software_engineering_team                     (flat AgentTeam)
│   ├── requirements_engineer                     (recommended coordinator)
│   ├── architecture_designer
│   ├── implementation_engineer
│   ├── code_reviewer
│   ├── api_e2e_engineer
│   └── delivery_engineer
├── marketing_team                                (flat AgentTeam)
│   ├── marketing_strategist                      (coordinator)
│   ├── market_researcher
│   ├── brand_designer
│   ├── content_marketer
│   └── growth_marketer
├── sales_team                                    (flat AgentTeam)
│   ├── sales_director                            (coordinator)
│   ├── sales_development_representative
│   ├── account_executive
│   ├── solutions_consultant
│   └── revenue_operations_analyst
└── finance_team                                  (flat AgentTeam)
    ├── chief_financial_officer                   (coordinator)
    ├── financial_planning_analyst
    ├── financial_controller
    ├── accountant
    └── procurement_specialist
```

The CEO is an organization leader but not a runtime coordinator for AgentOrg. If executive leadership later needs to operate as a collaboration unit, it can be another flat AgentTeam coordinated by the CEO; the same CEO placement should not be duplicated at both root and Team scope without an explicit identity design.

## Representative Addresses

```text
/chief_executive_officer
/product_design_team/product_designer
/software_engineering_team/requirements_engineer
/software_engineering_team/delivery_engineer
/marketing_team/marketing_strategist
/sales_team/sales_director
/finance_team/chief_financial_officer
```

An AgentOrg member Team can be targeted at its Team address and resolves through its coordinator:

```text
/software_engineering_team
  -> /software_engineering_team/requirements_engineer
```

The exact standalone TeamRun root-address representation must be preserved or adapted according to the existing collaboration contract; this supplement does not override the current address contract.

## Representative Cross-Team Handoffs

```json
{
  "handoffs": [
    {
      "from": "/sales_team/account_executive",
      "to": "/software_engineering_team/requirements_engineer",
      "rules": [
        "Send validated customer needs here when they should become product or implementation requirements."
      ]
    },
    {
      "from": "/product_design_team/product_prototyper",
      "to": "/software_engineering_team/architecture_designer",
      "rules": [
        "Send approved implementation-ready prototypes here for technical design."
      ]
    },
    {
      "from": "/software_engineering_team/code_reviewer",
      "to": "/software_engineering_team/requirements_engineer",
      "rules": [
        "Return work here when review exposes a material requirement gap."
      ]
    },
    {
      "from": "/software_engineering_team/delivery_engineer",
      "to": "/marketing_team",
      "rules": [
        "Send completed releases here when launch communication is required."
      ]
    },
    {
      "from": "/software_engineering_team/delivery_engineer",
      "to": "/sales_team",
      "rules": [
        "Send a release here when sales enablement or customer rollout should begin."
      ]
    },
    {
      "from": "/finance_team/chief_financial_officer",
      "to": "/chief_executive_officer",
      "rules": [
        "Escalate material financial risk or investment decisions requiring executive direction."
      ]
    }
  ]
}
```

The stored contract remains natural-language `from`/`to` handoffs. Runtime rule lookup should project outgoing rules for the requesting Agent. This ticket does not redesign the complete AgentOrg handoff compiler.

## Why Nested Configured AgentTeams Appear Over-Engineered

Before AgentOrg, a synthetic root AgentTeam is the only available way to assemble multiple Teams and independent Agents. That forces organization concerns into Team semantics:

- an organization-like root must declare a coordinator;
- every child Team creates another TeamRun scope and default configuration;
- definition resolution, cycle detection, launch planning, runtime construction, persistence, termination, and UI all recurse;
- coordinator and routing concerns are repeated at each containment boundary;
- visual grouping becomes executable lifecycle structure even when handoff edges already express collaboration.

AgentOrg supplies the missing composition owner, allowing AgentTeam to return to one bounded collaboration unit.

## Important Distinction: Configured Versus Task-Scoped Nesting

This simplification targets:

```text
Configured AgentTeam definition
  -> configured child AgentTeam member
  -> recursively materialized configured TeamRun
```

It does not automatically target:

```text
Agent delegates one bounded task to an AgentTeam
  -> task-scoped Team execution
  -> task settles and returns a result
```

The latter may remain valid even when every reusable AgentTeam definition is flat. The design must trace and inventory both before removing shared recursive types or persistence projections.

## Proposed Sequencing

1. Approve the flat AgentTeam and AgentOrg boundary.
2. Investigate configured nesting usage, persisted data, task delegation, and concurrent dynamic-Team work.
3. Make native AgentOrg capable of replacing organization-like synthetic root Teams.
4. Convert supported current organization configurations to AgentOrg plus flat AgentTeams.
5. Contract AgentTeam definition/API/UI to Agent members only.
6. Simplify configured Team launch/runtime/persistence while preserving supported flat-Team and task-delegation outcomes.
7. Remove obsolete recursive configured-Team code, docs, and coverage in the same clean-cut transition.

## Questions The Receiving Team Must Resolve

1. Is AgentOrg implemented first, or is the AgentOrg introduction and AgentTeam contraction one coordinated release?
2. What is the approved outcome for existing nested definitions and historical nested TeamRuns?
3. Which current recursive structures are shared with task delegation and therefore must remain or be split?
4. Does Team-local child-Team packaging own resources that need a new home?
5. Should department grouping be non-runtime metadata, a later AgentOrg feature, or omitted?

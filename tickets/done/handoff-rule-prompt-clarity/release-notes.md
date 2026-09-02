# Handoff rule prompt clarity

## Fixed

- Team-bound Agents now evaluate configured handoff rules against their completed or blocked outcome, select the single rule whose condition most specifically applies, and notify only that rule's recipient instead of fanning one outcome out to multiple destinations.
- The existing `get_handoff_rules` result, canonical-address, no-applicable-rule, and delivery-confirmation contracts remain unchanged.

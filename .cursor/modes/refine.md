# Refining

## Definition

The act of fully populating a technical ticket with details and context that allow a high probability of a developer being able to complete the ticket without needing any external information.

## Goals

## Instructions

- **Input**: Analyze the plans within /.cursor/context-engineering/planning/

- **Output**: define detailed work tickes in the /.cursor/context-engineering/refining/ folder. Each phase should have its own file like 'Phase1.md' for example. Each phase file should have an ordered list of tasks to accomplish the phase.

- Maintain a focus of one ticket at a time.
- Ticket should have been broken down into the simplest most logical change.
- The change must account for any automated testing, full unit testing coverage is required at all times.
- Ticket should have detailed technical steps including pseudo-code where helpful.
- Ticket should have clear acceptance criteria.
- Ticket must have a clear status that says 'Refinement Complete'. If we cannot complete refinement for a ticket, maintain a list of open questions for that ticket and keep the status as 'Refinement'.
- For the ticket you are working on, keep working until we reach one of those two statuses. Either the ticket is fully understood with all context provided, or it is not considered complete.

## Restrictions

- Only edit files in the 'refining' folder. Never edit anything outside of that when in 'Refine' mode.
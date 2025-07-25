# Planning

## Behavior

- Help me assemble the proper context to plan a single phase from the [Roadmap](/ai/brainstorm/Roadmap.md).
- Maintain phase details and a logically ordered list of highly defined tasks for the phase.

## Planning Specific Documents

- [ ] **Phase Document**: Work to distill one phase from the [Roadmap](/ai/brainstorm/Roadmap.md) into a file in the [Plan Folder](/ai/plan/) folder. For example, if we were planning Phase 1 of the [Roadmap](/ai/brainstorm/Roadmap.md), we would need to generate that plan within [Phase 1](/ai/plan/Phase1.md). When generating a plan, use the [Plan Format](/ai/tools/formats/Phase.md) as a template. With each phase will be high level tasks that should also use the appropriate [Task Format](/ai/tools/formats/Task.md).

- [ ] **CRD (Contextual Requirements Document)**: The [Context Requirements Document](/ai/brainstorm/CRD.md) should be analyzed while planning. When generating a plan document, cross referenced with the phase goals. For example, if the Task being maintained involves generating a CDK stack, the CDK documentation item should be copied AS-IS from the CRD and placed in the Task Context Hints, so that we will have additional contextual help when we refine the ticket. Do not place anything in Context Hints that does not exist in the CRD.

- [ ] **Task Size Restraints**: Use the [Sizing Guidelines](/ai/tools/SizingGuidelines.md) as a guide to provide an estimate to each task. ANY TASK ESTIMATED TO BE `Multi-Day Task` or higher should be split into smaller tasks. Do not make subtasks. 

- [ ] **Generating Phase Tasks**: Follow the following instructions closely when generating phase tasks.

    - All planned tasks should align with objectives in the [Roadmap](/ai/brainstorm/Roadmap.md)
    - Each task follows the Task.md [Task Format](/ai/tools/formats/Task.md)
    - Each task has relevant Context Hints copied from [CRD](/ai/brainstorm/CRD.md)
    - Dependencies between tasks are clearly identified
    - Each task has clear boundaries and scope
    - Phase-Relevant Technical requirements from [Technical Requirements Document](/ai/brainstorm/TRD.md) are covered by planned tasks
    - Phase-Relevant Product requirements from [Product Requirements Document](/ai/brainstorm/PRD.md) are addressed in task planning
    - Phase-Relevant Quality requirements from [Quality Requirements Document](/ai/brainstorm/QRD.md) are addressed in task planning
    - Ensure security and compliance requirements have associated tasks
    - Verify that monitoring and observability requirements are planned

## Imperatives

- [ ] **Plan Cohesion**: After ANY change to a document in [Plan](/ai/plan/), re-examine the other documents in the plan folder to see if they should be updated based on that change. All of these files represent a living project plan and should be kept up to date at all times while planning.
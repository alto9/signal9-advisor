# Format Templates

This directory contains the format templates used by the different modes in the context engineering workflow.

## Format Files Overview

### Roadmap.md
**Used by**: Brainstorm mode
**Purpose**: Template for creating high-level project roadmaps with strategic planning, phase overviews, and dependencies.

**Key Sections**:
- Project Overview and Strategic Context
- Phase Overview (multiple phases)
- Technical Architecture Overview
- Security and Compliance
- Risk Assessment and Mitigation
- Success Metrics and KPIs

### QRD.md
**Used by**: Brainstorm mode
**Purpose**: Template for creating quality requirements documents that define testing strategies, quality tools, and quality assurance requirements.

**Key Sections**:
- Quality Engineering Overview
- Testing Strategy (Testing Pyramid, Testing Types)
- Quality Tools and Infrastructure
- Test Data Management
- Quality Gates and Criteria
- Quality Metrics and KPIs
- Risk-Based Testing
- Compliance and Standards
- Continuous Quality Improvement

### Phase.md
**Used by**: Plan mode
**Purpose**: Template for detailed phase planning with an array of tasks.

**Key Sections**:
- Phase Details and Overview
- Business Context and Technical Scope
- Implementation Strategy and Quality Assurance
- Risk Management and Exit Criteria
- **Tasks Array** (following Task.md format)

### Task.md
**Used by**: Plan mode (within Phase.md)
**Purpose**: Template for high-level task planning within a phase.

**Key Sections**:
- Task Description and Context Hints
- Objectives and Scope
- Dependencies and Estimated Effort
- Success Criteria

### Ticket.md
**Used by**: Refine mode
**Purpose**: Template for detailed implementation tickets with complete technical specifications.

**Key Sections**:
- Detailed Description and Context Hints
- Technical Details (Implementation Steps, Architecture, Security, Performance)
- Dependencies and Testing Requirements
- Acceptance Criteria and Error Handling
- Monitoring and Observability

## Workflow Integration

### Brainstorm Mode → Roadmap.md, QRD.md
- Creates high-level project planning
- Defines phases and strategic objectives
- Establishes dependencies and success metrics
- Defines quality strategy and testing requirements

### Plan Mode → Phase.md (with Task.md)
- Converts roadmap phases into detailed phase files
- Populates each phase with an array of tasks
- Each task follows the Task.md format
- Includes context hints from Context.md

### Refine Mode → Ticket.md
- Converts tasks into detailed implementation tickets
- Each ticket follows the Ticket.md format
- Files named as Phase{N}Task{M}.md (e.g., Phase1Task1.md)
- Includes comprehensive technical specifications

## File Naming Conventions

- **Roadmap**: `brainstorm/Roadmap.md`
- **QRD**: `brainstorm/QRD.md`
- **Phases**: `plan/Phase{N}.md` (e.g., `plan/Phase1.md`)
- **Tickets**: `tickets/Phase{N}Task{M}.md` (e.g., `tickets/Phase1Task1.md`)

## Context Integration

All formats include sections for context hints that reference items from `Context.md`:
- **Context Hints**: List relevant items using format "Category - Item Title"
- **Cross-referencing**: Maintains traceability between requirements and implementation
- **Best Practices**: Incorporates external references and implementation guides

## Quality Assurance

Each format includes quality assurance requirements:
- **Testing Requirements**: Unit, integration, performance, and security testing
- **Acceptance Criteria**: Measurable and testable criteria
- **Monitoring**: Observability and logging requirements
- **Documentation**: Required documentation updates 
# Context Engineering

A structured approach to project planning and implementation using AI-assisted context engineering. This system provides a systematic workflow for breaking down complex projects from high-level strategy to detailed implementation tickets.

## Overview

Context Engineering is a methodology that leverages AI to systematically plan, organize, and execute software projects. It transforms vague project ideas into detailed, actionable implementation plans through a three-phase workflow:

1. **Brainstorm** - High-level project planning and requirements gathering
2. **Plan** - Detailed phase breakdown with task arrays
3. **Refine** - Implementation-level ticket creation

## Workflow Modes

### 🧠 Brainstorm Mode
**Purpose**: Transform project ideas into comprehensive project roadmaps and requirements documents.

**Outputs**:
- `PRD.md` - Product Requirements Document
- `TRD.md` - Technical Requirements Document  
- `CRD.md` - Contextual references and best practices
- `Roadmap.md` - High-level project roadmap with phases

**Key Activities**:
- Market analysis and user story development
- Technical architecture decisions
- Phase identification and dependencies
- Risk assessment and mitigation strategies
- Success metrics and KPI definition

### 📋 Plan Mode
**Purpose**: Convert roadmap phases into detailed implementation plans with task arrays.

**Outputs**:
- `plan/Phase{N}.md` - Detailed phase files with task arrays

**Key Activities**:
- Phase-level planning using the Phase.md template
- Task breakdown following the Task.md format
- Context hint integration from Context.md
- Dependency mapping between tasks
- Effort estimation and prioritization

### 🔧 Refine Mode
**Purpose**: Convert high-level tasks into detailed implementation tickets.

**Outputs**:
- `tickets/Phase{N}Task{M}.md` - Detailed implementation tickets

**Key Activities**:
- Task-to-ticket conversion using the Ticket.md template
- Detailed technical specifications
- Comprehensive testing requirements
- Acceptance criteria definition
- Implementation step documentation

## File Structure

```
ai/
├── README.md                    # This file
├── brainstorm/                  # Brainstorm mode outputs
│   ├── PRD.md                  # Product Requirements Document
│   ├── TRD.md                  # Technical Requirements Document
│   ├── Context.md              # External references and best practices
│   └── Roadmap.md              # High-level project roadmap
├── plan/                       # Plan mode outputs
│   ├── Phase1.md               # Detailed phase 1 with tasks
│   ├── Phase2.md               # Detailed phase 2 with tasks
│   └── ...                     # Additional phases
├── tickets/                    # Refine mode outputs
│   ├── Phase1Task1.md          # Implementation ticket 1.1
│   ├── Phase1Task2.md          # Implementation ticket 1.2
│   └── ...                     # Additional tickets
└── tools/                      # Workflow tools and templates
    ├── formats/                # Format templates
    │   ├── README.md           # Format documentation
    │   ├── Roadmap.md          # Roadmap template
    │   ├── Phase.md            # Phase template
    │   ├── Task.md             # Task template
    │   └── Ticket.md           # Ticket template
    └── modes/                  # Mode definitions
        ├── brainstorm.md       # Brainstorm mode instructions
        ├── plan.md             # Plan mode instructions
        └── refine.md           # Refine mode instructions
```

## Getting Started

### 1. Initialize Your Project
Start by creating the basic folder structure:
```bash
mkdir -p brainstorm plan tickets
```

### 2. Begin with Brainstorm Mode
Use brainstorm mode to create your initial project documentation:
- Define your product requirements in `PRD.md`
- Document technical requirements in `TRD.md`
- Gather external references in `Context.md`
- Create your project roadmap in `Roadmap.md`

### 3. Move to Plan Mode
For each phase in your roadmap:
- Create detailed phase files in `plan/Phase{N}.md`
- Break down phases into tasks using the Task.md format
- Include context hints and dependencies

### 4. Complete with Refine Mode
For each task in your phases:
- Create detailed tickets in `tickets/Phase{N}Task{M}.md`
- Add comprehensive technical specifications
- Define testing requirements and acceptance criteria

## Key Principles

### Context-Driven Development
- All planning incorporates relevant context from external sources
- Best practices and implementation guides are integrated throughout
- Cross-referencing maintains traceability between requirements and implementation

### Quality-First Approach
- Comprehensive testing requirements at every level
- Clear acceptance criteria and success metrics
- Security and performance considerations built-in

### Iterative Refinement
- Each mode builds upon the previous one
- Ambiguities are resolved progressively
- Continuous validation and review processes

## Template System

The workflow uses standardized templates to ensure consistency:

- **Roadmap.md** - Strategic project planning template
- **Phase.md** - Phase planning template with task arrays
- **Task.md** - High-level task planning template
- **Ticket.md** - Detailed implementation ticket template

Each template includes sections for:
- Context hints and external references
- Dependencies and relationships
- Quality assurance requirements
- Success criteria and acceptance criteria

## Best Practices

### Context Management
- Keep Context.md updated with relevant external references
- Use consistent formatting for context hints: "Category - Item Title"
- Cross-reference context items throughout the planning process

### File Naming
- Use consistent naming conventions: `Phase{N}.md` and `Phase{N}Task{M}.md`
- Maintain clear version control and change tracking
- Document any deviations from standard templates

### Quality Assurance
- Include unit testing requirements in all tickets
- Define measurable acceptance criteria
- Consider security, performance, and monitoring requirements
- Plan for error handling and edge cases

## Integration with Development

The context engineering workflow integrates seamlessly with development processes:

- **CI/CD Integration**: Tickets include deployment and testing requirements
- **Code Review**: Acceptance criteria guide review processes
- **Monitoring**: Observability requirements are built into tickets
- **Documentation**: Each level includes documentation requirements

## Troubleshooting

### Common Issues
- **Missing Context**: Ensure Context.md is populated with relevant references
- **Incomplete Templates**: Follow the full template structure for each format
- **Ambiguous Requirements**: Use brainstorm mode to clarify before planning
- **Dependency Gaps**: Review phase dependencies before creating tickets

### Validation Checklist
- [ ] All templates follow the format specifications
- [ ] Context hints are properly referenced
- [ ] Dependencies are clearly identified
- [ ] Testing requirements are comprehensive
- [ ] Acceptance criteria are measurable
- [ ] File naming follows conventions

## Contributing

To improve the context engineering workflow:
1. Update templates in `tools/formats/`
2. Enhance mode instructions in `tools/modes/`
3. Add new context categories to Context.md
4. Improve documentation and examples

## License

This context engineering system is part of the cursor-context-engineering project.

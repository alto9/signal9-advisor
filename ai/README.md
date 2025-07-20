# Context Engineering

A structured approach to project planning and implementation using AI-assisted context engineering. This system provides a systematic workflow for breaking down complex projects from high-level strategy to detailed implementation tickets.

## Overview

Context Engineering is a methodology that leverages AI to systematically plan, organize, and execute software projects. It transforms vague project ideas into detailed, actionable implementation plans through a three-phase workflow:

1. **Brainstorm** - High-level project planning and requirements gathering
2. **Plan** - Detailed phase breakdown with task arrays
3. **Refine** - Implementation-level ticket creation

## Signal9 Advisor Project: 3-Epic Structure

The Signal9 Advisor project is structured as a learning journey across three major epics, each building upon the previous one:

### 🎯 Epic 1: Foundational Data Analysis (Rule-Based)
**Focus**: Financial analysis using rule-based algorithms and traditional programming
**Timeline**: Weeks 1-8
**Learning Goals**: Financial analysis, data processing, system architecture

**Key Components**:
- Financial health analysis (debt ratios, profitability metrics, cash flow analysis)
- Risk assessment models (volatility analysis, sector risk, market correlation)
- Peer comparison algorithms (industry benchmarking, relative valuation)
- Technical analysis indicators (moving averages, RSI, MACD, volume analysis)
- Basic user interface for displaying analysis results

**Technology Stack**:
- AWS Lambda for data processing
- DynamoDB for data storage
- AlphaVantage API for financial data
- Alpaca API for portfolio data
- React frontend with Material-UI
- Rule-based scoring algorithms

**Success Criteria**:
- Working financial analysis platform
- Accurate calculation of financial metrics
- Responsive user interface
- Reliable data pipeline from APIs

### 🧠 Epic 2: News & Sentiment Analysis (NLP Integration)
**Focus**: Natural language processing for market sentiment analysis
**Timeline**: Weeks 9-16
**Learning Goals**: NLP, AI model integration, sentiment analysis

**Key Components**:
- News sentiment analysis using pre-trained NLP models
- Market sentiment aggregation and scoring
- News relevance filtering and categorization
- Sentiment-based risk adjustments
- Enhanced user interface with sentiment insights

**Technology Stack**:
- Pre-trained NLP models (BERT, RoBERTa, or similar)
- News API integration
- Sentiment analysis libraries
- Enhanced data models for sentiment storage
- Real-time sentiment processing

**Success Criteria**:
- Accurate sentiment analysis of financial news
- Integration with existing financial analysis
- Improved risk assessment with sentiment factors
- Enhanced user experience with sentiment insights

### 🔮 Epic 3: Predictive AI (Advanced ML)
**Focus**: Machine learning for predictive analytics and forecasting
**Timeline**: Weeks 17-24
**Learning Goals**: Machine learning, predictive modeling, model training

**Key Components**:
- Price prediction models using historical data
- Trend forecasting algorithms
- Anomaly detection systems
- Portfolio optimization recommendations
- Advanced visualization and reporting

**Technology Stack**:
- Custom ML models (scikit-learn, TensorFlow, or PyTorch)
- Time series analysis libraries
- Model training and validation pipelines
- Advanced data visualization tools
- Model performance monitoring

**Success Criteria**:
- Accurate price predictions within acceptable error margins
- Reliable trend forecasting
- Actionable investment recommendations
- Full AI-powered investment analysis platform

### 📊 Epic Progression Benefits

**Learning Progression**:
- **Epic 1**: Master financial analysis + coding fundamentals
- **Epic 2**: Learn AI/ML integration and NLP concepts
- **Epic 3**: Develop advanced ML skills and predictive modeling

**Risk Management**:
- Each epic delivers a complete, working system
- User feedback can be incorporated between epics
- Complexity is contained to manageable chunks
- Open source transparency maintained throughout

**Value Delivery**:
- **Epic 1**: Solid financial analysis (immediate value)
- **Epic 2**: Market sentiment insights (significant value add)
- **Epic 3**: Predictive capabilities (game-changing value)

**Current Focus**: Epic 1 - Foundational Data Analysis
All current planning and development focuses on Epic 1 components only. Sentiment analysis and predictive AI features are planned for future epics.

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

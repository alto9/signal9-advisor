# Sizing Guidelines for Development Tasks

This document provides time estimates for common development tasks to help AI agents understand realistic project timelines. All estimates include implementation, testing, validation, and basic documentation.

## Time Estimation Categories

### 🟢 Quick Tasks (1-4 hours)
- Bug fixes for known issues
- Simple configuration changes
- Adding basic validation rules
- Writing unit tests for existing functions
- Small UI adjustments (styling, text changes)
- Adding logging or monitoring to existing code
- Simple API endpoint modifications

### 🟡 Half-Day Tasks (4-8 hours)
- Simple CRUD operations (single entity)
- Basic form implementations
- Adding authentication to existing endpoints
- Simple data transformations
- Creating basic utility functions
- Setting up basic CI/CD pipelines
- Simple database migrations

### 🟠 Full-Day Tasks (6-12 hours)
- **Simple CRUD-based Lambda function** (as referenced) - Complete implementation with testing and validation
- Basic REST API with multiple endpoints
- Simple React components with state management
- Database schema design and implementation
- Integration with third-party APIs (well-documented)
- Setting up monitoring and alerting
- Basic error handling and retry logic

### 🔴 Multi-Day Tasks (2-5 days)
- Complex business logic implementation
- Authentication and authorization systems
- Data migration between systems
- Performance optimization projects
- Complex UI workflows with multiple screens
- Event-driven architecture setup
- Comprehensive test suite creation

### 🟣 Week-Long Tasks (5-10 days)
- Complete feature modules
- Microservice development
- Complex integrations with external systems
- Advanced caching implementations
- Security audit and remediation
- Complete application refactoring
- Advanced monitoring and observability setup

### ⚫ Multi-Week Tasks (2+ weeks)
- Full application development
- Large-scale system migrations
- Complex AI/ML integrations
- Complete infrastructure overhauls
- Major architectural changes
- Compliance and regulatory implementations

## Technology-Specific Guidelines

### AWS Lambda Functions
- **Simple CRUD**: 6-12 hours
- **With external API integration**: 8-16 hours  
- **With complex business logic**: 1-3 days
- **With advanced error handling & retry**: +25% time

### React/Frontend
- **Simple component**: 2-4 hours
- **Complex interactive component**: 1-2 days
- **Complete page with multiple components**: 2-4 days
- **Responsive design implementation**: +30% time

### Database Work
- **Simple schema changes**: 1-4 hours
- **Complex migrations**: 1-2 days
- **Performance optimization**: 2-5 days
- **Data cleanup/transformation**: 1-3 days

### API Development
- **Single endpoint**: 2-6 hours
- **CRUD API (5-7 endpoints)**: 1-2 days
- **Complex API with authentication**: 3-5 days
- **API with advanced features (rate limiting, caching)**: 1 week

### Testing
- **Unit tests for existing code**: +20% of original development time
- **Integration tests**: +40% of original development time
- **End-to-end tests**: +50% of original development time
- **Test-driven development**: +30% upfront, -20% debugging time

## Complexity Multipliers

### Add these percentages to base estimates:

**Code Quality Requirements:**
- Production-ready code: +25%
- Enterprise-grade security: +40%
- High availability requirements: +50%
- Regulatory compliance: +60%

**Team Factors:**
- New technology/framework: +30-50%
- Unfamiliar codebase: +25%
- Remote/distributed team: +15%
- Multiple stakeholders: +20%

**Technical Debt:**
- Working with legacy code: +30-50%
- Poor documentation: +25%
- Complex dependencies: +20%
- Technical debt payoff required: +40%

## AI/ML Specific Tasks

### 🤖 AI Integration Tasks
- **Simple LLM API integration**: 1-2 days
- **Complex prompt engineering**: 2-4 days
- **RAG system implementation**: 1-2 weeks
- **Custom model training**: 2-4 weeks
- **AI workflow orchestration**: 1-2 weeks

### Model Deployment
- **Simple model serving**: 3-5 days
- **Scalable inference pipeline**: 1-2 weeks
- **A/B testing framework**: 1 week
- **Model monitoring and drift detection**: 1-2 weeks

## Warning Signs (Add 50-100% more time)

- Requirements are vague or changing
- Multiple integrations with poorly documented APIs
- Performance requirements not clearly defined
- No existing patterns in codebase to follow
- Critical path with no room for error
- Team has no experience with required technology

## Best Practices for Estimation

1. **Break down large tasks** into smaller, estimable pieces
2. **Include buffer time** (20-30%) for unexpected issues
3. **Consider the full lifecycle**: design, implement, test, document, deploy
4. **Account for code review cycles** and feedback incorporation
5. **Factor in learning time** for new technologies or domains
6. **Remember testing time** is often underestimated
7. **Include time for stakeholder communication** and clarification

## Example Estimations

### Simple E-commerce Product Catalog
- Product CRUD API: 2 days
- Product listing UI: 1 day
- Search functionality: 2 days
- Image upload: 1 day
- **Total: ~1 week**

### User Authentication System
- JWT implementation: 1 day
- Password reset flow: 1 day
- Email verification: 1 day
- Role-based permissions: 2 days
- **Total: ~1 week**

### Basic Analytics Dashboard
- Data aggregation service: 2 days
- Chart components: 2 days
- Real-time updates: 1 day
- Export functionality: 1 day
- **Total: ~1.5 weeks**

---

*Last updated: Generated for cursor-context-engineering project*
*Remember: These are guidelines, not guarantees. Always consider project-specific factors.*

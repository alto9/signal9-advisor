# Ticket 1.2.1: Core DynamoDB Tables Implementation

### Estimate
6 hours

**Status**: Refinement Complete

#### Description
Implement the three core DynamoDB tables (assets, earningsCalendar, newsSentiment) using AWS CDK with proper schemas, key configurations, and Global Secondary Indexes (GSIs). This includes creating CDK constructs for each table, configuring the appropriate partition and sort keys, setting up GSIs for efficient query patterns, and implementing on-demand billing.

#### Technical Details
- **Implementation Steps**:
  1. Create `lib/constructs/database-construct.ts` for DynamoDB table constructs
  2. Implement `AssetsTable` construct with symbol (PK) and lastPollenationDate (SK)
  3. Configure GSIs for assets table: status-based queries and volume-based prioritization
  4. Implement `EarningsCalendarTable` construct with asset_symbol (PK) and earnings_date (SK)
  5. Configure upcoming-earnings-index GSI for date-based queries
  6. Implement `NewsSentimentTable` construct with news_id (PK) and time_published (SK)
  7. Configure GSIs for newsSentiment: asset-news-index and sentiment-score-index
  8. Set up on-demand billing for all tables
  9. Configure backup and point-in-time recovery settings
  10. Implement proper resource tagging and naming conventions

- **Architecture Considerations**:
  - Follow AWS CDK best practices for DynamoDB table creation
  - Implement environment-based table naming (dev/staging/prod)
  - Use modular constructs for maintainable infrastructure code
  - Ensure proper GSI configuration for query optimization
  - Implement consistent resource tagging across all tables

- **Security Requirements**:
  - Enable encryption at rest for all tables
  - Configure proper IAM policies for table access
  - Implement secure resource tagging patterns
  - Follow AWS security best practices for DynamoDB

- **Performance Requirements**:
  - GSI creation time < 5 minutes per table
  - Table creation time < 10 minutes total
  - Proper indexing for query performance optimization

#### Dependencies
- **Prerequisites**:
  - Task 1.1: AWS CDK Project Setup and Configuration (all tickets)
- **Dependent Tickets**:
  - Ticket 1.2.2: Foundational Data Tables Implementation
  - Task 1.3: Lambda Function Infrastructure Framework

#### Testing Requirements
- **Unit Tests**:
  - CDK synthesis validation for table configurations
  - GSI configuration validation tests
  - Resource naming pattern validation
  - Tagging compliance validation
  - Encryption configuration validation

- **Integration Tests**:
  - Table creation validation in development environment
  - GSI creation and configuration validation
  - Backup and point-in-time recovery validation
  - Environment-based naming validation

- **Performance Tests**:
  - Table creation performance validation
  - GSI creation performance validation

- **Security Tests**:
  - Encryption configuration validation
  - IAM policy validation for table access
  - Resource tagging security validation

#### Acceptance Criteria
- [ ] `lib/constructs/database-construct.ts` created with table constructs
- [ ] Assets table created with symbol/lastPollenationDate keys and GSIs
- [ ] EarningsCalendar table created with asset_symbol/earnings_date keys and GSI
- [ ] NewsSentiment table created with news_id/time_published keys and GSIs
- [ ] All GSIs properly configured for query optimization
- [ ] On-demand billing enabled for all tables
- [ ] Backup and point-in-time recovery configured
- [ ] Encryption at rest enabled for all tables
- [ ] Proper resource tagging implemented
- [ ] Environment-based naming conventions applied
- [ ] CDK synthesis completes successfully without errors
- [ ] All tables deploy successfully in development environment
- [ ] All unit tests pass with >90% coverage
- [ ] GSI creation time < 5 minutes per table
- [ ] Table creation time < 10 minutes total

#### Error Handling
- DynamoDB table creation error handling and rollback
- GSI creation error handling and recovery
- Resource naming conflict detection and resolution
- CDK synthesis error handling and validation

#### Monitoring and Observability
- DynamoDB table creation performance metrics
- GSI creation performance metrics
- Resource creation validation logging
- Table configuration validation logging

#### Open Questions
- None - all requirements are clear from the existing documentation and models

#### Notes
Focus on creating robust, maintainable DynamoDB table constructs that follow AWS CDK best practices. The table schemas are well-defined in the JSON models, so implementation should closely follow those specifications. Ensure proper GSI configuration for the specific query patterns identified in the system design. The implementation should support the modular approach needed for the Lambda functions that will interact with these tables. 
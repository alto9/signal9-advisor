# Ticket 1.4.1: Scheduled EventBridge Rules Implementation

### Estimate
2 hours

**Status**: Refinement Complete

#### Description
Implement the 5 scheduled EventBridge rules for the Monday-Saturday data collection workflows. This includes creating cron-based rules with proper Monday-Saturday scheduling, configuring event targets to trigger appropriate Lambda functions, and implementing the Sunday maintenance window (no scheduled jobs).

#### Technical Details
- **Implementation Steps**:
  1. Create `lib/constructs/eventbridge-construct.ts` for EventBridge rule constructs
  2. Implement `ScheduledEventRule` base construct with common configuration patterns
  3. Create scheduled EventBridge rules for all 5 triggers:
     - **AssetSyncRule**: `0 4 * * 1-6 *` (Daily at 4:00 AM, Monday-Saturday) → SyncAssets Lambda
     - **EarningsCalendarSyncRule**: `0 5 * * 1-6 *` (Daily at 5:00 AM, Monday-Saturday) → SyncEarningsCalendar Lambda
     - **EarningsPollenationRule**: `0 6 * * 1-6 *` (Daily at 6:00 AM, Monday-Saturday) → TriggerEarningsPollenation Lambda
     - **RegularPollenationRule**: `0 7 * * 1-6 *` (Daily at 7:00 AM, Monday-Saturday) → TriggerRegularPollenation Lambda
     - **NewsSentimentSyncRule**: `0 * * * 1-6 *` (Hourly, Monday-Saturday) → SyncNewsSentiment Lambda
  4. Configure event targets linking rules to corresponding Lambda functions
  5. Set up proper timezone handling (UTC)
  6. Implement Sunday maintenance window (no scheduled jobs)
  7. Configure environment-based rule naming conventions
  8. Set up proper resource tagging and monitoring

- **Architecture Considerations**:
  - Follow AWS CDK best practices for EventBridge rule creation
  - Implement environment-based rule naming (dev/staging/prod)
  - Use modular constructs for maintainable infrastructure code
  - Ensure proper cron expression validation for Monday-Saturday scheduling
  - Establish foundation for event-driven architecture

- **Security Requirements**:
  - Implement secure resource tagging patterns
  - Follow AWS security best practices for EventBridge configuration
  - Ensure proper IAM permissions for Lambda function invocation
  - Configure event target security validation

- **Performance Requirements**:
  - EventBridge rule creation time < 1 minute per rule
  - Event target configuration time < 30 seconds per rule
  - Proper resource organization for efficient deployment

#### Dependencies
- **Prerequisites**:
  - Task 1.3: Lambda Function Infrastructure Framework (all tickets)
- **Dependent Tickets**:
  - Ticket 1.4.2: Custom EventBridge Rules Implementation
  - Task 1.6: CloudWatch Monitoring Setup

#### Testing Requirements
- **Unit Tests**:
  - EventBridge rule creation validation tests
  - Cron expression validation tests for Monday-Saturday scheduling
  - Event target configuration validation tests
  - Resource naming pattern validation
  - Tagging compliance validation

- **Integration Tests**:
  - EventBridge rule creation validation in development environment
  - Lambda function target validation
  - Scheduled trigger testing with test events
  - Environment-based naming validation
  - Sunday maintenance window validation

- **Performance Tests**:
  - EventBridge rule creation performance validation
  - Event target configuration performance validation

- **Security Tests**:
  - Resource naming security validation
  - IAM permission validation for Lambda invocation
  - Event target security validation

#### Acceptance Criteria
- [ ] `lib/constructs/eventbridge-construct.ts` created with EventBridge rule constructs
- [ ] All 5 scheduled EventBridge rules created with correct cron expressions
- [ ] Monday-Saturday scheduling properly implemented (1-6 in cron expressions)
- [ ] Sunday maintenance window properly excludes all scheduled jobs
- [ ] Event targets properly link rules to corresponding Lambda functions
- [ ] Proper timezone handling configured (UTC)
- [ ] Environment-based rule naming conventions applied
- [ ] Resource tagging implemented for monitoring
- [ ] CDK synthesis completes successfully without errors
- [ ] All EventBridge rules deploy successfully in development environment
- [ ] Test events successfully trigger target Lambda functions
- [ ] All unit tests pass with >90% coverage
- [ ] EventBridge rule creation time < 1 minute per rule
- [ ] Event target configuration time < 30 seconds per rule

#### Error Handling
- EventBridge rule creation error handling and rollback
- Cron expression validation error handling
- Event target configuration error handling
- CDK synthesis error handling and validation

#### Monitoring and Observability
- EventBridge rule creation performance metrics
- Event target configuration performance metrics
- Scheduled trigger validation logging
- Sunday maintenance window validation logging

#### Open Questions
- None - all requirements are clear from the existing documentation

#### Notes
Focus on creating robust, maintainable EventBridge rule constructs that follow AWS CDK best practices. The cron expressions are well-defined in the TRD document, so implementation should closely follow those specifications. Pay special attention to the Monday-Saturday scheduling requirement and ensure the Sunday maintenance window is properly implemented. The implementation should support the event-driven architecture and prepare for the custom event rules in the next ticket. 
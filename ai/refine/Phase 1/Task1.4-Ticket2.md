# Ticket 1.4.2: Custom EventBridge Rules Implementation

### Estimate
2 hours

**Status**: Refinement Complete

#### Description
Implement the custom EventBridge rules for event-driven processing workflows. This includes creating event pattern rules for pollenationNeeded and earningsProcessed events, configuring event targets for the PollenateAsset and MarkEarningsProcessed Lambda functions, and establishing the event-driven architecture foundation.

#### Technical Details
- **Implementation Steps**:
  1. Extend `lib/constructs/eventbridge-construct.ts` with custom event rule constructs
  2. Implement `CustomEventRule` base construct with event pattern configuration
  3. Create custom EventBridge rules for event-driven processing:
     - **PollenationNeededRule**: Event pattern for pollenationNeeded events → PollenateAsset Lambda
     - **EarningsProcessedRule**: Event pattern for earningsProcessed events → MarkEarningsProcessed Lambda
  4. Configure event pattern matching for custom events:
     - pollenationNeeded: Asset symbol and trigger source (earnings vs. regular)
     - earningsProcessed: Asset symbol and earnings date
  5. Set up event targets linking custom rules to corresponding Lambda functions
  6. Configure event pattern validation and error handling
  7. Implement environment-based rule naming conventions
  8. Set up proper resource tagging and monitoring for custom events

- **Architecture Considerations**:
  - Follow AWS CDK best practices for custom EventBridge rule creation
  - Implement environment-based rule naming (dev/staging/prod)
  - Use modular constructs for maintainable infrastructure code
  - Ensure proper event pattern matching for dual pollination strategy
  - Establish foundation for event-driven processing workflows

- **Security Requirements**:
  - Implement secure resource tagging patterns
  - Follow AWS security best practices for EventBridge configuration
  - Ensure proper IAM permissions for Lambda function invocation
  - Configure event pattern security validation

- **Performance Requirements**:
  - Custom EventBridge rule creation time < 1 minute per rule
  - Event pattern configuration time < 30 seconds per rule
  - Proper resource organization for efficient deployment

#### Dependencies
- **Prerequisites**:
  - Ticket 1.4.1: Scheduled EventBridge Rules Implementation
- **Dependent Tickets**:
  - Task 1.6: CloudWatch Monitoring Setup
  - Phase 2: Data Collection Implementation

#### Testing Requirements
- **Unit Tests**:
  - Custom EventBridge rule creation validation tests
  - Event pattern matching validation tests
  - Event target configuration validation tests
  - Resource naming pattern validation
  - Tagging compliance validation

- **Integration Tests**:
  - Custom EventBridge rule creation validation in development environment
  - Lambda function target validation for custom events
  - Event pattern matching testing with sample events
  - Environment-based naming validation
  - Event-driven processing validation

- **Performance Tests**:
  - Custom EventBridge rule creation performance validation
  - Event pattern configuration performance validation

- **Security Tests**:
  - Resource naming security validation
  - IAM permission validation for Lambda invocation
  - Event pattern security validation

#### Acceptance Criteria
- [ ] Custom EventBridge rules created for pollenationNeeded and earningsProcessed events
- [ ] Event pattern matching configured for dual pollination strategy
- [ ] Event targets properly link custom rules to PollenateAsset and MarkEarningsProcessed Lambda functions
- [ ] Event pattern validation and error handling implemented
- [ ] Environment-based rule naming conventions applied
- [ ] Resource tagging implemented for custom event monitoring
- [ ] CDK synthesis completes successfully without errors
- [ ] All custom EventBridge rules deploy successfully in development environment
- [ ] Test events successfully trigger target Lambda functions
- [ ] Event pattern matching works correctly for both event types
- [ ] All unit tests pass with >90% coverage
- [ ] Custom EventBridge rule creation time < 1 minute per rule
- [ ] Event pattern configuration time < 30 seconds per rule

#### Error Handling
- Custom EventBridge rule creation error handling and rollback
- Event pattern validation error handling
- Event target configuration error handling
- CDK synthesis error handling and validation

#### Monitoring and Observability
- Custom EventBridge rule creation performance metrics
- Event pattern configuration performance metrics
- Event-driven processing validation logging
- Event pattern matching validation logging

#### Open Questions
- None - all requirements are clear from the existing documentation

#### Notes
Focus on creating robust, maintainable custom EventBridge rule constructs that follow AWS CDK best practices. The event patterns should support the dual pollination strategy where pollenationNeeded events can be triggered from both earnings-triggered and regular pollination sources. Ensure proper event pattern matching for the specific payload structures expected by the PollenateAsset and MarkEarningsProcessed Lambda functions. The implementation should support the event-driven architecture and prepare for the data collection implementation in Phase 2. 
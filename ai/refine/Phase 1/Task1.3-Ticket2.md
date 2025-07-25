# Ticket 1.3.2: IAM Roles and Policies Configuration

### Estimate
2 hours

**Status**: Refinement Complete

#### Description
Implement IAM roles and policies for all 7 Lambda functions with least privilege principles. This includes creating execution roles with appropriate DynamoDB permissions, Secrets Manager access, CloudWatch logging permissions, and EventBridge permissions for the event-driven functions.

#### Technical Details
- **Implementation Steps**:
  1. Create `lib/constructs/iam-roles-construct.ts` for IAM role management
  2. Implement `LambdaExecutionRole` base construct with common permissions
  3. Create function-specific IAM roles with least privilege permissions:
     - **SyncAssets**: DynamoDB assets table access, Secrets Manager Alpaca credentials, CloudWatch logs
     - **SyncEarningsCalendar**: DynamoDB earningsCalendar table access, Secrets Manager AlphaVantage credentials, CloudWatch logs
     - **TriggerEarningsPollenation**: DynamoDB earningsCalendar table read access, EventBridge event publishing, CloudWatch logs
     - **TriggerRegularPollenation**: DynamoDB assets table read access, EventBridge event publishing, CloudWatch logs
     - **SyncNewsSentiment**: DynamoDB assets and newsSentiment tables access, Secrets Manager AlphaVantage credentials, CloudWatch logs
     - **PollenateAsset**: DynamoDB all foundational data tables access, Secrets Manager AlphaVantage credentials, CloudWatch logs
     - **MarkEarningsProcessed**: DynamoDB earningsCalendar table write access, CloudWatch logs
  4. Configure Secrets Manager access policies for API credentials
  5. Set up DynamoDB table access policies with appropriate read/write permissions
  6. Configure CloudWatch logging permissions for structured logging
  7. Implement EventBridge permissions for event publishing functions
  8. Create IAM policy validation tests

- **Architecture Considerations**:
  - Follow least privilege principle for all IAM roles
  - Implement environment-based role naming (dev/staging/prod)
  - Use modular IAM constructs for maintainable permissions
  - Ensure proper separation of concerns between function roles
  - Establish foundation for security compliance

- **Security Requirements**:
  - Implement least privilege access for all Lambda functions
  - Secure Secrets Manager access patterns
  - Proper DynamoDB table access controls
  - CloudWatch logging security configuration
  - IAM policy validation and compliance

- **Performance Requirements**:
  - IAM role creation time < 2 minutes per role
  - Policy attachment time < 1 minute per function
  - Proper resource organization for efficient deployment

#### Dependencies
- **Prerequisites**:
  - Ticket 1.3.1: CDK Lambda Constructs and Basic Configuration
- **Dependent Tickets**:
  - Ticket 1.3.3: Error Handling and Dead Letter Queue Setup
  - Task 1.4: EventBridge Rules Configuration

#### Testing Requirements
- **Unit Tests**:
  - IAM role creation validation tests
  - Policy attachment validation tests
  - Permission boundary validation tests
  - Resource naming pattern validation
  - Security compliance validation

- **Integration Tests**:
  - IAM role creation validation in development environment
  - Lambda function role attachment validation
  - Permission testing with sample operations
  - Environment-based naming validation

- **Performance Tests**:
  - IAM role creation performance validation
  - Policy attachment performance validation

- **Security Tests**:
  - Least privilege principle validation
  - Secrets Manager access validation
  - DynamoDB access control validation
  - CloudWatch logging permission validation

#### Acceptance Criteria
- [ ] `lib/constructs/iam-roles-construct.ts` created with IAM role constructs
- [ ] All 7 Lambda function IAM roles created with least privilege permissions
- [ ] Secrets Manager access policies configured for API credentials
- [ ] DynamoDB table access policies configured with appropriate permissions
- [ ] CloudWatch logging permissions configured for structured logging
- [ ] EventBridge permissions configured for event publishing functions
- [ ] IAM roles properly attached to Lambda functions
- [ ] Environment-based role naming conventions applied
- [ ] All IAM policies follow least privilege principles
- [ ] CDK synthesis completes successfully without errors
- [ ] All IAM roles deploy successfully in development environment
- [ ] All unit tests pass with >90% coverage
- [ ] IAM role creation time < 2 minutes per role
- [ ] Policy attachment time < 1 minute per function

#### Error Handling
- IAM role creation error handling and rollback
- Policy attachment error handling
- Permission validation error handling
- CDK synthesis error handling and validation

#### Monitoring and Observability
- IAM role creation performance metrics
- Policy attachment performance metrics
- Permission validation logging
- Security compliance validation logging

#### Open Questions
- None - all requirements are clear from the existing documentation

#### Notes
Focus on creating secure, maintainable IAM roles that follow AWS security best practices. The permissions should be scoped to the minimum required for each function's specific operations. Ensure proper separation between read-only and read-write permissions for DynamoDB tables. The implementation should support the event-driven architecture and prepare for the error handling and dead letter queue setup in the next ticket. 
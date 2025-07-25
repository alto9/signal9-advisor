# Ticket 1.5.2: IAM Policies and Access Configuration

### Estimate
2 hours

**Status**: Refinement Complete

#### Description
Implement IAM policies and access configuration for Lambda functions to securely access Secrets Manager credentials. This includes creating IAM policies with least privilege access, configuring Lambda function permissions to retrieve secrets at runtime, and establishing secure secret retrieval patterns for the data collection functions.

#### Technical Details
- **Implementation Steps**:
  1. Extend `lib/constructs/secrets-manager-construct.ts` with IAM policy constructs
  2. Implement `SecretsManagerAccessPolicy` construct for Lambda function access
  3. Create function-specific IAM policies for secret access:
     - **SyncAssets**: Access to AlpacaCredentials secret
     - **SyncEarningsCalendar**: Access to AlphaVantageCredentials secret
     - **SyncNewsSentiment**: Access to AlphaVantageCredentials secret
     - **PollenateAsset**: Access to AlphaVantageCredentials secret
  4. Configure least privilege access policies for each function
  5. Set up secret retrieval patterns for runtime use
  6. Implement secret access validation and error handling
  7. Configure environment-based policy naming conventions
  8. Set up proper resource tagging and monitoring for access policies

- **Architecture Considerations**:
  - Follow least privilege principle for all IAM policies
  - Implement environment-based policy naming (dev/staging/prod)
  - Use modular IAM constructs for maintainable permissions
  - Ensure proper separation of concerns between function access
  - Establish foundation for secure secret retrieval

- **Security Requirements**:
  - Implement least privilege access for all Lambda functions
  - Secure secret retrieval patterns
  - Proper IAM policy validation and compliance
  - Secret access audit logging configuration
  - Environment-based access control

- **Performance Requirements**:
  - IAM policy creation time < 1 minute per policy
  - Policy attachment time < 30 seconds per function
  - Proper resource organization for efficient deployment

#### Dependencies
- **Prerequisites**:
  - Ticket 1.5.1: Secrets Manager Infrastructure and Secret Creation
- **Dependent Tickets**:
  - Task 1.6: CloudWatch Monitoring Setup
  - Phase 2: Data Collection Implementation

#### Testing Requirements
- **Unit Tests**:
  - IAM policy creation validation tests
  - Policy attachment validation tests
  - Secret access permission validation tests
  - Resource naming pattern validation
  - Security compliance validation

- **Integration Tests**:
  - IAM policy creation validation in development environment
  - Lambda function secret access validation
  - Secret retrieval pattern testing
  - Environment-based naming validation
  - Access control validation

- **Performance Tests**:
  - IAM policy creation performance validation
  - Policy attachment performance validation

- **Security Tests**:
  - Least privilege principle validation
  - Secret access control validation
  - IAM policy security validation
  - Environment-based access validation

#### Acceptance Criteria
- [ ] IAM policies created for all Lambda functions requiring secret access
- [ ] Least privilege access configured for each function's specific needs
- [ ] Secret retrieval patterns established for runtime use
- [ ] IAM policies properly attached to Lambda function roles
- [ ] Environment-based policy naming conventions applied
- [ ] Secret access validation and error handling implemented
- [ ] Resource tagging implemented for access policy monitoring
- [ ] CDK synthesis completes successfully without errors
- [ ] All IAM policies deploy successfully in development environment
- [ ] Lambda functions can successfully access required secrets
- [ ] Secret access follows least privilege principles
- [ ] All unit tests pass with >90% coverage
- [ ] IAM policy creation time < 1 minute per policy
- [ ] Policy attachment time < 30 seconds per function

#### Error Handling
- IAM policy creation error handling and rollback
- Policy attachment error handling
- Secret access validation error handling
- CDK synthesis error handling and validation

#### Monitoring and Observability
- IAM policy creation performance metrics
- Policy attachment performance metrics
- Secret access validation logging
- Access control validation logging

#### Open Questions
- None - all requirements are clear from the existing documentation

#### Notes
Focus on creating secure, maintainable IAM policies that follow AWS security best practices. The policies should be scoped to the minimum required access for each Lambda function's specific operations. Ensure proper separation between read-only and read-write access patterns. The implementation should support the secure credential management approach and prepare for the data collection implementation in Phase 2. Pay special attention to the least privilege principle and ensure that each function only has access to the secrets it actually needs. 
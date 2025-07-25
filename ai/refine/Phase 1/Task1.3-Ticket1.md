# Ticket 1.3.1: CDK Lambda Constructs and Basic Configuration

### Estimate
4 hours

**Status**: Refinement Complete

#### Description
Create the foundational CDK Lambda constructs and implement basic function configurations for all 7 Lambda functions in the Signal9 data collection system. This includes creating reusable CDK constructs, configuring memory and timeout settings per function specifications, and establishing the basic deployment framework.

#### Technical Details
- **Implementation Steps**:
  1. Create `lib/constructs/lambda-construct.ts` for reusable Lambda constructs
  2. Implement `LambdaFunction` base construct with common configuration patterns
  3. Create individual function constructs for all 7 Lambda functions:
     - `SyncAssetsFunction`: 512MB memory, 5 min timeout
     - `SyncEarningsCalendarFunction`: 256MB memory, 3 min timeout
     - `TriggerEarningsPollenationFunction`: 128MB memory, 1 min timeout
     - `TriggerRegularPollenationFunction`: 256MB memory, 2 min timeout
     - `SyncNewsSentimentFunction`: 512MB memory, 5 min timeout
     - `PollenateAssetFunction`: 1024MB memory, 10 min timeout
     - `MarkEarningsProcessedFunction`: 128MB memory, 30 sec timeout
  4. Configure Node.js v22 runtime for all functions
  5. Set up environment variable patterns for configuration management
  6. Implement basic placeholder code for deployment testing
  7. Configure CloudWatch log groups for all functions
  8. Set up basic resource tagging and naming conventions

- **Architecture Considerations**:
  - Follow AWS CDK best practices for Lambda function creation
  - Implement environment-based function naming (dev/staging/prod)
  - Use modular constructs for maintainable infrastructure code
  - Ensure consistent configuration patterns across all functions
  - Establish foundation for IAM roles and policies

- **Security Requirements**:
  - Implement secure resource tagging patterns
  - Follow AWS security best practices for Lambda configuration
  - Ensure no sensitive information in environment variables
  - Prepare for IAM role integration

- **Performance Requirements**:
  - Function deployment time < 5 minutes per function
  - CDK synthesis time < 2 minutes for all functions
  - Proper resource organization for efficient deployment

#### Dependencies
- **Prerequisites**:
  - Task 1.1: AWS CDK Project Setup and Configuration (all tickets)
  - Task 1.2: DynamoDB Tables Infrastructure (all tickets)
- **Dependent Tickets**:
  - Ticket 1.3.2: IAM Roles and Policies Configuration
  - Ticket 1.3.3: Error Handling and Dead Letter Queue Setup

#### Testing Requirements
- **Unit Tests**:
  - CDK synthesis validation for Lambda configurations
  - Function configuration validation tests
  - Resource naming pattern validation
  - Tagging compliance validation
  - Environment variable configuration tests

- **Integration Tests**:
  - Lambda function deployment validation in development environment
  - Function invocation testing with placeholder code
  - Environment-based naming validation
  - CloudWatch log group creation validation

- **Performance Tests**:
  - Function deployment performance validation
  - CDK synthesis performance validation

- **Security Tests**:
  - Resource naming security validation
  - Environment variable security validation
  - Tagging compliance validation

#### Acceptance Criteria
- [ ] `lib/constructs/lambda-construct.ts` created with reusable Lambda constructs
- [ ] All 7 Lambda function constructs implemented with correct memory/timeout settings
- [ ] Node.js v22 runtime configured for all functions
- [ ] Environment variable patterns established for configuration management
- [ ] Basic placeholder code implemented for deployment testing
- [ ] CloudWatch log groups configured for all functions
- [ ] Proper resource tagging implemented
- [ ] Environment-based naming conventions applied
- [ ] CDK synthesis completes successfully without errors
- [ ] All Lambda functions deploy successfully in development environment
- [ ] All unit tests pass with >90% coverage
- [ ] Function deployment time < 5 minutes per function
- [ ] CDK synthesis time < 2 minutes for all functions

#### Error Handling
- Lambda function creation error handling and rollback
- Environment variable configuration error handling
- Resource naming conflict detection and resolution
- CDK synthesis error handling and validation

#### Monitoring and Observability
- Lambda function deployment performance metrics
- CloudWatch log group creation metrics
- Function configuration validation logging
- Environment variable configuration logging

#### Open Questions
- None - all requirements are clear from the existing documentation

#### Notes
Focus on creating robust, maintainable Lambda constructs that follow AWS CDK best practices. The function configurations are well-defined in the TRD document, so implementation should closely follow those specifications. Ensure the constructs are designed to easily accommodate the IAM roles and error handling that will be added in subsequent tickets. The implementation should support the modular approach needed for the event-driven architecture. 
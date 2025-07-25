# Ticket 2.1.1: SyncAssets Lambda Function Core Implementation

### Estimate
6 hours

**Status**: Refinement Complete

#### Description
Implement the core SyncAssets Lambda function that performs daily synchronization of tradable assets from the Alpaca API. This function will query the Alpaca `/v2/assets?status=active` endpoint, process the response data, and prepare it for storage in the assets DynamoDB table.

#### Technical Details
- **Implementation Steps**:
  1. Create TypeScript Lambda function structure with proper imports and type definitions
  2. Install and configure `@alpaca/alpaca-trade-api` SDK package in dependencies
  3. Implement Alpaca API client initialization using `AlpacaAPI` class with credentials from Secrets Manager
  4. Create asset data fetching logic using `getAssets({ status: 'active' })` method
  5. Implement TypeScript interfaces for Alpaca Asset model based on asset.json schema
  6. Add structured logging for function entry, API calls, and exit points
  7. Create CloudWatch metrics emission for function execution tracking
  8. Implement timeout handling to ensure function completes within 5-minute limit

- **Architecture Considerations**:
  - Function integrates with Alpaca API using `@alpaca/alpaca-trade-api` SDK
  - Credentials managed through AWS Secrets Manager for security
  - CloudWatch metrics provide operational visibility
  - Function designed for daily execution via EventBridge triggers
  - Asset data follows Alpaca Asset model with fields: id, symbol, name, status, tradable, etc.

- **Security Requirements**:
  - API credentials retrieved securely from AWS Secrets Manager
  - No hardcoded credentials in function code
  - Proper IAM permissions for Secrets Manager access
  - Input validation to prevent injection attacks

- **Performance Requirements**:
  - Function must complete within 5-minute timeout
  - Handle large asset lists (potentially thousands of assets)
  - Efficient memory usage within 512MB allocation
  - API calls should complete within 30 seconds

#### Dependencies
- **Prerequisites**:
  - Phase 1 infrastructure completion (assets DynamoDB table, Secrets Manager)
  - Alpaca API credentials configured in Secrets Manager
  - CloudWatch log group and metrics namespace configured
- **Dependent Tickets**:
  - Task 2.1-Ticket2: Asset Data Validation and Transformation
  - Task 2.1-Ticket3: DynamoDB Integration and Upsert Operations

#### Testing Requirements
- **Unit Tests**:
  - Mock Alpaca API responses using actual data structures from `ai/brainstorm/models/alpaca/asset.json`
  - Test `AlpacaAPI` client initialization with valid/invalid credentials
  - Test `getAssets({ status: 'active' })` method with various response scenarios
  - Test TypeScript interfaces for Asset model validation
  - Test timeout handling and error scenarios
  - Test CloudWatch metrics emission accuracy
  - Coverage requirement: >90%

- **Integration Tests**:
  - Test Secrets Manager credential retrieval
  - Test actual Alpaca API connectivity (with test credentials)

- **Performance Tests**:
  - Test function execution time with large asset datasets
  - Verify memory usage stays within 512MB limit
  - Test timeout handling under slow API conditions

- **Security Tests**:
  - Verify no credentials are logged or exposed
  - Test input validation and sanitization

#### Acceptance Criteria
- [ ] Lambda function successfully initializes `AlpacaAPI` client with credentials from Secrets Manager
- [ ] Function calls `getAssets({ status: 'active' })` method and receives valid response
- [ ] Asset data is properly extracted and structured according to Alpaca Asset model
- [ ] CloudWatch metrics accurately track function execution time and success/failure
- [ ] Error handling gracefully manages API failures, timeouts, and authentication issues
- [ ] Function completes execution within 5-minute timeout under normal conditions
- [ ] All unit tests pass with >90% coverage
- [ ] Integration tests validate Secrets Manager and API connectivity
- [ ] Performance tests confirm function meets timeout and memory requirements
- [ ] Security review confirms no credential exposure or injection vulnerabilities
- [ ] Code review completed and approved
- [ ] Function documentation updated with usage examples

#### Error Handling
- API connection failures: Log error details, emit failure metric, return appropriate error response
- Authentication failures: Log security event, emit failure metric, return authentication error
- Timeout scenarios: Implement graceful shutdown, log timeout event, emit timeout metric
- Invalid API responses: Log response validation errors, emit data quality metric
- Secrets Manager failures: Log credential retrieval errors, emit configuration error metric

#### Monitoring and Observability
- **Metrics to track**:
  - Function execution duration
  - API call success/failure rates
  - Asset count processed
  - Memory usage
  - Error rates by type
- **Logging requirements**:
  - Structured JSON logging for all major events
  - API request/response logging (without sensitive data)
  - Error details with stack traces
  - Performance timing information
- **Alerting criteria**:
  - Function execution failures
  - API call failure rates >5%
  - Execution time approaching timeout (>4 minutes)

#### Open Questions
- None - all requirements are clear from Phase 2 plan

#### Notes
Focus on creating a robust, maintainable function that provides excellent operational visibility. The function should be designed to handle the large volume of asset data efficiently while providing clear error messages for troubleshooting. Ensure all logging follows structured JSON format for easy parsing and analysis. 
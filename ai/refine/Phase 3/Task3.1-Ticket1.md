# Ticket 3.1.1: Core Lambda Function Structure and DynamoDB Query Logic

### Estimate
3 hours

**Status**: Refinement Complete

#### Description
Implement the core structure of the TriggerEarningsPollenation Lambda function with DynamoDB query logic to identify assets with recent earnings releases within a 24-hour window. This establishes the foundation for earnings-triggered pollination by querying the earningsCalendar table and identifying assets requiring comprehensive data collection.

#### Technical Details
- **Implementation Steps**:
  1. Create `src/lambda/trigger-earnings-pollenation/` directory structure
  2. Implement `TriggerEarningsPollenationHandler` class extending BaseLambdaHandler
  3. Create `queryRecentEarnings(hoursBack: number = 24): Promise<EarningsRecord[]>` method
  4. Implement `EarningsRecord` interface with required fields:
     - assetSymbol: string
     - earningsDate: string
     - reportType: string (annual/quarterly)
     - isProcessed: boolean
  5. Create `DynamoDBEarningsQuery` class for earningsCalendar table queries
  6. Implement `queryEarningsByDateRange(startDate: Date, endDate: Date): Promise<EarningsRecord[]>` method
  7. Create `EarningsFilter` class for filtering logic
  8. Implement `filterUnprocessedEarnings(earnings: EarningsRecord[]): EarningsRecord[]` method
  9. Create `EarningsQueryValidator` class for query validation
  10. Implement `validateEarningsQuery(startDate: Date, endDate: Date): ValidationResult` method
  11. Add comprehensive unit tests for all query scenarios
  12. Create query performance monitoring and logging

- **Architecture Considerations**:
  - Lambda function follows established patterns from Phase 2
  - DynamoDB queries use efficient date-based filtering
  - Query logic handles timezone considerations for earnings dates
  - Filtering logic prevents duplicate processing of already processed earnings
  - Query validation ensures proper date ranges and data integrity

- **Security Requirements**:
  - DynamoDB queries use proper IAM permissions
  - Query parameters are validated to prevent injection attacks
  - Sensitive earnings data is not logged in plain text

- **Performance Requirements**:
  - DynamoDB queries complete within 10 seconds
  - Earnings filtering completes within 1 second
  - Lambda function initialization completes within 5 seconds
  - Memory usage remains constant regardless of earnings volume

#### Dependencies
- **Prerequisites**:
  - Phase 2: Data Collection Implementation completion
  - earningsCalendar DynamoDB table populated with data
  - BaseLambdaHandler pattern established
- **Dependent Tickets**:
  - Task3.1-Ticket2: Event Payload Construction and EventBridge Integration
  - Task3.1-Ticket3: CloudWatch Metrics and Error Handling

#### Testing Requirements
- **Unit Tests**:
  - Test DynamoDB query logic with various date ranges
  - Test earnings filtering logic with processed/unprocessed records
  - Test query validation with valid/invalid date ranges
  - Test timezone handling for earnings dates
  - Test edge cases: empty results, null dates, invalid data
  - Test coverage target: >90%

- **Integration Tests**:
  - Test DynamoDB integration with actual table structure
  - Verify query performance with realistic data volumes
  - Test Lambda function initialization and execution

- **Performance Tests**:
  - Measure DynamoDB query performance (<10 seconds)
  - Test filtering performance (<1 second)
  - Verify Lambda initialization performance (<5 seconds)

#### Acceptance Criteria
- [ ] Lambda function successfully queries earningsCalendar for recent earnings within 24-hour window
- [ ] DynamoDB query logic efficiently filters earnings by date range
- [ ] Earnings filtering correctly identifies unprocessed earnings records
- [ ] Query validation ensures proper date ranges and data integrity
- [ ] Timezone handling works correctly for earnings dates
- [ ] All unit tests pass with >90% coverage
- [ ] Performance benchmarks met (query <10s, filtering <1s, init <5s)
- [ ] Code review completed
- [ ] Query logic documentation provides clear implementation details

#### Error Handling
- DynamoDB query failures are handled gracefully with retry logic
- Invalid date ranges are detected and reported clearly
- Query validation errors provide actionable error messages
- Lambda function provides detailed error logging for debugging

#### Monitoring and Observability
- DynamoDB query performance metrics
- Earnings filtering success rates and timing
- Query validation error rates and types
- Lambda function execution timing and memory usage
- Earnings record volume and processing statistics

#### Open Questions
- None - all query logic requirements are clear

#### Notes
Focus on creating efficient, reliable query logic that can handle various earnings timing scenarios. The query should be optimized for the earningsCalendar table structure and provide clear results for downstream event processing. Consider that earnings dates may span different timezones and the query should handle these variations correctly. 
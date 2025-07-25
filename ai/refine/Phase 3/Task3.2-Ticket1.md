# Ticket 3.2.1: Core Lambda Function Structure and DynamoDB GSI Query Logic

### Estimate
3 hours

**Status**: Refinement Complete

#### Description
Implement the core structure of the TriggerRegularPollenation Lambda function with DynamoDB query logic using Global Secondary Index (GSI) for volume-based prioritization. This establishes the foundation for regular pollination by querying the assets table to identify high-volume assets with stale data based on lastPollenationDate.

#### Technical Details
- **Implementation Steps**:
  1. Create `src/lambda/trigger-regular-pollenation/` directory structure
  2. Implement `TriggerRegularPollenationHandler` class extending BaseLambdaHandler
  3. Create `queryHighVolumeAssets(limit: number = 100): Promise<AssetRecord[]>` method
  4. Implement `AssetRecord` interface with required fields:
     - symbol: string
     - lastPollenationDate: string
     - tradingVolume: number
     - status: string (active/inactive)
     - exchange: string
  5. Create `DynamoDBAssetQuery` class for assets table queries using GSI
  6. Implement `queryAssetsByVolumeGSI(limit: number): Promise<AssetRecord[]>` method
  7. Create `AssetFilter` class for filtering logic
  8. Implement `filterStaleAssets(assets: AssetRecord[], maxAgeDays: number): AssetRecord[]` method
  9. Create `AssetQueryValidator` class for query validation
  10. Implement `validateAssetQuery(limit: number, maxAgeDays: number): ValidationResult` method
  11. Add comprehensive unit tests for all query scenarios
  12. Create query performance monitoring and logging

- **Architecture Considerations**:
  - Lambda function follows established patterns from Phase 2 and Task 3.1
  - DynamoDB queries use GSI for efficient volume-based sorting
  - Query logic handles large asset datasets efficiently
  - Filtering logic identifies assets with stale data based on lastPollenationDate
  - Query validation ensures proper parameters and data integrity

- **Security Requirements**:
  - DynamoDB queries use proper IAM permissions
  - Query parameters are validated to prevent injection attacks
  - Sensitive asset data is not logged in plain text

- **Performance Requirements**:
  - DynamoDB GSI queries complete within 15 seconds
  - Asset filtering completes within 2 seconds
  - Lambda function initialization completes within 5 seconds
  - Memory usage scales appropriately with asset dataset size

#### Dependencies
- **Prerequisites**:
  - Task 3.1: TriggerEarningsPollenation Lambda Function Implementation completion
  - assets DynamoDB table populated with volume and lastPollenationDate data
  - GSI configured for volume-based queries
  - BaseLambdaHandler pattern established
- **Dependent Tickets**:
  - Task3.2-Ticket2: Priority Scoring Algorithm Implementation
  - Task3.2-Ticket3: Asset Selection Logic and Batch Processing
  - Task3.2-Ticket4: EventBridge Integration and CloudWatch Metrics

#### Testing Requirements
- **Unit Tests**:
  - Test DynamoDB GSI query logic with various volume thresholds
  - Test asset filtering logic with different staleness criteria
  - Test query validation with valid/invalid parameters
  - Test GSI performance with large asset datasets
  - Test edge cases: empty results, null data, invalid dates
  - Test coverage target: >90%

- **Integration Tests**:
  - Test DynamoDB GSI integration with actual table structure
  - Verify GSI query performance with realistic data volumes
  - Test Lambda function initialization and execution

- **Performance Tests**:
  - Measure DynamoDB GSI query performance (<15 seconds)
  - Test filtering performance (<2 seconds)
  - Verify Lambda initialization performance (<5 seconds)

#### Acceptance Criteria
- [ ] Lambda function successfully queries assets table using volume-based GSI
- [ ] DynamoDB GSI query logic efficiently retrieves high-volume assets
- [ ] Asset filtering correctly identifies stale assets based on lastPollenationDate
- [ ] Query validation ensures proper parameters and data integrity
- [ ] GSI queries handle large asset datasets efficiently
- [ ] All unit tests pass with >90% coverage
- [ ] Performance benchmarks met (GSI query <15s, filtering <2s, init <5s)
- [ ] Code review completed
- [ ] Query logic documentation provides clear implementation details

#### Error Handling
- DynamoDB GSI query failures are handled gracefully with retry logic
- Invalid query parameters are detected and reported clearly
- Query validation errors provide actionable error messages
- Lambda function provides detailed error logging for debugging

#### Monitoring and Observability
- DynamoDB GSI query performance metrics
- Asset filtering success rates and timing
- Query validation error rates and types
- Lambda function execution timing and memory usage
- Asset record volume and processing statistics

#### Open Questions
- None - all query logic requirements are clear

#### Notes
Focus on creating efficient, reliable GSI query logic that can handle large asset datasets while maintaining good performance. The GSI should be optimized for volume-based queries and provide clear results for downstream priority scoring. Consider that the assets table may contain thousands of records and the query should be efficient enough to handle this scale. 
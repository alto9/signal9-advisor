# Phase 2: Data Collection Implementation

## Phase Estimate: 2 weeks (80 hours)

## Phase Details
- **Name**: Data Collection Implementation
- **Duration**: 2 weeks
- **Priority**: Critical
- **Status**: Not Started

## Phase Overview
This phase implements core data collection capabilities from external APIs, establishing the foundation for scheduled financial data ingestion. It focuses on developing the three primary data collection Lambda functions (SyncAssets, SyncEarningsCalendar, SyncNewsSentiment), implementing comprehensive data validation logic, and establishing robust error handling and retry mechanisms. This phase transforms the infrastructure foundation from Phase 1 into a functional data collection system.

## Business Context
- **Business Value**: Implements core data collection capabilities from external APIs, enabling reliable financial data ingestion for the Signal9 system
- **Success Metrics**: 
  - Asset sync success rate >98%
  - Earnings sync success rate >98%
  - News sync success rate >95%
  - Data validation success rate >95%
  - All scheduled jobs completing successfully within timeout limits
  - API calls completing within 30 seconds

## Technical Scope
- **Components**: 
  - SyncAssets Lambda function with Alpaca API integration
  - SyncEarningsCalendar Lambda function with AlphaVantage integration
  - SyncNewsSentiment Lambda function with hourly processing and asset filtering
  - Comprehensive data validation framework for all financial data types
  - Error handling and retry mechanisms with exponential backoff
  - CloudWatch metrics and monitoring for data collection operations
- **Technical Dependencies**: 
  - Phase 1 infrastructure completion
  - AlphaVantage API access (full premium access)
  - Alpaca API access (standard access)
  - DynamoDB tables operational
  - Secrets Manager credentials configured
- **Architecture Changes**: Implementation of scheduled data collection workflows with Monday-Saturday operations

## Implementation Strategy
- **Key Deliverables**:
  - **Asset Sync**: Complete SyncAssets function with Alpaca API integration
  - **Earnings Sync**: Complete SyncEarningsCalendar function with AlphaVantage integration
  - **News Collection**: Complete SyncNewsSentiment function with hourly processing and asset filtering
  - **Data Validation**: Comprehensive validation framework for all data sources
  - **Error Handling**: Retry logic and error recovery mechanisms with circuit breaker patterns

- **Technical Constraints**: 
  - API rate limits (mitigated with full AlphaVantage access)
  - Lambda timeout constraints (5 minutes for data collection functions)
  - DynamoDB write capacity management
  - Monday-Saturday scheduling requirements

- **Integration Points**:
  - AlphaVantage API endpoints: EARNINGS_CALENDAR, NEWS_SENTIMENT
  - Alpaca API: `/v2/assets?status=active` endpoint
  - DynamoDB tables: assets, earningsCalendar, newsSentiment
  - AWS Secrets Manager for credential management
  - CloudWatch for metrics and logging

## Quality Assurance
- **Testing Requirements**:
  - Unit Testing: >80% coverage for data collection functions
  - Integration Testing: API integration validation with mocked responses
  - Performance Testing: Lambda execution time validation
- **Security Requirements**:
  - Security Reviews: API credential handling review
  - Compliance Checks: Data handling compliance for financial data

## Risk Management
- **Identified Risks**:
  - External API Outages:
    - Impact: High
    - Probability: Medium
    - Mitigation Strategy: Comprehensive error handling, retry logic with exponential backoff, graceful degradation
  - Data Quality Issues:
    - Impact: High
    - Probability: Medium
    - Mitigation Strategy: Multi-layer validation, data consistency checks, soft failure handling
  - API Rate Limiting:
    - Impact: Medium
    - Probability: Low
    - Mitigation Strategy: Premium AlphaVantage access, exponential backoff, rate limit monitoring
- **Contingency Plans**: Manual data collection procedures, API fallback strategies, partial success tracking

## Exit Criteria
- **Technical Criteria**:
  - All 3 scheduled data collection functions operational
  - Data validation logic implemented and tested
  - Error handling with retry logic functional
  - Monday-Saturday scheduling operational
- **Business Criteria**:
  - >95% data validation success rate achieved
  - All scheduled jobs completing successfully within time windows
- **Documentation**: Data collection documentation, API integration guides, troubleshooting procedures
- **Performance Metrics**: All functions executing within timeout limits, API calls completing within 30 seconds

## Tasks

### Task Array

#### Task 2.1: SyncAssets Lambda Function Implementation
**Estimate**: 1.5 days (12 hours)
**Status**: Not Started

##### Description
Implement the SyncAssets Lambda function to perform daily synchronization of tradable assets from the Alpaca API. This function queries the Alpaca `/v2/assets?status=active` endpoint, validates the asset data, and upserts records into the assets DynamoDB table while tracking synchronization timestamps and emitting CloudWatch metrics.

##### Context Hints
- **APIs** - Alpaca: Alpaca API Documentation for tradable asset catalog via `/v2/assets?status=active` endpoint
- **Documentation Resources** - Alpaca Typescript SDK: `@Alpaca Typescript SDK` for interfacing directly with the Alpaca API with Typescript
- **Data Models and Schemas** - Alpaca Assets: [Alpaca Assets Model](./models/alpaca/assets.json) for data format specification
- **Data Storage Context** - assets: symbol (PK), lastPollenationDate (SK) with GSI for status-based queries and volume-based prioritization
- **Operational Context** - Lambda Sizing: SyncAssets: 512MB memory, 5 min timeout (handles large asset lists from Alpaca)
- **Core Lambda Functions Context** - SyncAssets: Daily asset synchronization from Alpaca API

##### Objectives
- Implement complete SyncAssets Lambda function with Alpaca API integration
- Configure asset data validation and transformation logic
- Implement DynamoDB upsert operations with conflict resolution
- Set up CloudWatch metrics emission for monitoring
- Establish error handling with retry mechanisms

##### Testing Strategy
- Unit testing with mocked Alpaca API responses using actual data structures
- Integration testing with DynamoDB write operations
- Error scenario testing for API failures and timeout handling
- Performance testing to ensure execution within 5-minute timeout

##### Scope
- **In Scope**:
  - Complete Lambda function implementation with TypeScript
  - Alpaca API integration using official SDK
  - Asset data validation and transformation
  - DynamoDB upsert operations for assets table
  - CloudWatch metrics emission for success/failure tracking
  - Error handling with exponential backoff retry logic
  - Secrets Manager integration for API credentials
  - Comprehensive unit tests with >90% coverage
- **Out of Scope**:
  - Real-time asset data processing
  - Asset filtering beyond active status
  - Advanced analytics or data enrichment

##### Dependencies
- **Prerequisites**:
  - Phase 1: Infrastructure Foundation completion
  - assets DynamoDB table operational
  - Secrets Manager configured with Alpaca credentials
- **Dependent Tasks**:
  - Task 2.2: SyncEarningsCalendar Lambda Function Implementation
  - Task 2.4: Data Validation Framework Implementation

##### Estimated Effort
- **Time**: 12 hours
- **Complexity**: High
- **Priority**: Critical

##### Success Criteria
- [ ] Lambda function successfully queries Alpaca API and processes asset data
- [ ] Asset data validation correctly identifies and handles invalid records
- [ ] DynamoDB upsert operations complete successfully with proper conflict resolution
- [ ] CloudWatch metrics accurately track function performance and data quality
- [ ] Error handling gracefully manages API failures and timeouts
- [ ] Unit tests achieve >90% coverage with comprehensive error scenario testing
- [ ] Function completes execution within 5-minute timeout under normal loads

##### Notes
Focus on creating a robust, maintainable function that can handle large volumes of asset data efficiently. Implement comprehensive logging for operational visibility and ensure the function can recover from partial failures.

#### Task 2.2: SyncEarningsCalendar Lambda Function Implementation
**Estimate**: 1.5 days (12 hours)
**Status**: Not Started

##### Description
Implement the SyncEarningsCalendar Lambda function to perform daily synchronization of earnings calendar data from the AlphaVantage API. This function queries the AlphaVantage EARNINGS_CALENDAR endpoint, validates earnings data including dates and estimates, and upserts records into the earningsCalendar DynamoDB table with proper tracking and metrics.

##### Context Hints
- **APIs** - AlphaVantage: Full API access available for comprehensive financial data ingestion without rate limit constraints
- **Documentation Resources** - AlphaVantage API: `@AlphaVantage API` for financial data collection including EARNINGS_CALENDAR endpoint
- **Data Models and Schemas** - Earnings Calendar: [AlphaVantage EARNINGS_CALENDAR Model](./models/alphavantage/EARNINGS_CALENDAR.json) for data format specification
- **Data Storage Context** - earningsCalendar: asset_symbol (PK), earnings_date (SK) with upcoming-earnings-index for date-based queries
- **Operational Context** - Lambda Sizing: SyncEarningsCalendar: 256MB memory, 3 min timeout (processes earnings calendar data)
- **Core Lambda Functions Context** - SyncEarningsCalendar: Daily earnings calendar synchronization from AlphaVantage

##### Objectives
- Implement complete SyncEarningsCalendar Lambda function with AlphaVantage API integration
- Configure earnings data validation for dates, symbols, and estimates
- Implement DynamoDB upsert operations with temporal data handling
- Set up CloudWatch metrics for earnings data quality monitoring
- Establish error handling specific to financial data processing

##### Testing Strategy
- Unit testing with mocked AlphaVantage API responses using actual earnings data structures
- Date validation testing for various earnings date formats
- Symbol validation testing against assets table data
- Error scenario testing for API rate limits and data inconsistencies

##### Scope
- **In Scope**:
  - Complete Lambda function implementation with TypeScript
  - AlphaVantage EARNINGS_CALENDAR API integration
  - Earnings data validation (dates, symbols, estimates, actuals)
  - DynamoDB upsert operations for earningsCalendar table
  - CloudWatch metrics emission for data quality tracking
  - Error handling with AlphaVantage-specific retry logic
  - Cross-reference validation with assets table
  - Comprehensive unit tests with >90% coverage
- **Out of Scope**:
  - Historical earnings data backfill
  - Earnings estimate accuracy analysis
  - Real-time earnings updates

##### Dependencies
- **Prerequisites**:
  - Task 2.1: SyncAssets Lambda Function Implementation (for asset validation)
  - earningsCalendar DynamoDB table operational
  - Secrets Manager configured with AlphaVantage credentials
- **Dependent Tasks**:
  - Task 2.3: SyncNewsSentiment Lambda Function Implementation
  - Phase 3 earnings-triggered pollination functionality

##### Estimated Effort
- **Time**: 12 hours
- **Complexity**: High
- **Priority**: Critical

##### Success Criteria
- [ ] Lambda function successfully queries AlphaVantage EARNINGS_CALENDAR API
- [ ] Earnings data validation correctly handles date formats and symbol validation
- [ ] DynamoDB upsert operations maintain temporal data integrity
- [ ] CloudWatch metrics provide visibility into earnings data quality and coverage
- [ ] Error handling manages AlphaVantage API-specific issues gracefully
- [ ] Cross-reference validation ensures earnings data corresponds to tracked assets
- [ ] Unit tests achieve >90% coverage with comprehensive data validation scenarios
- [ ] Function completes execution within 3-minute timeout

##### Notes
Pay special attention to date handling and timezone considerations for earnings data. Ensure the function can handle partial data updates and maintains data consistency across different earnings announcement schedules.

#### Task 2.3: SyncNewsSentiment Lambda Function Implementation
**Estimate**: 1.5 days (12 hours)
**Status**: Not Started

##### Description
Implement the SyncNewsSentiment Lambda function to perform hourly collection of news sentiment data from the AlphaVantage API. This function queries the NEWS_SENTIMENT endpoint, extracts ticker symbols, filters news to only articles mentioning tracked assets, and stores the filtered news with asset associations in the newsSentiment DynamoDB table.

##### Context Hints
- **APIs** - AlphaVantage: Full API access available for comprehensive financial data ingestion including NEWS_SENTIMENT endpoint
- **Documentation Resources** - AlphaVantage API: `@AlphaVantage API` for news sentiment data collection
- **Data Models and Schemas** - News and Sentiment: [AlphaVantage NEWS_SENTIMENT Model](./models/alphavantage/NEWS_SENTIMENT.json) for data format specification
- **Data Storage Context** - newsSentiment: news_id (PK), time_published (SK) with asset-news-index and sentiment-score-index
- **Operational Context** - Lambda Sizing: SyncNewsSentiment: 512MB memory, 5 min timeout (processes large news datasets)
- **Core Lambda Functions Context** - SyncNewsSentiment: Hourly news sentiment collection

##### Objectives
- Implement complete SyncNewsSentiment Lambda function with AlphaVantage NEWS_SENTIMENT integration
- Configure news filtering logic to only include articles mentioning tracked assets
- Implement sentiment score validation and asset association mapping
- Set up efficient DynamoDB write operations for large news datasets
- Establish hourly processing with 2-hour lookback window

##### Testing Strategy
- Unit testing with mocked AlphaVantage NEWS_SENTIMENT responses using actual data structures
- Asset filtering logic testing to ensure only relevant news is stored
- Sentiment score validation testing for range and format compliance
- Performance testing for large news dataset processing within timeout limits

##### Scope
- **In Scope**:
  - Complete Lambda function implementation with TypeScript
  - AlphaVantage NEWS_SENTIMENT API integration
  - News article filtering based on asset ticker mentions
  - Sentiment score validation and normalization
  - Asset association mapping and validation
  - DynamoDB batch write operations for newsSentiment table
  - CloudWatch metrics for news processing volume and quality
  - Hourly processing with 2-hour lookback window
  - Comprehensive unit tests with >90% coverage
- **Out of Scope**:
  - Custom sentiment analysis algorithms
  - News article content analysis beyond ticker extraction
  - Historical news data backfill

##### Dependencies
- **Prerequisites**:
  - Task 2.1: SyncAssets Lambda Function Implementation (for asset validation)
  - newsSentiment DynamoDB table operational
  - Secrets Manager configured with AlphaVantage credentials
- **Dependent Tasks**:
  - Task 2.4: Data Validation Framework Implementation
  - Task 2.6: Integration Testing and Validation

##### Estimated Effort
- **Time**: 12 hours
- **Complexity**: High
- **Priority**: Critical

##### Success Criteria
- [ ] Lambda function successfully queries AlphaVantage NEWS_SENTIMENT API
- [ ] News filtering correctly identifies articles mentioning tracked assets
- [ ] Sentiment score validation ensures data quality and range compliance
- [ ] Asset association mapping accurately links news to relevant symbols
- [ ] DynamoDB batch operations efficiently handle large news datasets
- [ ] CloudWatch metrics provide visibility into news processing volume and quality
- [ ] Hourly processing maintains 2-hour lookback window without data gaps
- [ ] Unit tests achieve >90% coverage with comprehensive filtering scenarios
- [ ] Function completes execution within 5-minute timeout for typical news volumes

##### Notes
Focus on efficient processing of large news datasets and accurate asset filtering. Implement robust deduplication logic to handle news articles that mention multiple tracked assets.

#### Task 2.4: Data Validation Framework Implementation
**Estimate**: 1 day (8 hours)
**Status**: Not Started

##### Description
Develop a comprehensive data validation framework that can be utilized across all data collection functions to ensure financial data quality and consistency. This framework will provide reusable validation functions for different data types, implement validation rules for financial metrics, and establish consistent error handling patterns for validation failures.

##### Context Hints
- **Financial Data Context** - Data Quality: Validation rules for financial metrics, earnings data, and market information
- **System Architecture Context** - Data Validation: Patterns for validating financial data from external APIs
- **Operational Context** - Error Handling: Exponential backoff (1-2s base), max 3 retries, dead letter queues for failed executions
- **Testing Context** - Data Validation Testing: Test cases for financial data validation and edge case handling

##### Objectives
- Create reusable validation functions for different financial data types
- Implement validation rules for symbols, dates, numeric ranges, and required fields
- Establish consistent error handling and logging patterns for validation failures
- Create validation utilities that integrate seamlessly with Lambda functions
- Implement soft failure handling for data quality issues

##### Testing Strategy
- Unit testing for each validation function with comprehensive edge cases
- Integration testing with actual API response data structures
- Error scenario testing for various validation failure modes
- Performance testing to ensure validation overhead is minimal

##### Scope
- **In Scope**:
  - Reusable validation library with TypeScript types
  - Symbol format validation (exchange standards, ticker patterns)
  - Date validation with timezone handling and format standardization
  - Numeric range validation for financial metrics (prices, volumes, ratios)
  - Required field validation with configurable schemas
  - Soft failure handling with detailed error logging
  - Integration helpers for Lambda function usage
  - Comprehensive unit tests with >95% coverage
- **Out of Scope**:
  - Complex business rule validation
  - Real-time data quality monitoring
  - Automated data correction or enrichment

##### Dependencies
- **Prerequisites**:
  - Phase 1: Infrastructure Foundation completion
  - Understanding of data models from Tasks 2.1-2.3
- **Dependent Tasks**:
  - Integration with Tasks 2.1, 2.2, and 2.3 for validation implementation
  - Task 2.5: Error Handling and Retry Logic Implementation

##### Estimated Effort
- **Time**: 8 hours
- **Complexity**: Medium
- **Priority**: High

##### Success Criteria
- [ ] Validation framework provides comprehensive coverage for all financial data types
- [ ] Symbol validation correctly handles various exchange formats and ticker patterns
- [ ] Date validation properly handles timezones and standardizes formats
- [ ] Numeric validation enforces appropriate ranges for financial metrics
- [ ] Soft failure handling allows processing to continue with detailed error logging
- [ ] Integration helpers simplify usage within Lambda functions
- [ ] Unit tests achieve >95% coverage with comprehensive edge case scenarios
- [ ] Validation overhead adds <100ms to typical data processing operations

##### Notes
Design the framework to be extensible for future data types and validation rules. Focus on creating clear, maintainable code that provides excellent error messages for debugging.

#### Task 2.5: Error Handling and Retry Logic Implementation
**Estimate**: 1 day (8 hours)
**Status**: Not Started

##### Description
Implement comprehensive error handling and retry logic that can be utilized across all data collection Lambda functions. This includes exponential backoff strategies, circuit breaker patterns, dead letter queue integration, and graceful degradation mechanisms for various failure scenarios including API outages, rate limiting, and data inconsistencies.

##### Context Hints
- **Operational Context** - Error Handling: Exponential backoff (1-2s base), max 3 retries, dead letter queues for failed executions
- **System Architecture Context** - Error Handling: Retry logic and error recovery patterns for external API integration
- **Operational Context** - API Management: No health monitoring initially, reactive handling of contract changes
- **Testing Context** - Error Scenario Testing: Patterns for testing API failures, timeout scenarios, and retry logic

##### Objectives
- Implement exponential backoff retry logic with configurable parameters
- Create circuit breaker patterns for external API protection
- Establish dead letter queue integration for failed operations
- Implement graceful degradation and partial success tracking
- Create reusable error handling utilities for Lambda functions

##### Testing Strategy
- Unit testing for retry logic with various failure scenarios
- Integration testing with mocked API failures and timeouts
- Circuit breaker testing with sustained failure conditions
- Dead letter queue integration testing

##### Scope
- **In Scope**:
  - Exponential backoff implementation (1-2s base, max 30s delay, max 3 retries)
  - Circuit breaker pattern for API calls (>20% error rate over 5 minutes)
  - Dead letter queue integration for failed Lambda executions
  - Graceful degradation with partial success tracking
  - Timeout handling with cleanup procedures
  - API-specific error handling (rate limits, authentication, data format)
  - Comprehensive error logging with structured data
  - Reusable utilities for Lambda function integration
  - Unit tests with >90% coverage for error scenarios
- **Out of Scope**:
  - Real-time alerting integration
  - Automatic failover to backup APIs
  - Complex recovery orchestration

##### Dependencies
- **Prerequisites**:
  - Task 2.4: Data Validation Framework Implementation
  - Understanding of API behaviors from Tasks 2.1-2.3
- **Dependent Tasks**:
  - Integration with all data collection Lambda functions
  - Task 2.6: Integration Testing and Validation

##### Estimated Effort
- **Time**: 8 hours
- **Complexity**: Medium
- **Priority**: High

##### Success Criteria
- [ ] Exponential backoff correctly implements specified timing and retry limits
- [ ] Circuit breaker effectively protects against sustained API failures
- [ ] Dead letter queue integration captures failed executions for analysis
- [ ] Graceful degradation allows partial processing success
- [ ] Timeout handling prevents resource leaks and provides clean shutdown
- [ ] API-specific error handling addresses known failure modes
- [ ] Error logging provides sufficient detail for operational troubleshooting
- [ ] Retry utilities integrate seamlessly with Lambda functions
- [ ] Unit tests achieve >90% coverage for all error scenarios
- [ ] Error handling adds minimal overhead to successful operations

##### Notes
Focus on creating robust, predictable error handling that provides clear operational visibility. Ensure error handling does not mask important issues while providing resilience against transient failures.

#### Task 2.6: Integration Testing and Validation
**Estimate**: 0.5 days (4 hours)
**Status**: Not Started

##### Description
Perform comprehensive integration testing and validation of all Phase 2 data collection components to ensure they work together seamlessly and meet the specified performance and quality requirements. This includes end-to-end testing of the scheduled data collection workflows, validation of data flow between functions and storage, and verification of monitoring and error handling capabilities.

##### Context Hints
- **Testing Context** - Integration Testing: Deferred - focus on comprehensive unit testing with mocks
- **Testing Context** - Mock Data Strategy: Use actual API response structures from models folders
- **Quality Assurance** - Integration Testing: API integration validation with mocked responses
- **Operational Context** - Troubleshooting: Operational procedures for diagnosing and resolving data collection issues

##### Objectives
- Validate end-to-end data collection workflows for all three Lambda functions
- Verify data flow integrity from APIs through validation to DynamoDB storage
- Test scheduled trigger functionality and Monday-Saturday operations
- Validate CloudWatch metrics and logging functionality
- Confirm error handling and retry logic work correctly in integrated environment

##### Testing Strategy
- End-to-end workflow testing with mocked API responses
- Data flow validation from source APIs to DynamoDB tables
- Scheduled trigger testing using EventBridge test events
- Error injection testing to validate integrated error handling
- Performance testing to ensure functions meet timeout requirements

##### Scope
- **In Scope**:
  - End-to-end testing of all three data collection workflows
  - Data flow validation from APIs to DynamoDB tables
  - EventBridge trigger testing with Monday-Saturday schedule validation
  - CloudWatch metrics and logging validation
  - Integrated error handling and retry logic testing
  - Performance validation under normal and high-load conditions
  - Documentation of integration test procedures and results
- **Out of Scope**:
  - Production API testing with real credentials
  - Load testing with actual high-volume data
  - Advanced performance optimization

##### Dependencies
- **Prerequisites**:
  - All previous Phase 2 tasks (2.1-2.5) completed
  - Phase 1 infrastructure operational
- **Dependent Tasks**:
  - Phase 3: Event-Driven Processing

##### Estimated Effort
- **Time**: 4 hours
- **Complexity**: Medium
- **Priority**: Medium

##### Success Criteria
- [ ] All three data collection workflows complete successfully in integrated environment
- [ ] Data flows correctly from API sources through validation to DynamoDB storage
- [ ] EventBridge scheduled triggers work correctly with Monday-Saturday restrictions
- [ ] CloudWatch metrics accurately reflect function performance and data quality
- [ ] Error handling and retry logic function correctly under failure conditions
- [ ] Performance requirements met: functions complete within timeout limits
- [ ] Integration test documentation provides clear procedures for ongoing validation
- [ ] All exit criteria for Phase 2 are validated and confirmed

##### Notes
This task serves as the final validation gate for Phase 2. Ensure all success metrics and exit criteria are met before proceeding to Phase 3. Focus on identifying any integration issues that weren't caught in unit testing.

## Phase Dependencies
- **Depends on**: Phase 1: Infrastructure Foundation
- **Enables**: Phase 3: Event-Driven Processing

## Monitoring and Success Metrics

### Technical Metrics
- **API Integration Success**:
  - Metric: API call success rate for each service (Alpaca, AlphaVantage)
  - Target: >98% for Alpaca, >98% for AlphaVantage
  - Measurement Method: CloudWatch metrics from Lambda functions
- **Data Processing Performance**:
  - Metric: Lambda function execution time
  - Target: <50% of configured timeout (SyncAssets: <2.5min, SyncEarningsCalendar: <1.5min, SyncNewsSentiment: <2.5min)
  - Measurement Method: CloudWatch Lambda duration metrics
- **Data Quality**:
  - Metric: Data validation success rate
  - Target: >95% for all data sources
  - Measurement Method: Custom CloudWatch metrics from validation framework

### Business Metrics
- **Data Collection Reliability**:
  - Description: Percentage of scheduled data collection jobs that complete successfully
  - Target: 100% completion rate for all scheduled functions
  - Impact: Ensures consistent data availability for downstream processing
- **Data Freshness**:
  - Description: Time lag between data availability from external APIs and storage in system
  - Target: <1 hour for all data sources
  - Impact: Maintains data currency for analysis and decision-making 
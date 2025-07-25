# Ticket 2.3.1: SyncNewsSentiment Lambda Function Core Implementation

### Estimate
5 hours

**Status**: Refinement Complete

#### Description
Implement the core SyncNewsSentiment Lambda function to collect news sentiment data from the AlphaVantage API’s NEWS_SENTIMENT endpoint. The function should be scheduled to run hourly, fetch news data, and prepare it for further processing.

#### Technical Details
- **Implementation Steps:**
  1. Create TypeScript Lambda function structure with proper imports and type definitions.
  2. Implement AlphaVantage API client using HTTP requests with credentials from AWS Secrets Manager.
  3. Fetch news sentiment data using the NEWS_SENTIMENT endpoint, with a 2-hour lookback window.
  4. Parse and structure the response according to the NEWS_SENTIMENT model.
  5. Add structured logging for function entry, API calls, and exit points.
  6. Emit CloudWatch metrics for function execution and news volume.
  7. Implement timeout handling to ensure function completes within 5 minutes.

- **Dependencies:**
  - Phase 1 infrastructure (newsSentiment DynamoDB table, Secrets Manager)
  - AlphaVantage API credentials in Secrets Manager

- **Testing Requirements:**
  - Mock AlphaVantage API responses using actual data structures from `ai/brainstorm/models/alphavantage/NEWS_SENTIMENT.json`
  - Test API client initialization and data fetching
  - Test timeout and error scenarios
  - Test CloudWatch metrics emission

- **Acceptance Criteria:**
  - Lambda function initializes and fetches news sentiment data from AlphaVantage
  - Data is parsed and structured according to the NEWS_SENTIMENT model
  - Function completes within 5-minute timeout
  - All unit tests pass with >90% coverage 
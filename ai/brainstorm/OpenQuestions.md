# Open Questions - Signal9 Data Collection System

## Purpose
This document tracks all open questions that need to be resolved before the project can be successfully planned and implemented. All questions which would prevent the project from being successfully planned should be listed here.

## Critical Questions (Must Resolve Before Implementation)

### Polygon.io API Integration
1. **API Access Level**: What specific Polygon.io subscription tier do we have access to? (Basic, Starter, Developer, Advanced, etc.)
   - **Impact**: Determines rate limits, data availability, and API endpoints accessible
   - **Status**: Resolved
   - **Owner**: Technical Team
   - **Resolution**: Access includes: All US Stocks Tickers, Unlimited API Calls, 5 Years Historical Data, 100% Market Coverage, 15-minute Delayed Data

2. **Rate Limits**: What are the specific rate limits for each Polygon.io endpoint we plan to use?
    - **Impact**: Affects Lambda function timeouts and error handling strategies
    - **Status**: Resolved
    - **Owner**: Technical Team
    - **Resolution**: Polygon.io has unlimited API calls with 25 calls per minute rate limit. AlphaVantage has minimal rate limiting concerns (1 daily call for earnings calendar, 1 call per ticker per pollination for transcripts)

3. **API Authentication**: How do we implement unified secret management for both Polygon.io and AlphaVantage API credentials and hosts?
    - **Impact**: Determines how the single Signal9APICredentials secret is stored, retrieved, and used across all Lambda functions
    - **Status**: Resolved
    - **Owner**: Technical Team
    - **Resolution**: Single `Signal9APICredentials` secret containing `POLYGON_API_HOST`, `POLYGON_API_KEY`, `ALPHA_VANTAGE_API_HOST`, `ALPHA_VANTAGE_API_KEY`

### AlphaVantage API Integration
4. **Earnings Calendar Access**: Do we have access to AlphaVantage's EARNINGS_CALENDAR endpoint?
   - **Impact**: Critical for earnings detection and triggered pollination functionality
   - **Status**: Resolved
   - **Owner**: Technical Team
   - **Resolution**: Yes, we have access to AlphaVantage's EARNINGS_CALENDAR endpoint for earnings detection and triggered pollination

5. **AlphaVantage Authentication**: How do we implement API key authentication for AlphaVantage's EARNINGS_CALENDAR and EARNINGS_CALL_TRANSCRIPT endpoints using the unified secret?
    - **Impact**: Determines API key retrieval from unified secret and query parameter usage patterns for both endpoints
    - **Status**: Resolved
    - **Owner**: Technical Team
    - **Resolution**: API key retrieved from unified secret and used as query parameter in URLs: `{{ALPHA_VANTAGE_API_HOST}}/query?function=EARNINGS_CALENDAR&apikey={{ALPHA_VANTAGE_API_KEY}}`

### Data Mapping and Structure
6. **Tickers vs Assets**: How does Polygon.io's Tickers endpoint data structure compare to Alpaca's Assets endpoint?
    - **Impact**: Determines data transformation requirements and DynamoDB schema changes
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: We've standardized on "Ticker" terminology throughout the system, aligning with Polygon.io's data model. All references changed from "Asset" to "Ticker".

7. **Financial Data Structure**: What is the exact structure of Polygon.io's Quarterly Financials and Yearly Financials endpoints?
    - **Impact**: Determines DynamoDB table schemas and data validation rules
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: Polygon.io financials endpoint returns comprehensive financial data with income statement, balance sheet, cash flow statement, and comprehensive income. Each record includes start_date, end_date, timeframe, fiscal_period, fiscal_year, and detailed financial metrics with values, units, labels, and order fields.

8. **Earnings Calendar Structure**: How do we handle AlphaVantage's EARNINGS_CALENDAR CSV response format?
    - **Impact**: Determines CSV parsing logic and earningsCalendar table schema mapping
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: CSV format: symbol,name,reportDate,fiscalDateEnding,estimate,currency. DynamoDB schema: symbol (PK), reportDate (SK), with attributes for name, fiscalDateEnding, estimate, currency, is_processed, created_at, updated_at

9. **Earnings Call Transcript Structure**: How do we handle AlphaVantage's EARNINGS_CALL_TRANSCRIPT JSON response format?
    - **Impact**: Determines JSON parsing logic and earningsCallTranscripts table schema mapping
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: JSON format with symbol, quarter, and transcript array (speaker, title, content, sentiment). DynamoDB schema: symbol (PK), quarter (SK) for earningsCallTranscripts table

10. **Earnings Calendar Refresh Strategy**: How do we implement the complete refresh strategy for the earnings calendar?
    - **Impact**: Determines DynamoDB operations (clear all + batch write) and data consistency approach
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: Complete refresh daily - clear all existing earnings calendar records and replace with current calendar data from AlphaVantage

11. **News Data Structure**: What is the exact structure of Polygon.io's News endpoint including sentiment analysis fields?
    - **Impact**: Determines news table schema and sentiment data mapping
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: Polygon.io News endpoint provides sentiment analysis directly in the response. News table includes sentiment_score and sentiment_label attributes

### Corporate Actions Data
12. **Splits Data**: What is the structure and availability of stock split data from Polygon.io?
    - **Impact**: Determines splits table schema and data collection strategy
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: Polygon.io splits endpoint returns split data with execution_date, id, split_from, split_to, and ticker fields. Each record represents a stock split with the ratio (e.g., 1:4 split means 1 share becomes 4 shares).

13. **Dividends Data**: What is the structure and availability of dividend data from Polygon.io?
    - **Impact**: Determines dividends table schema and data collection strategy
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: Polygon.io dividends endpoint returns dividend data with cash_amount, currency, declaration_date, dividend_type, ex_dividend_date, frequency, pay_date, record_date, and ticker fields. Includes pagination support with next_url for large datasets.

14. **IPOs Data**: What is the structure and availability of IPO data from Polygon.io?
    - **Impact**: Determines IPOs table schema and data collection strategy
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: Polygon.io IPOs endpoint returns IPO data with ticker, listing_date, issuer_name, currency_code, offer details (max_shares, price_range, total_offer_size), exchange, shares_outstanding, security_type, and ipo_status fields.

15. **Related Tickers**: What is the structure and availability of related tickers data from Polygon.io?
    - **Impact**: Determines relatedTickers table schema and relationship mapping
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: Polygon.io related tickers endpoint returns a simple array of related ticker symbols for a given ticker, showing correlated or related securities in the market.

### Data Quality and Validation
16. **Data Completeness**: What is the typical data completeness rate for each Polygon.io endpoint?
    - **Impact**: Affects data validation rules and error handling strategies
    - **Status**: Resolved
    - **Owner**: Data Quality Team
    - **Resolution**: Polygon.io provides comprehensive data completeness with 15-minute delayed market data. Earnings reports are typically available by next morning after release. Polygon would be ineffective without this basic level of completeness.

17. **Historical Data Depth**: How far back does historical data go for each Polygon.io endpoint?
    - **Impact**: Determines bulk upsert strategy and data processing requirements
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: 5 years of historical data available for all Polygon.io endpoints

18. **Data Update Frequency**: How frequently is data updated in Polygon.io's system?
    - **Impact**: Affects our polling schedules and data freshness requirements
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: 15-minute delayed data for all US stocks with 100% market coverage

19. **Earnings Calendar Freshness**: How frequently is AlphaVantage's earnings calendar updated?
    - **Impact**: Affects earnings detection timing and accuracy
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: Daily refresh strategy implemented. Earnings detection runs at 5:00 AM, calendar sync runs at 6:00 AM to ensure fresh data for next day's detection

### Implementation Strategy
20. **Polygon.io SDK**: Does Polygon.io provide an official Node.js/TypeScript SDK, or do we need to use REST calls?
    - **Impact**: Determines implementation approach and dependency management
    - **Status**: Resolved
    - **Owner**: Technical Team
    - **Resolution**: No official SDK available. We should build an internal wrapper class to avoid REST calls scattered throughout code.

21. **Error Handling**: What are the common error responses and status codes from both Polygon.io and AlphaVantage APIs?
    - **Impact**: Determines error handling and retry logic implementation
    - **Status**: Resolved
    - **Owner**: Technical Team
    - **Resolution**: Standard REST status codes: 300s for redirects, 400s for client issues, 500s for server issues.

22. **Data Pagination**: How do we handle pagination for Polygon.io endpoints that return paged results (tickers, financials, news, etc.)?
    - **Impact**: Affects Lambda function complexity, timeout requirements, and batch processing strategy across multiple endpoints
    - **Status**: Resolved
    - **Owner**: Technical Team
    - **Resolution**: Many Polygon.io endpoints return paged results with `next_url` parameter and `count` field. Implement pagination handling with exponential backoff and retry logic

23. **Pagination Strategy**: What is the optimal strategy for handling pagination across multiple Polygon.io endpoints with different data volumes?
    - **Impact**: Determines timeout configurations, memory allocation, and processing patterns for different data types
    - **Status**: Resolved
    - **Owner**: Technical Team
    - **Resolution**: Question redundant with #22. Pagination strategy is covered by the general pagination handling approach.

### Cost and Performance
24. **API Costs**: What are the costs per API call for each Polygon.io endpoint and AlphaVantage endpoint we plan to use?
    - **Impact**: Affects budget planning and cost optimization strategies
    - **Status**: Resolved
    - **Owner**: Business Team
    - **Resolution**: No per-call costs for API calls. Not a concern for our implementation.

25. **Data Volume**: What is the typical response size for each Polygon.io and AlphaVantage endpoint?
    - **Impact**: Affects Lambda memory requirements and DynamoDB write capacity
    - **Status**: Resolved
    - **Owner**: Technical Team
    - **Resolution**: Unknown at this time. We will perform measurements as we go during implementation.

### Migration Strategy
26. **Data Migration**: How do we handle the transition from Alpaca/AlphaVantage data to Polygon.io + AlphaVantage hybrid approach?
    - **Impact**: Determines migration strategy and data continuity planning
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: No migration needed. We are brainstorming a new product, not transitioning from existing data.

27. **Backward Compatibility**: Do we need to maintain compatibility with existing data structures during transition?
    - **Impact**: Affects migration complexity and timeline
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: No backward compatibility needed. This is a new product with no existing data structures to maintain.

### Hybrid Approach Coordination
28. **Data Consistency**: How do we ensure data consistency between Polygon.io tickers and AlphaVantage earnings calendar?
    - **Impact**: Critical for earnings detection and triggered pollination
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: We don't actively ensure consistency. Vast majority of tickers will align by symbol. Any mismatches will be handled as edge cases during implementation.

29. **Symbol Matching**: How do we handle symbol mismatches between Polygon.io and AlphaVantage APIs?
    - **Impact**: Affects earnings detection accuracy and data validation
    - **Status**: Resolved
    - **Owner**: Data Architecture Team
    - **Resolution**: Same as #28. Vast majority of tickers will align by symbol. Any mismatches will be handled as edge cases during implementation.

## Medium Priority Questions

### Monitoring and Observability
30. **API Health Monitoring**: Do Polygon.io and AlphaVantage provide health status endpoints or webhooks?
    - **Impact**: Determines monitoring strategy for API availability
    - **Status**: Open
    - **Owner**: DevOps Team

31. **Rate Limit Monitoring**: How can we monitor our Polygon.io API usage and rate limit status?
    - **Impact**: Affects CloudWatch metrics and alerting strategy
    - **Status**: Open
    - **Owner**: DevOps Team

### Future Expansion
32. **Additional Data Types**: What other data types does Polygon.io offer that we might want to integrate in the future?
    - **Impact**: Affects long-term architecture planning
    - **Status**: Open
    - **Owner**: Product Team

33. **Real-time Data**: Do Polygon.io or AlphaVantage offer real-time data feeds that we might want to integrate?
    - **Impact**: Affects future architecture decisions
    - **Status**: Open
    - **Owner**: Product Team

## Low Priority Questions

### Documentation and Support
34. **API Documentation Quality**: How comprehensive and up-to-date is the documentation for both Polygon.io and AlphaVantage APIs?
    - **Impact**: Affects development speed and troubleshooting
    - **Status**: Open
    - **Owner**: Technical Team

35. **Support Availability**: What level of support do Polygon.io and AlphaVantage provide for API integration issues?
    - **Impact**: Affects risk mitigation and troubleshooting capabilities
    - **Status**: Open
    - **Owner**: Technical Team

## Resolution Status Legend
- **Open**: Question not yet resolved
- **In Progress**: Question being actively researched
- **Resolved**: Question answered and documented
- **Blocked**: Question cannot be resolved due to external dependencies

## Next Steps
1. **Immediate Priority**: Resolve all Critical Questions before Phase 1 implementation
2. **Research Phase**: Allocate time for API exploration and documentation review for both providers
3. **Documentation**: Update all brainstorm documents once questions are resolved
4. **Validation**: Test assumptions with actual API calls and sample data from both providers

---

**Document Status**: Updated for hybrid Polygon.io + AlphaVantage approach
**Last Updated**: [Current Date]
**Next Review**: After API exploration and documentation review for both providers 
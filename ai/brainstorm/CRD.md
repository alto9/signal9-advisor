# Contextual Requirements Document - Signal9 Data Collection System

## Purpose

This file serves as a central repository for all relevant context that will be needed during the implementation phase of the Signal9 Data Collection System. Context items are organized by category and include clear references to their sources. This document focuses exclusively on data collection, processing, and storage requirements.

## Context Hints

### APIs
- **Polygon.io**: [Polygon.io API Documentation](https://polygon.io/docs/) - Polygon.io is used for comprehensive financial data including tickers, financial statements, corporate actions, and news.
- **AlphaVantage**: [AlphaVantage API Documentation](https://www.alphavantage.co/documentation/) - AlphaVantage is used for earnings calendar data via the EARNINGS_CALENDAR endpoint.

### Documentation Resources
- **Polygon.io API**: Doc: `@Polygon.io API` - used to inform tasks related to interfacing directly with the Polygon.io API for financial data collection including Tickers, Ticker Overview, Quarterly Financials, Yearly Financials, IPOs, Splits, Dividends, and News endpoints.
- **AlphaVantage API**: Doc: `@AlphaVantage API` - used to inform tasks related to interfacing directly with the AlphaVantage API for earnings calendar data collection.

### Data Models and Schemas
- **Tickers**: [Polygon.io Tickers Model](./models/polygon/TICKERS.json) - describes the format of data received from Polygon.io for the Tickers endpoint
- **Ticker Overview**: [Polygon.io Ticker Overview Model](./models/polygon/TICKER_OVERVIEW.json) - describes the format of data received from Polygon.io for the Ticker Overview endpoint
- **Quarterly Financials**: [Polygon.io Quarterly Financials Model](./models/polygon/QUARTERLY_FINANCIALS.json) - describes the format of data received from Polygon.io for the Quarterly Financials endpoint
- **Yearly Financials**: [Polygon.io Yearly Financials Model](./models/polygon/YEARLY_FINANCIALS.json) - describes the format of data received from Polygon.io for the Yearly Financials endpoint
- **IPOs**: [Polygon.io IPOs Model](./models/polygon/IPOS.json) - describes the format of data received from Polygon.io for the IPOs endpoint
- **Splits**: [Polygon.io Splits Model](./models/polygon/SPLITS.json) - describes the format of data received from Polygon.io for the Splits endpoint
- **Dividends**: [Polygon.io Dividends Model](./models/polygon/DIVIDENDS.json) - describes the format of data received from Polygon.io for the Dividends endpoint
- **News**: [Polygon.io News Model](./models/polygon/NEWS.json) - describes the format of data received from Polygon.io for the News endpoint
- **Related Tickers**: [Polygon.io Related Tickers Model](./models/polygon/RELATED_TICKERS.json) - describes the format of data received from Polygon.io for the Related Tickers endpoint
- **Earnings Calendar**: [AlphaVantage EARNINGS_CALENDAR Model](./models/alphavantage/EARNINGS_CALENDAR.json) - describes the format of data received from AlphaVantage for earnings calendar information

### AWS Tools and Infrastructure
- **AWS CDK**: `Tool: CDKGeneralGuidance` - "CDK Construct Guidance" for infrastructure as code deployment
- **AWS Documentation**: `Tool: read_documentation` - "AWS General Guidance" for serverless architecture implementation
- **DynamoDB**: Database design patterns for financial data storage with appropriate indexing strategies
- **Lambda Functions**: Serverless compute for data collection and processing workflows
- **EventBridge**: Event-driven architecture for scheduled triggers and custom events
- **CloudWatch**: Monitoring, metrics, and alerting for system observability including Signal9 Ingestion Dashboard
- **Secrets Manager**: Secure storage and rotation of API credentials

### System Architecture Context
- **Dual Pollination Strategy**: Two distinct triggers for pollenationNeeded events:
  - Earnings-triggered (6:00 AM): Tickers with recent earnings releases
  - Regular/Age-based (7:00 AM): High-volume tickers with oldest lastPollenationDate
- **Event-Driven Processing**: Architecture diagrams and workflows for pollenationNeeded and earningsProcessed events
- **Scheduled Workflows**: Cron job patterns for daily and hourly data collection (Monday-Saturday only)
- **Maintenance Schedule**: Sunday maintenance window with all scheduled jobs disabled
- **Ticker Prioritization**: Logic for selecting tickers based on trading volume and data staleness
- **Data Validation**: Patterns for validating financial data from external APIs
- **Error Handling**: Retry logic and error recovery patterns for external API integration
- **Monitoring Patterns**: CloudWatch metrics and alerting strategies for data collection systems
- **Signal9 Ingestion Dashboard**: Comprehensive monitoring dashboard for system health, cost tracking, and operational insights

### Financial Data Context
- **Ticker Types**: Focus on US equity markets, excluding fixed income and derivatives
- **Data Freshness**: Daily updates for most data, hourly for news
- **Data Quality**: Validation rules for financial metrics, earnings data, and market information
- **Historical Data**: Complete historical datasets from Polygon.io for comprehensive analysis foundation
- **Market Hours**: Consideration of market timing for data collection scheduling (4AM-7AM ET processing window)

### Testing Context
- **Unit Testing**: Jest framework with TypeScript for Lambda function testing
- **Mock Data Strategy**: Use actual API response structures from `ai/brainstorm/models/polygon/` and `ai/brainstorm/models/alphavantage/`
- **Test Data Generation**: Manual API calls to collect real sample data for testing fixtures
- **Coverage Requirements**: 90% for critical data processing functions
- **Integration Testing**: Deferred - focus on comprehensive unit testing with mocks
- **Data Validation Testing**: Test cases for financial data validation and edge case handling
- **Error Scenario Testing**: Patterns for testing API failures, timeout scenarios, and retry logic

### Operational Context
- **Deployment**: GitHub Actions with CDK CLI, tag-based production deployments
- **Rollback Strategy**: Re-deploy previous Git tag via GitHub Actions workflow
- **Lambda Sizing**: Specific memory and timeout configurations for 7 Lambda functions (128MB-1024MB, 30s-10min)
- **Error Handling**: Exponential backoff (1-2s base), max 3 retries, dead letter queues for failed executions
- **Data Retention**: Indefinite retention for all tables to support historical analysis
- **Maintenance Window**: Sunday (all scheduled jobs disabled for system maintenance)
- **Manual Operations**: Only engineers with AWS access can trigger manual data collection
- **Data Recovery**: Full datasets from vendors rebuild automatically through regular pollination
- **API Management**: No health monitoring initially, reactive handling of contract changes, no automated key rotation
- **Monitoring**: Production monitoring with Polygon.io rate limit tracking via CloudWatch metrics
- **Signal9 Ingestion Dashboard**: Real-time system health monitoring, cost tracking, and operational insights
- **Troubleshooting**: Operational procedures for diagnosing and resolving data collection issues
- **Capacity Planning**: Resource sizing for Lambda functions and DynamoDB tables
- **Cost Optimization**: Strategies for managing AWS costs and API usage across both providers

## Implementation References

### Core Lambda Functions Context
1. **SyncTickers** - Daily ticker synchronization from Polygon.io API
2. **SyncEarningsCalendar** - Daily earnings calendar synchronization from AlphaVantage
3. **TriggerEarningsPollenation** - Daily trigger for earnings-based data collection (6:00 AM)
4. **TriggerRegularPollenation** - Daily trigger for age-based data refresh using volume + staleness criteria (7:00 AM)
5. **SyncNews** - Hourly news collection
6. **PollenateTicker** - Event-driven comprehensive financial data collection (handles pollenationNeeded from both triggers)
7. **MarkEarningsProcessed** - Event-driven earnings processing status updates

### Data Storage Context
- **tickers**: symbol (PK), lastPollenationDate (SK) with GSI for status-based queries and volume-based prioritization
- **earningsCalendar**: ticker_symbol (PK), earnings_date (SK) with earnings-date-index for upcoming earnings queries
- **news**: news_id (PK), time_published (SK) with ticker-news-index and source-time-index
- **foundationalData**: All tables use symbol (PK), fiscal_date_ending/last_updated (SK) pattern for temporal queries
- **Data Retention**: Indefinite retention across all tables for comprehensive historical analysis

### Integration Context
- **Full API Access**: Polygon.io premium access with 25 calls per minute rate limit, Bearer token authentication
- **Earnings Calendar**: AlphaVantage EARNINGS_CALENDAR endpoint for earnings detection (CSV format)
- **Ticker Filtering**: Focus on active tradable tickers from Polygon.io catalog
- **News Filtering**: Ticker-specific news filtering based on ticker mentions
- **Data Consistency**: Cross-reference validation between related datasets
- **Event Orchestration**: Proper sequencing of data collection and processing events

## Future Context Considerations

### Expansion Planning
- **Additional Data Sources**: Context for integrating future financial data providers
- **API Exposure**: Patterns for exposing collected data via REST APIs
- **Analytics Integration**: Context for adding data analytics capabilities
- **Real-time Data**: Considerations for future real-time data feed integration

### Integration Patterns
- **Consumer Applications**: Context for applications that will consume collected data
- **Data Export**: Patterns for data export and sharing with external systems
- **Backup and Recovery**: Context for data backup and disaster recovery procedures

---

**Document Status**: Updated for hybrid Polygon.io + AlphaVantage approach
**Scope**: Data ingestion, processing, and storage context only
**Usage**: Reference during implementation phase for technical context and patterns
**Maintenance**: Update as new context requirements are identified during development

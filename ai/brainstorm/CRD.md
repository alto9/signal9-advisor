# Contextual Requirements Document - Signal9 Data Collection System

## Purpose

This file serves as a central repository for all relevant context that will be needed during the implementation phase of the Signal9 Data Collection System. Context items are organized by category and include clear references to their sources. This document focuses exclusively on data collection, processing, and storage requirements.

## Context Hints

### APIs
- **Alpaca**: [Alpaca API Documentation](https://docs.alpaca.markets/) - Alpaca is used for tradable asset catalog via `/v2/assets?status=active` endpoint.
- **AlphaVantage**: Full API access available for comprehensive financial data ingestion without rate limit constraints. Provides multiple endpoints for complete financial dataset.

### Documentation Resources
- **AlphaVantage API**: Doc: `@AlphaVantage API` - used to inform tasks related to interfacing directly with the Alpha Vantage API for financial data collection including COMPANY_OVERVIEW, EARNINGS, CASH_FLOW, BALANCE_SHEET, INCOME_STATEMENT, and NEWS_SENTIMENT endpoints.
- **Alpaca Typescript SDK**: Doc: `@Alpaca Typescript SDK` - used to inform tasks related to interfacing directly with the Alpaca API with Typescript for asset catalog synchronization.

### Data Models and Schemas
- **Company Overview**: [AlphaVantage OVERVIEW Model](./models/alphavantage/OVERVIEW.json) - describes the format of data received from AlphaVantage for the Company Overview endpoint
- **News and Sentiment**: [AlphaVantage NEWS_SENTIMENT Model](./models/alphavantage/NEWS_SENTIMENT.json) - describes the format of data received from AlphaVantage for the News and Sentiment data
- **Balance Sheet**: [AlphaVantage BALANCE_SHEET Model](./models/alphavantage/BALANCE_SHEET.json) - describes the format of data received from AlphaVantage for the Balance Sheet data
- **Cash Flow**: [AlphaVantage CASH_FLOW Model](./models/alphavantage/CASH_FLOW.json) - describes the format of data received from AlphaVantage for the Cash Flow documents
- **Earnings**: [AlphaVantage EARNINGS Model](./models/alphavantage/EARNINGS.json) - describes the format of data received from AlphaVantage for the Earnings data
- **Income Statement**: [AlphaVantage INCOME_STATEMENT Model](./models/alphavantage/INCOME_STATEMENT.json) - describes the format of data received from AlphaVantage for the Income Statement data
- **Earnings Calendar**: [AlphaVantage EARNINGS_CALENDAR Model](./models/alphavantage/EARNINGS_CALENDAR.json) - describes the format of data received from AlphaVantage for earnings calendar information
- **Alpaca Assets**: [Alpaca Assets Model](./models/alpaca/assets.json) - describes the format of data received from Alpaca for tradable asset information

### AWS Tools and Infrastructure
- **AWS CDK**: `Tool: CDKGeneralGuidance` - "CDK Construct Guidance" for infrastructure as code deployment
- **AWS Documentation**: `Tool: read_documentation` - "AWS General Guidance" for serverless architecture implementation
- **DynamoDB**: Database design patterns for financial data storage with appropriate indexing strategies
- **Lambda Functions**: Serverless compute for data collection and processing workflows
- **EventBridge**: Event-driven architecture for scheduled triggers and custom events
- **CloudWatch**: Monitoring, metrics, and alerting for system observability
- **Secrets Manager**: Secure storage and rotation of API credentials

### System Architecture Context
- **Dual Pollination Strategy**: Two distinct triggers for pollenationNeeded events:
  - Earnings-triggered (6:00 AM): Assets with recent earnings releases
  - Regular/Age-based (7:00 AM): High-volume assets with oldest lastPollenationDate
- **Event-Driven Processing**: Architecture diagrams and workflows for pollenationNeeded and earningsProcessed events
- **Scheduled Workflows**: Cron job patterns for daily and hourly data collection (Monday-Saturday only)
- **Maintenance Schedule**: Sunday maintenance window with all scheduled jobs disabled
- **Asset Prioritization**: Logic for selecting assets based on trading volume and data staleness
- **Data Validation**: Patterns for validating financial data from external APIs
- **Error Handling**: Retry logic and error recovery patterns for external API integration
- **Monitoring Patterns**: CloudWatch metrics and alerting strategies for data collection systems

### Financial Data Context
- **Asset Types**: Focus on US equity markets, excluding fixed income and derivatives
- **Data Freshness**: Daily updates for most data, hourly for news sentiment
- **Data Quality**: Validation rules for financial metrics, earnings data, and market information
- **Historical Data**: Complete historical datasets from AlphaVantage for comprehensive analysis foundation
- **Market Hours**: Consideration of market timing for data collection scheduling (4AM-7AM ET processing window)

### Testing Context
- **Unit Testing**: Jest framework with TypeScript for Lambda function testing
- **Mock Data Strategy**: Use actual API response structures from `ai/brainstorm/models/alphavantage/` and `ai/brainstorm/models/alpaca/`
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
- **Monitoring**: Production monitoring with AlphaVantage rate limit tracking via CloudWatch metrics
- **Troubleshooting**: Operational procedures for diagnosing and resolving data collection issues
- **Capacity Planning**: Resource sizing for Lambda functions and DynamoDB tables
- **Cost Optimization**: Strategies for managing AWS costs and AlphaVantage API usage

## Implementation References

### Core Lambda Functions Context
1. **SyncAssets** - Daily asset synchronization from Alpaca API
2. **SyncEarningsCalendar** - Daily earnings calendar synchronization from AlphaVantage
3. **TriggerEarningsPollenation** - Daily trigger for earnings-based data collection (6:00 AM)
4. **TriggerRegularPollenation** - Daily trigger for age-based data refresh using volume + staleness criteria (7:00 AM)
5. **SyncNewsSentiment** - Hourly news sentiment collection
6. **PollenateAsset** - Event-driven comprehensive financial data collection (handles pollenationNeeded from both triggers)
7. **MarkEarningsProcessed** - Event-driven earnings processing status updates

### Data Storage Context
- **assets**: symbol (PK), lastPollenationDate (SK) with GSI for status-based queries and volume-based prioritization
- **earningsCalendar**: asset_symbol (PK), earnings_date (SK) with upcoming-earnings-index for date-based queries
- **newsSentiment**: news_id (PK), time_published (SK) with asset-news-index and sentiment-score-index
- **foundationalData**: All tables use symbol (PK), fiscal_date_ending/last_updated (SK) pattern for temporal queries
- **Data Retention**: Indefinite retention across all tables for comprehensive historical analysis

### Integration Context
- **Full API Access**: AlphaVantage premium access without rate limit constraints
- **Asset Filtering**: Focus on active tradable assets from Alpaca catalog
- **News Filtering**: Asset-specific news filtering based on ticker mentions
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

**Document Status**: Updated for data collection system focus
**Scope**: Data ingestion, processing, and storage context only
**Usage**: Reference during implementation phase for technical context and patterns
**Maintenance**: Update as new context requirements are identified during development

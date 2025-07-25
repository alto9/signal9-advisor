# Technical Requirements Document - Signal9 Data Collection System

## System Architecture Overview

**Infrastructure**: AWS serverless architecture focused on data collection and storage
- **Runtime**: Node.js v22 Lambda functions
- **Deployment**: AWS CDK with TypeScript for infrastructure as code
- **Authentication**: Not required (internal data collection system)
- **API Gateway**: Not required (no external API exposure)
- **Database**: DynamoDB for all data storage with auto-scaling
- **Event Processing**: EventBridge for scheduled triggers and event-driven workflows
- **Monitoring**: CloudWatch for metrics, logging, and alerting
- **Storage**: DynamoDB primary storage with automated backups

## Lambda Function Configurations

### **Recommended Function Sizing**
- **SyncAssets**: 512MB memory, 5 min timeout (handles large asset lists from Alpaca)
- **SyncEarningsCalendar**: 256MB memory, 3 min timeout (processes earnings calendar data)
- **TriggerEarningsPollenation**: 128MB memory, 1 min timeout (lightweight event dispatcher)
- **TriggerRegularPollenation**: 256MB memory, 2 min timeout (asset query and prioritization)
- **SyncNewsSentiment**: 512MB memory, 5 min timeout (processes large news datasets)
- **PollenateAsset**: 1024MB memory, 10 min timeout (comprehensive data collection from multiple APIs + **bulk upsert of complete historical datasets**)
- **MarkEarningsProcessed**: 128MB memory, 30 sec timeout (simple status update)

### **Error Handling and Retry Strategy**
- **Exponential Backoff**: Base delay 1-2 seconds, max delay 30 seconds
- **Max Retries**: 3 attempts for API calls, 2 attempts for Lambda executions
- **Dead Letter Queues**: Failed executions after max retries go to SQS DLQ
- **Circuit Breaker**: Stop processing if error rate >20% over 5 minutes
- **Timeout Handling**: Graceful shutdown with partial success tracking
- **Data Validation Failures**: Log and continue processing (soft failures)

## Core Components

### **Asset Synchronization Service**
- **Purpose**: Daily synchronization of tradable assets from Alpaca API
- **Trigger**: EventBridge cron rule - Daily at 4:00 AM (`0 4 * * ? *`)
- **Lambda Function**: `SyncAssets`
- **Dependencies**: Alpaca API, assets DynamoDB table, CloudWatch
- **Process Flow**:
  1. Query Alpaca `/v2/assets?status=active` endpoint
  2. Validate asset data (symbol format, required fields)
  3. Upsert asset records in assets table
  4. Update lastSyncTimestamp for tracking
  5. Emit CloudWatch metrics for success/failure rates

### **Earnings Calendar Service**
- **Purpose**: Daily synchronization of earnings calendar from AlphaVantage API
- **Trigger**: EventBridge cron rule - Daily at 5:00 AM (`0 5 * * ? *`)
- **Lambda Function**: `SyncEarningsCalendar`
- **Dependencies**: AlphaVantage EARNINGS_CALENDAR API, earningsCalendar DynamoDB table, CloudWatch
- **Process Flow**:
  1. Query AlphaVantage EARNINGS_CALENDAR endpoint
  2. Validate earnings data (dates, symbols, estimates)
  3. Upsert earnings records in earningsCalendar table
  4. Update lastSyncTimestamp for tracking
  5. Emit CloudWatch metrics for data quality and processing

### **Earnings-Triggered Pollination Service**
- **Purpose**: Trigger data collection for assets with recent earnings releases
- **Trigger**: EventBridge cron rule - Daily at 6:00 AM (`0 6 * * ? *`)
- **Lambda Function**: `TriggerEarningsPollenation`
- **Dependencies**: earningsCalendar DynamoDB table, EventBridge for event dispatch
- **Process Flow**:
  1. Query earningsCalendar for assets with earnings in past 24 hours
  2. For each qualifying asset, dispatch `pollenationNeeded` event
  3. For each qualifying asset, dispatch `earningsProcessed` event
  4. Emit CloudWatch metrics for event dispatch success

### **Regular Pollination Service**
- **Purpose**: Trigger data collection for high-volume assets with stale data based on age and trading activity
- **Trigger**: EventBridge cron rule - Daily at 7:00 AM (`0 7 * * ? *`)
- **Lambda Function**: `TriggerRegularPollenation`
- **Dependencies**: assets DynamoDB table, EventBridge for event dispatch
- **Process Flow**:
  1. Query assets for assets with **highest volume + oldest lastPollenationDate**
  2. Apply priority scoring based on trading volume and data staleness
  3. Select top assets that need data refresh (e.g., data older than 7 days for high-volume stocks)
  4. For each qualifying asset, dispatch `pollenationNeeded` event with priority metadata
  5. Emit CloudWatch metrics for asset selection and event dispatch success

### **News Sentiment Collection Service**
- **Purpose**: Hourly collection of news sentiment data from AlphaVantage
- **Trigger**: EventBridge cron rule - Hourly (`0 * * * ? *`)
- **Lambda Function**: `SyncNewsSentiment`
- **Dependencies**: AlphaVantage NEWS_SENTIMENT API, assets table, newsSentiment table, CloudWatch
- **Process Flow**:
  1. Calculate 2-hour date range for news collection
  2. Query AlphaVantage NEWS_SENTIMENT endpoint
  3. Extract ticker symbols from response ticker_sentiment arrays
  4. Query assets to validate tickers against active assets
  5. Filter news articles to only those mentioning tracked assets
  6. Store filtered news with asset associations in newsSentiment table
  7. Update sync timestamp and emit CloudWatch metrics

### **Asset Data Collection Service (Event-Driven)**
- **Purpose**: Comprehensive financial data collection for individual assets
- **Trigger**: Event-driven via `pollenationNeeded` events (from both earnings-triggered and regular pollination)
- **Lambda Function**: `PollenateAsset`
- **Dependencies**: AlphaVantage APIs (multiple endpoints), foundational data DynamoDB tables, CloudWatch
- **Process Flow**:
  1. Receive `pollenationNeeded` event with asset symbol and trigger source (earnings vs. regular)
  2. Sequential API calls to AlphaVantage endpoints (**each returns complete historical datasets**):
     - COMPANY_OVERVIEW: Basic company information and financial ratios
     - EARNINGS: **Complete historical earnings** (annual + quarterly, typically 10+ years of data)
     - CASH_FLOW: **Complete cash flow history** (annual + quarterly statements)
     - BALANCE_SHEET: **Complete balance sheet history** (annual + quarterly statements)
     - INCOME_STATEMENT: **Complete income statement history** (annual + quarterly statements)
     - EARNINGS_CALL_SCRIPTS: Management commentary and guidance
  3. **Bulk Data Processing**: Process complete historical datasets (typically 20-50 records per financial statement type)
  4. Validate all incoming financial data with enhanced validation for earnings-triggered assets
  5. **Bulk Upsert Operations**: Upsert ALL records from each API response (both new and existing data for accuracy)
  6. Use DynamoDB batch writes for efficient processing of large historical datasets
  7. Update lastPollenationDate timestamp in assets table
  8. Emit CloudWatch metrics for processing success/failure with trigger source context

### **Earnings Processing Service (Event-Driven)**
- **Purpose**: Mark earnings as processed to prevent duplicate processing
- **Trigger**: Event-driven via `earningsProcessed` events
- **Lambda Function**: `MarkEarningsProcessed`
- **Dependencies**: earningsCalendar DynamoDB table
- **Process Flow**:
  1. Receive `earningsProcessed` event with asset symbol and earnings date
  2. Update earningsCalendar table to mark earnings as processed
  3. Prevent duplicate processing of same earnings release

## Data Architecture

### **DynamoDB Tables**

#### **assets Table**
- **Primary Key**: symbol (String) - optimal for our primary access pattern
- **Sort Key**: lastPollenationDate (String) - enables efficient queries for regular pollination
- **Attributes**: company_name, sector, industry, market_cap, volume, status, lastSyncTimestamp, created_at, updated_at
- **GSI 1**: status-lastPollenationDate-index (status PK, lastPollenationDate SK) for active asset queries with age sorting
- **GSI 2**: sector-volume-index (sector PK, volume SK) for sector-based prioritization
- **Purpose**: Store tradable asset information with optimized access for pollination triggers
- **Access Patterns**: 
  - Get asset by symbol (primary key)
  - Find high-volume assets with oldest pollination dates (GSI 1)
  - Query active assets for processing (GSI 1)

#### **earningsCalendar Table**
- **Primary Key**: asset_symbol (String)
- **Sort Key**: earnings_date (String)
- **Attributes**: report_time, estimated_eps, actual_eps, surprise, surprise_percentage, is_processed, created_at, updated_at
- **GSI**: earnings_date-index for querying upcoming earnings
- **Purpose**: Store earnings calendar information and processing status

#### **newsSentiment Table**
- **Primary Key**: news_id (String) - unique identifier from AlphaVantage
- **Sort Key**: time_published (String) - enables time-based queries
- **Attributes**: asset_symbol, title, url, summary, overall_sentiment_score, relevance_score, source, ticker_sentiment (List)
- **GSI 1**: asset-news-index (asset_symbol PK, time_published SK) for asset-specific news queries
- **GSI 2**: sentiment-score-index (overall_sentiment_score PK, time_published SK) for sentiment analysis
- **Purpose**: Store filtered news sentiment data with asset associations
- **Data Retention**: Indefinite retention for historical sentiment analysis

#### **foundationalData Tables**
- **companyOverview**: symbol (PK), last_updated (SK) for company fundamental data and financial ratios
- **earnings**: symbol (PK), fiscal_date_ending (SK) for historical and estimated earnings data
- **cashFlow**: symbol (PK), fiscal_date_ending (SK) for cash flow statements (annual and quarterly)
- **balanceSheet**: symbol (PK), fiscal_date_ending (SK) for balance sheet data (annual and quarterly)
- **incomeStatement**: symbol (PK), fiscal_date_ending (SK) for income statement data (annual and quarterly)
- **Common Access Pattern**: Query by symbol for latest data, sort by date for historical analysis
- **Data Retention**: Indefinite retention for comprehensive historical analysis
- **Write Pattern**: **Bulk upsert operations** during pollination (20-50 records per asset per table)
- **Upsert Strategy**: Each pollination **re-upserts complete historical datasets** from AlphaVantage (all years of data)

### **Data Validation Strategy**
- **Asset Data**: Symbol format validation, required field completeness, status validation
- **Earnings Data**: Date format validation, numeric range validation for EPS, symbol matching against assets
- **Financial Data**: Numeric range validation, date consistency, data completeness checks
- **News Data**: Sentiment score range validation (0-1), relevance score validation, asset association validation

## External API Integration

### **Alpaca API Integration**
- **Endpoint**: `/v2/assets?status=active`
- **Purpose**: Retrieve active tradable assets
- **Rate Limits**: 200 requests per minute
- **Authentication**: API key and secret stored in AWS Secrets Manager
- **Error Handling**: Exponential backoff (1s, 2s, 4s), max 3 retries, circuit breaker pattern

### **AlphaVantage API Integration**
- **Full API Access**: No rate limit constraints with premium API access
- **Rate Limit Monitoring**: Track rate limit headers with custom CloudWatch metrics
- **Endpoints Used**:
  - EARNINGS_CALENDAR: Upcoming earnings dates and estimates
  - COMPANY_OVERVIEW: Company fundamentals and financial ratios
  - EARNINGS: Historical earnings data
  - CASH_FLOW: Cash flow statements
  - BALANCE_SHEET: Balance sheet data
  - INCOME_STATEMENT: Income statement data
  - NEWS_SENTIMENT: News sentiment analysis
- **Authentication**: API key stored in AWS Secrets Manager
- **Error Handling**: Exponential backoff (2s, 4s, 8s), max 3 retries, data validation
- **Rate Limit Metrics**: 
  - `AlphaVantageRateLimit` (remaining calls per minute)
  - `AlphaVantageRateLimitReset` (seconds until rate limit reset)
  - `AlphaVantageAPICallsUsed` (calls used in current period)

## Event Architecture

### **EventBridge Rules (Scheduled)**
- **AssetSyncRule**: `0 4 * * 1-6 *` (Daily at 4:00 AM, Monday-Saturday)
- **EarningsCalendarSyncRule**: `0 5 * * 1-6 *` (Daily at 5:00 AM, Monday-Saturday)
- **EarningsPollenationRule**: `0 6 * * 1-6 *` (Daily at 6:00 AM, Monday-Saturday)
- **RegularPollenationRule**: `0 7 * * 1-6 *` (Daily at 7:00 AM, Monday-Saturday)
- **NewsSentimentSyncRule**: `0 * * * 1-6 *` (Hourly, Monday-Saturday)

**Maintenance Window**: Sunday (no scheduled jobs run) for system maintenance

### **Custom Events**
- **pollenationNeeded**: Triggers comprehensive data collection for specific asset
- **earningsProcessed**: Marks earnings as processed to prevent duplicates

## Monitoring and Observability

### **CloudWatch Metrics**
- **Data Collection Metrics**:
  - `AssetSyncSuccess` / `AssetSyncFailure` (Count)
  - `EarningsCalendarSyncSuccess` / `EarningsCalendarSyncFailure` (Count)
  - `NewsSentimentSyncSuccess` / `NewsSentimentSyncFailure` (Count)
  - `PollenationSuccess` / `PollenationFailure` (Count)
  - `AssetsProcessed` / `AssetsFailed` (Count)

- **API Performance Metrics**:
  - `AlpacaAPILatency` (Histogram)
  - `AlphaVantageAPILatency` (Histogram)
  - `APIErrorRate` (Percentage)

- **Data Quality Metrics**:
  - `ValidationSuccess` / `ValidationFailure` (Count)
  - `DataCompleteness` (Percentage)
  - `DataFreshness` (Age in hours)

### **CloudWatch Alarms**
- Processing failure rate > 5%
- API error rate > 3%
- Data validation failure rate > 10%
- Asset sync completion time > 10 minutes
- Earnings sync completion time > 15 minutes

### **Logging Strategy**
- **Structured Logging**: JSON format with correlation IDs
- **Log Levels**: ERROR, WARN, INFO, DEBUG
- **Retention**: 30 days for application logs
- **Analysis**: CloudWatch Logs Insights for troubleshooting

## Security and Secrets Management

### **AWS Secrets Manager**
- **AlpacaCredentials**: API key and secret for Alpaca integration
- **AlphaVantageCredentials**: API key for AlphaVantage integration
- **Access Pattern**: Lambda functions retrieve credentials at runtime
- **Rotation**: No automated rotation planned initially (manual rotation as needed)

### **IAM Roles and Policies**
- **Lambda Execution Roles**: Minimal permissions for DynamoDB access, Secrets Manager access, CloudWatch logging
- **EventBridge Permissions**: Lambda invocation permissions for scheduled triggers
- **Network Security**: Lambda functions in VPC not required (public APIs only)
- **Manual Operations**: Only engineers with AWS access can trigger manual data collection

## Deployment Architecture

### **AWS CDK Infrastructure**
- **CDK App**: TypeScript-based infrastructure definition
- **Stacks**: 
  - DataCollectionStack: Lambda functions, DynamoDB tables, EventBridge rules
  - MonitoringStack: CloudWatch dashboards, alarms, SNS topics
  - SecretsStack: Secrets Manager resources and IAM policies

### **CI/CD Pipeline**
- **GitHub Actions**: Automated testing and deployment using CDK CLI
- **Environments**: Development, Staging, Production
- **Deployment Strategy**: Tag-based deployments for production releases
- **Rollback Procedure**: Re-deploy previous tag using GitHub Actions workflow
- **Testing**: Unit tests for Lambda functions (integration tests deferred)

### **Production Deployment Process**
1. **Development**: Push changes to feature branch
2. **Testing**: GitHub Actions runs unit tests and CDK diff
3. **Staging**: Deploy to staging environment for validation
4. **Tagging**: Create Git tag for production release
5. **Production**: GitHub Actions deploys tagged version using CDK CLI
6. **Rollback**: If needed, re-deploy previous stable tag

## Scalability and Performance

### **Performance Targets**
- **Asset Sync**: Complete within 5 minutes
- **Earnings Sync**: Complete within 10 minutes
- **News Sync**: Complete within 2 minutes
- **Pollination Processing**: <30 seconds per asset
- **Event Processing**: <5 seconds from trigger to execution

### **Scaling Strategy**
- **Lambda Concurrency**: Reserved concurrency for critical functions
- **DynamoDB Scaling**: Auto-scaling for read/write capacity
- **EventBridge**: No scaling required (handles high event volumes)
- **API Rate Management**: Throttling and backoff for external APIs

## Error Handling and Recovery

### **Retry Logic**
- **Exponential Backoff**: For API calls and database operations
- **Dead Letter Queues**: For failed Lambda executions
- **Circuit Breaker**: For external API failures
- **Data Validation**: Skip invalid records, log warnings, continue processing

### **Recovery Procedures**
- **Failed Asset Sync**: Manual trigger available, auto-retry next day
- **Failed Earnings Sync**: Manual trigger available, affects earnings-triggered pollination
- **Failed Pollination**: Asset marked for retry, included in next regular pollination cycle
- **API Outages**: Graceful degradation, resume when API available
- **Data Recovery**: **Complete historical datasets** from AlphaVantage rebuild automatically through regular pollination (each call retrieves full multi-year history)
- **API Contract Changes**: Reactive adjustment when vendors communicate changes (no contingency plan)
- **Partial Data Loss**: Each pollination event **re-upserts complete historical datasets**, ensuring data integrity and filling any gaps

### **Operational Procedures**
- **Manual Data Collection**: Engineers with AWS access can manually trigger Lambda functions
- **System Maintenance**: Sunday maintenance window (all scheduled jobs disabled)
- **API Health Monitoring**: Not implemented initially (deferred to future integration testing)
- **Deployment Rollback**: Re-deploy previous Git tag via GitHub Actions workflow

---

**Document Status**: Focused on data collection system only
**Architecture**: Event-driven serverless data collection pipeline
**Scope**: No user-facing components, pure data collection and storage
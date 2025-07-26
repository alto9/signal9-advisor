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
- **SyncTickers**: 512MB memory, 5 min timeout (handles large ticker lists from Polygon.io)
- **SyncEarningsCalendar**: 256MB memory, 3 min timeout (processes earnings calendar data from AlphaVantage)
- **TriggerEarningsPollenation**: 128MB memory, 1 min timeout (lightweight event dispatcher)
- **TriggerRegularPollenation**: 256MB memory, 2 min timeout (ticker query and prioritization)
- **SyncNews**: 512MB memory, 5 min timeout (processes large news datasets)
- **PollenateTicker**: 1024MB memory, 10 min timeout (comprehensive data collection from Polygon.io + **bulk upsert of complete historical datasets**)
- **MarkEarningsProcessed**: 128MB memory, 30 sec timeout (simple status update)

### **Error Handling and Retry Strategy**
- **Exponential Backoff**: Base delay 1-2 seconds, max delay 30 seconds
- **Max Retries**: 3 attempts for API calls, 2 attempts for Lambda executions
- **Dead Letter Queues**: Failed executions after max retries go to SQS DLQ
- **Circuit Breaker**: Stop processing if error rate >20% over 5 minutes
- **Timeout Handling**: Graceful shutdown with partial success tracking
- **Data Validation Failures**: Log and continue processing (soft failures)

## Core Components

### **Ticker Synchronization Service**
- **Purpose**: Daily synchronization of tradable tickers from Polygon.io API
- **Trigger**: EventBridge cron rule - Daily at 4:00 AM (`0 4 * * ? *`)
- **Lambda Function**: `SyncTickers`
- **Dependencies**: Polygon.io Tickers API, tickers DynamoDB table, CloudWatch
- **Process Flow**:
  1. Query Polygon.io Tickers endpoint
  2. Validate ticker data (symbol format, required fields)
  3. Upsert ticker records in tickers table
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
- **Purpose**: Trigger data collection for tickers with recent earnings releases
- **Trigger**: EventBridge cron rule - Daily at 6:00 AM (`0 6 * * ? *`)
- **Lambda Function**: `TriggerEarningsPollenation`
- **Dependencies**: earningsCalendar DynamoDB table, EventBridge for event dispatch
- **Process Flow**:
  1. Query earningsCalendar for tickers with earnings in past 24 hours
  2. For each qualifying ticker, dispatch `pollenationNeeded` event
  3. For each qualifying ticker, dispatch `earningsProcessed` event
  4. Emit CloudWatch metrics for event dispatch success

### **Regular Pollination Service**
- **Purpose**: Trigger data collection for high-volume tickers with stale data based on age and trading activity
- **Trigger**: EventBridge cron rule - Daily at 7:00 AM (`0 7 * * ? *`)
- **Lambda Function**: `TriggerRegularPollenation`
- **Dependencies**: tickers DynamoDB table, EventBridge for event dispatch
- **Process Flow**:
  1. Query tickers for tickers with **highest volume + oldest lastPollenationDate**
  2. Apply priority scoring based on trading volume and data staleness
  3. Select top tickers that need data refresh (e.g., data older than 7 days for high-volume stocks)
  4. For each qualifying ticker, dispatch `pollenationNeeded` event with priority metadata
  5. Emit CloudWatch metrics for ticker selection and event dispatch success

### **News Collection Service**
- **Purpose**: Hourly collection of news data from Polygon.io
- **Trigger**: EventBridge cron rule - Hourly (`0 * * * ? *`)
- **Lambda Function**: `SyncNews`
- **Dependencies**: Polygon.io News API, tickers table, news table, CloudWatch
- **Process Flow**:
  1. Calculate 2-hour date range for news collection
  2. Query Polygon.io News endpoint
  3. Extract ticker symbols from response
  4. Query tickers to validate symbols against active tickers
  5. Filter news articles to only those mentioning tracked tickers
  6. Store filtered news with ticker associations in news table
  7. Update sync timestamp and emit CloudWatch metrics

### **Ticker Data Collection Service (Event-Driven)**
- **Purpose**: Comprehensive financial data collection for individual tickers
- **Trigger**: Event-driven via `pollenationNeeded` events (from both earnings-triggered and regular pollination)
- **Lambda Function**: `PollenateTicker`
- **Dependencies**: Polygon.io APIs (multiple endpoints), foundational data DynamoDB tables, CloudWatch
- **Process Flow**:
  1. Receive `pollenationNeeded` event with ticker symbol and trigger source (earnings vs. regular)
  2. Sequential API calls to Polygon.io endpoints (**each returns complete historical datasets**):
     - Ticker Overview: Basic company information and financial ratios
     - Quarterly Financials: **Complete quarterly financial history** (typically 10+ years of data)
     - Yearly Financials: **Complete yearly financial history** (typically 10+ years of data)
     - Related Tickers: Correlated securities and relationships
     - Splits: **Complete split history** (all historical splits)
     - Dividends: **Complete dividend history** (all historical dividends)
     - IPOs: Initial public offering data
  3. **Bulk Data Processing**: Process complete historical datasets (typically 20-50 records per financial data type)
  4. Validate all incoming financial data with enhanced validation for earnings-triggered tickers
  5. **Bulk Upsert Operations**: Upsert ALL records from each API response (both new and existing data for accuracy)
  6. Use DynamoDB batch writes for efficient processing of large historical datasets
  7. Update lastPollenationDate timestamp in tickers table
  8. Emit CloudWatch metrics for processing success/failure with trigger source context

### **Earnings Processing Service (Event-Driven)**
- **Purpose**: Mark earnings as processed to prevent duplicate processing
- **Trigger**: Event-driven via `earningsProcessed` events
- **Lambda Function**: `MarkEarningsProcessed`
- **Dependencies**: earningsCalendar DynamoDB table
- **Process Flow**:
  1. Receive `earningsProcessed` event with ticker symbol and earnings date
  2. Update earningsCalendar table to mark earnings as processed
  3. Prevent duplicate processing of same earnings release

## Data Architecture

### **DynamoDB Tables**

#### **tickers Table**
- **Primary Key**: symbol (String) - optimal for our primary access pattern
- **Sort Key**: lastPollenationDate (String) - enables efficient queries for regular pollination
- **Attributes**: company_name, sector, industry, market_cap, volume, status, lastSyncTimestamp, created_at, updated_at
- **GSI 1**: status-lastPollenationDate-index (status PK, lastPollenationDate SK) for active ticker queries with age sorting
- **GSI 2**: sector-volume-index (sector PK, volume SK) for sector-based prioritization
- **Purpose**: Store tradable ticker information with optimized access for pollination triggers
- **Access Patterns**: 
  - Get ticker by symbol (primary key)
  - Find high-volume tickers with oldest pollination dates (GSI 1)
  - Query active tickers for processing (GSI 1)

#### **earningsCalendar Table**
- **Primary Key**: symbol (String) - from AlphaVantage CSV
- **Sort Key**: reportDate (String) - from AlphaVantage CSV
- **Attributes**: name, fiscalDateEnding, estimate, currency, is_processed, created_at, updated_at
- **GSI**: reportDate-index for querying upcoming earnings
- **Purpose**: Store current earnings calendar snapshot (refreshed daily)
- **CSV Mapping**: Direct mapping from AlphaVantage CSV response fields
- **Data Strategy**: Complete refresh daily - replace all records with current calendar data

#### **news Table**
- **Primary Key**: news_id (String) - unique identifier from Polygon.io
- **Sort Key**: time_published (String) - enables time-based queries
- **Attributes**: ticker_symbol, title, url, summary, source, sentiment_score, sentiment_label, ticker_sentiment (List)
- **GSI 1**: ticker-news-index (ticker_symbol PK, time_published SK) for ticker-specific news queries
- **GSI 2**: source-time-index (source PK, time_published SK) for source-based news queries
- **Purpose**: Store filtered news data with ticker associations
- **Data Retention**: Indefinite retention for historical news analysis

#### **foundationalData Tables**
- **tickerOverview**: symbol (PK), last_updated (SK) for ticker fundamental data and financial ratios
- **quarterlyFinancials**: symbol (PK), end_date (SK) for quarterly financial statements with comprehensive financial data
- **yearlyFinancials**: symbol (PK), end_date (SK) for yearly financial statements with comprehensive financial data
- **splits**: symbol (PK), execution_date (SK) for stock split data with split_from, split_to, and unique id
- **dividends**: symbol (PK), pay_date (SK) for dividend payment data with cash_amount, currency, declaration_date, dividend_type, ex_dividend_date, frequency, record_date, and unique id
- **ipos**: symbol (PK), listing_date (SK) for initial public offering data with issuer_name, currency_code, offer details (max_shares_offered, price_range, total_offer_size), primary_exchange, shares_outstanding, security_type, and ipo_status
- **relatedTickers**: symbol (PK), related_symbol (SK) for correlated securities with simple ticker-to-ticker relationship mapping
- **earningsCallTranscripts**: symbol (PK), quarter (SK) for earnings call transcripts with speaker sentiment
- **Common Access Pattern**: Query by symbol for latest data, sort by date for historical analysis
- **Data Retention**: Indefinite retention for comprehensive historical analysis
- **Write Pattern**: **Bulk upsert operations** during pollination (20-50 records per ticker per table)
- **Upsert Strategy**: Each pollination **re-upserts complete historical datasets** from Polygon.io (all years of data)
- **Financial Data Structure**: Each financial record includes start_date, end_date, timeframe, fiscal_period, fiscal_year, and comprehensive financial metrics (income statement, balance sheet, cash flow statement, comprehensive income) with values, units, labels, and order fields

### **Data Validation Strategy**
- **Ticker Data**: Symbol format validation, required field completeness, status validation
- **Earnings Data**: Date format validation, numeric range validation for EPS, symbol matching against tickers
- **Financial Data**: Numeric range validation, date consistency, data completeness checks
- **News Data**: Source validation, ticker association validation, date consistency checks

## External API Integration

### **Polygon.io API Integration**
- **Access Level**: All US Stocks Tickers, Unlimited API Calls, 5 Years Historical Data, 100% Market Coverage, 15-minute Delayed Data
- **Endpoints Used**:
  - Tickers: Complete list of tradable securities
  - Ticker Overview: Company fundamentals and financial ratios
  - Ticker Types: Classification of securities by type
  - Related Tickers: Correlated securities and relationships
  - Quarterly Financials: Complete quarterly financial statements
  - Yearly Financials: Complete annual financial statements
  - IPOs: Initial public offering data
  - Splits: Stock split information
  - Dividends: Dividend payment data
  - News: Market news with sentiment analysis
- **Authentication**: Bearer token stored in AWS Secrets Manager (`POLYGON_API_KEY`), required for all endpoints including logos
- **Rate Limits**: Unlimited API calls with 25 calls per minute rate limit, exponential backoff and retry logic
- **Data Coverage**: 100% US market coverage with 5 years of historical data
- **Data Freshness**: 15-minute delayed data for all US stocks
- **Error Handling**: Exponential backoff (2s, 4s, 8s), max 3 retries, data validation
- **API Wrapper**: Internal wrapper class to avoid REST calls scattered throughout code
- **Standard HTTP Status Codes**: 300s for redirects, 400s for client issues, 500s for server issues
- **Rate Limit Metrics**: 
  - `PolygonRateLimit` (remaining calls per minute)
  - `PolygonRateLimitReset` (seconds until rate limit reset)
  - `PolygonAPICallsUsed` (calls used in current period)
- **Pagination**: Many endpoints return paged results with `next_url` parameter and `count` field

### **AlphaVantage API Integration**
- **EARNINGS_CALENDAR Endpoint**: For earnings detection and calendar management
  - **URL Format**: `{{ALPHA_VANTAGE_API_HOST}}/query?function=EARNINGS_CALENDAR&apikey={{ALPHA_VANTAGE_API_KEY}}`
  - **Response Format**: CSV with headers: symbol,name,reportDate,fiscalDateEnding,estimate,currency
  - **Purpose**: Retrieve upcoming earnings dates, estimates, and actuals
  - **Rate Limits**: Single daily call (very safe, no rate limiting concerns)
- **EARNINGS_CALL_TRANSCRIPT Endpoint**: For earnings call transcripts with sentiment analysis
  - **URL Format**: `{{ALPHA_VANTAGE_API_HOST}}/query?function=EARNINGS_CALL_TRANSCRIPT&symbol={{TICKER}}&quarter={{QUARTER}}&apikey={{ALPHA_VANTAGE_API_KEY}}`
  - **Response Format**: JSON with symbol, quarter, and transcript array (speaker, title, content, sentiment)
  - **Purpose**: Retrieve most recent earnings call transcript with speaker sentiment analysis
  - **Rate Limits**: One call per ticker per pollenation (very safe, no rate limiting concerns)
- **Authentication**: API key stored in AWS Secrets Manager (`ALPHA_VANTAGE_API_KEY`) as query parameter for both endpoints
- **Error Handling**: Exponential backoff (1s, 2s, 4s), max 3 retries, circuit breaker pattern
- **Rate Limit Metrics**: Not required (low call volume)

## Event Architecture

### **EventBridge Rules (Scheduled)**
- **TickerSyncRule**: `0 4 * * 1-6 *` (Daily at 4:00 AM, Monday-Saturday)
- **EarningsPollenationRule**: `0 5 * * 1-6 *` (Daily at 5:00 AM, Monday-Saturday)
- **EarningsCalendarSyncRule**: `0 6 * * 1-6 *` (Daily at 6:00 AM, Monday-Saturday)
- **RegularPollenationRule**: `0 7 * * 1-6 *` (Daily at 7:00 AM, Monday-Saturday)
- **NewsSyncRule**: `0 * * * 1-6 *` (Hourly, Monday-Saturday)

**Maintenance Window**: Sunday (no scheduled jobs run) for system maintenance

### **Custom Events**
- **pollenationNeeded**: Triggers comprehensive data collection for specific ticker
- **earningsProcessed**: Marks earnings as processed to prevent duplicates

## Monitoring and Observability

### **Signal9 Ingestion Dashboard**
- **Dashboard Components**:
  - **Ingestion Function Metrics Widgets**:
    - Success/failure rates for all 7 Lambda functions
    - Processing times and throughput metrics
    - Function invocation counts and error rates
  - **Data Processing Volume Widgets**:
    - Records processed per function (tickers, earnings, news, financial data)
    - Data size metrics (MB/GB processed)
    - Processing efficiency (records per second)
  - **Error Tracking Widgets**:
    - Real-time error rates by function and error type
    - API failure tracking (Polygon.io, AlphaVantage)
    - Validation error monitoring
    - System error alerts and trends
  - **Cost Monitoring Widgets**:
    - Estimated monthly costs for Lambda functions
    - DynamoDB read/write capacity costs
    - EventBridge and CloudWatch costs
    - Total estimated monthly AWS spend
  - **System Health Indicators**:
    - Real-time status of all system components
    - Data freshness indicators (last sync times)
    - API health status (Polygon.io, AlphaVantage)
    - Overall system health score

### **CloudWatch Metrics**
- **Data Collection Metrics**:
  - `TickerSyncSuccess` / `TickerSyncFailure` (Count)
  - `EarningsCalendarSyncSuccess` / `EarningsCalendarSyncFailure` (Count)
  - `NewsSyncSuccess` / `NewsSyncFailure` (Count)
  - `PollenationSuccess` / `PollenationFailure` (Count)
  - `TickersProcessed` / `TickersFailed` (Count)

- **API Performance Metrics**:
  - `PolygonAPILatency` (Histogram)
  - `APIErrorRate` (Percentage)

- **Data Quality Metrics**:
  - `ValidationSuccess` / `ValidationFailure` (Count)
  - `DataCompleteness` (Percentage)
  - `DataFreshness` (Age in hours)

- **Cost Metrics**:
  - `LambdaCost` (Estimated monthly cost)
  - `DynamoDBCost` (Estimated monthly cost)
  - `EventBridgeCost` (Estimated monthly cost)
  - `TotalEstimatedCost` (Monthly AWS spend)

### **CloudWatch Alarms**
- Processing failure rate > 5%
- API error rate > 3%
- Data validation failure rate > 10%
- Ticker sync completion time > 15 minutes (accounts for pagination processing)
- Earnings sync completion time > 15 minutes

### **Logging Strategy**
- **Structured Logging**: JSON format with correlation IDs
- **Log Levels**: ERROR, WARN, INFO, DEBUG
- **Retention**: 30 days for application logs
- **Analysis**: CloudWatch Logs Insights for troubleshooting

## Security and Secrets Management

### **AWS Secrets Manager**
- **Signal9APICredentials**: Single secret containing all API credentials
  - `POLYGON_API_HOST`: Polygon.io API host URL
  - `POLYGON_API_KEY`: Bearer token for Polygon.io authentication
  - `ALPHA_VANTAGE_API_HOST`: AlphaVantage API host URL
  - `ALPHA_VANTAGE_API_KEY`: API key for AlphaVantage authentication
- **Access Pattern**: Lambda functions retrieve the single secret at runtime
- **Authentication Methods**:
  - Polygon.io: Bearer token in Authorization header
  - AlphaVantage: API key as query parameter in URLs
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
- **Ticker Sync**: Complete within 5 minutes
- **Earnings Sync**: Complete within 10 minutes
- **News Sync**: Complete within 2 minutes
- **Pollination Processing**: <30 seconds per ticker
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
- **Failed Ticker Sync**: Manual trigger available, auto-retry next day
- **Failed Earnings Sync**: Manual trigger available, affects earnings-triggered pollination
- **Failed Pollination**: Ticker marked for retry, included in next regular pollination cycle
- **API Outages**: Graceful degradation, resume when API available
- **Data Recovery**: **Complete historical datasets** from Polygon.io rebuild automatically through regular pollination (each call retrieves full multi-year history)
- **API Contract Changes**: Reactive adjustment when vendors communicate changes (no contingency plan)
- **Partial Data Loss**: Each pollination event **re-upserts complete historical datasets**, ensuring data integrity and filling any gaps

### **Operational Procedures**
- **Manual Data Collection**: Engineers with AWS access can manually trigger Lambda functions
- **System Maintenance**: Sunday maintenance window (all scheduled jobs disabled)
- **API Health Monitoring**: Not implemented initially (deferred to future integration testing)
- **Deployment Rollback**: Re-deploy previous Git tag via GitHub Actions workflow

---

**Document Status**: Updated for hybrid Polygon.io + AlphaVantage approach
**Architecture**: Event-driven serverless data collection pipeline
**Scope**: No user-facing components, pure data collection and storage
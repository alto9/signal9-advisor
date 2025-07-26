# Signal9 Advisor - Data Collection System

## Product Overview

**Vision**: Signal9 Advisor Data Collection System is the foundational data layer for future investment analysis applications. The system focuses exclusively on collecting, storing, and maintaining high-quality financial data from external APIs to build a comprehensive database of stocks, earnings, and market sentiment information. This system serves as the data foundation that will enable future analytical and user-facing applications.

**Primary Function**: Automated data collection and storage system that:
- Synchronizes tradable stock tickers from Polygon.io API
- Maintains an up-to-date earnings calendar from AlphaVantage API
- Collects comprehensive fundamental financial data through event-driven processing
- Gathers hourly news data for market analysis
- Ensures data quality and consistency through validation and monitoring

**Target Users**: 
- **Primary**: Development teams building investment analysis applications on top of this data layer
- **Secondary**: Data analysts and researchers who need access to clean, structured financial data
- **Future**: End-user applications that will consume this data for investment recommendations

## Core System Components

### **Ticker Management System**
- **Daily Ticker Synchronization (4:00 AM)**: Automated sync with Polygon.io API to maintain current list of tradable stocks
- **Ticker Database**: DynamoDB table storing stock symbols, company names, sectors, and sync timestamps
- **Data Validation**: Ensures ticker data quality and completeness
- **Change Tracking**: Monitors additions, updates, and deactivations of tradable tickers

### **Earnings Calendar System**
- **Daily Earnings Sync (5:00 AM)**: Automated sync with AlphaVantage EARNINGS_CALENDAR endpoint
- **Earnings Database**: DynamoDB table storing upcoming and historical earnings dates, estimates, and actuals
- **Earnings Event Processing**: Tracks when earnings are released to trigger data collection
- **Data Validation**: Validates earnings dates, estimates, and ensures symbol matching with ticker database

### **Event-Driven Data Collection Pipeline**
- **Earnings-Triggered Collection (6:00 AM)**: Automatically collects fresh data for stocks that released earnings in the past 24 hours
- **Regular Data Collection (7:00 AM)**: Identifies high-volume tickers with oldest data (based on lastPollenationDate) and triggers comprehensive data refresh
- **Dual Pollination Strategy**: Two distinct triggers ensure both event-driven (earnings) and time-based (staleness) data collection
- **pollenationNeeded Events**: Event-driven system that triggers comprehensive data collection for individual tickers from Polygon.io
- **Foundational Data Storage**: Stores complete financial dataset including:
  - Ticker Overview (market cap, sector, financial ratios)
  - Quarterly Financials (comprehensive quarterly financial statements)
  - Yearly Financials (comprehensive annual financial statements)
  - Earnings Data (historical and estimated earnings per share)
  - Corporate Actions (splits, dividends, IPOs)
  - Related Tickers (correlated securities)

### **News Collection System**
- **Hourly News Sync**: Automated collection of news data from Polygon.io
- **Ticker-Linked News**: News articles filtered and linked to relevant stock symbols
- **News Analysis Storage**: Structured storage of news data with sentiment analysis and market impact information
- **Real-time Market Intelligence**: Up-to-date news data with sentiment analysis for market intelligence

### **Data Quality and Monitoring System**
- **Validation Pipeline**: Comprehensive data validation for all incoming financial data
- **Error Handling**: Robust error handling with retry logic and dead letter queues
- **Signal9 Ingestion Dashboard**: Comprehensive CloudWatch dashboard for system health monitoring including:
  - Ingestion function call metrics (success/failure rates, processing times)
  - Data processing volume metrics (records processed, data size)
  - Error tracking and alerting (API failures, validation errors, system errors)
  - Estimated monthly costs for all AWS resources
  - Real-time system health indicators
- **Data Freshness Tracking**: Monitoring of data age and update frequencies
- **API Rate Management**: Efficient management of external API calls and rate limits

## Technical Architecture

### **Event-Driven Processing Pipeline**
```
Monday-Saturday Operations:
4:00 AM: Ticker Sync (Polygon.io API) → tickers Table
5:00 AM: Earnings-Triggered Pollination → pollenationNeeded Events → Data Collection
6:00 AM: Earnings Calendar Sync (AlphaVantage API) → earningsCalendar Table
7:00 AM: Regular Pollination → pollenationNeeded Events → Data Collection
Hourly: News Sync → news Table
Event-Driven: pollenationNeeded → Comprehensive Financial Data Collection

Sunday: Maintenance Window (no scheduled data collection)
```

### **Data Storage Strategy**
- **Primary Storage**: DynamoDB for structured financial data with fast access patterns
- **Data Tables**:
  - `tickers`: Stock symbols, company info, sync timestamps
  - `earningsCalendar`: Current earnings calendar snapshot (refreshed daily)
  - `news`: News articles, ticker associations, market impact data
  - `foundationalData`: Complete financial datasets (overview, financials, corporate actions)
- **Backup Strategy**: Automated DynamoDB backups with point-in-time recovery
- **Data Retention**: Configurable retention policies for different data types

### **External API Integration**
- **Polygon.io API**: Multiple endpoints for comprehensive financial data:
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
- **AlphaVantage API**: EARNINGS_CALENDAR endpoint for earnings detection and calendar management
- **API Management**: Full API access with optimized rate management and caching

### **Monitoring and Observability**
- **Signal9 Ingestion Dashboard**: Comprehensive CloudWatch dashboard providing:
  - **Ingestion Function Metrics**: Success/failure rates, processing times, and throughput for all Lambda functions
  - **Data Processing Volume**: Records processed per function, data size metrics, and processing efficiency
  - **Error Tracking**: Real-time error rates, API failure tracking, validation error monitoring, and system error alerts
  - **Cost Monitoring**: Estimated monthly costs for Lambda, DynamoDB, EventBridge, and other AWS resources
  - **System Health Indicators**: Real-time status of all system components, data freshness, and API health
- **CloudWatch Metrics**: Custom metrics for data collection success rates, processing times, and error rates
- **Alerting System**: Automated alerts for system failures, data quality issues, and API problems
- **Logging**: Structured logging with correlation IDs for troubleshooting and auditing
- **Health Checks**: Continuous monitoring of system components and data freshness

## Data Collection Workflows

### **Ticker Synchronization Workflow**
1. **EventBridge Trigger**: Daily at 4:00 AM
2. **Lambda Execution**: SyncTickers function queries Polygon.io Tickers endpoint
3. **Data Processing**: Validates and upserts ticker records
4. **Status Updates**: Updates sync timestamps and emits metrics

### **Earnings Processing Workflow**
1. **Earnings Detection**: Daily at 5:00 AM, identifies recent earnings releases from current calendar
2. **Event Dispatch**: Triggers pollenationNeeded events for tickers with recent earnings
3. **Data Collection**: Comprehensive financial data collection for earnings-triggered tickers
4. **Calendar Sync**: Daily at 6:00 AM, completely refreshes earnings calendar from AlphaVantage (replaces all existing records)

### **Regular Data Refresh Workflow**
1. **Ticker Prioritization**: Daily at 7:00 AM, queries tickers table for tickers with highest volume + oldest lastPollenationDate
2. **Selection Criteria**: Prioritizes tickers based on trading volume and data age (e.g., high-volume stocks with data >7 days old)
3. **Event Dispatch**: Triggers pollenationNeeded events for selected high-priority tickers
4. **Data Collection**: Updates fundamental data for selected tickers, ensuring fresh data for actively traded securities

### **pollenationNeeded Event Processing**
1. **Event Receipt**: Lambda function receives pollenationNeeded event with ticker symbol
2. **Complete Dataset Retrieval**: Sequential calls to Polygon.io endpoints - **each returns complete historical datasets** (typically 10+ years)
3. **Bulk Data Processing**: Process complete historical datasets (20-50 records per financial data type)
4. **Data Validation**: Validates all incoming financial data
5. **Bulk Upsert Operations**: **Upserts ALL historical records** (both new and existing data for maximum accuracy)
6. **Monitoring**: Emits success/failure metrics and logs

**Key Architecture**: Each pollination re-processes complete historical datasets, ensuring data accuracy and automatic gap-filling.

### **News Collection Workflow**
1. **Hourly Trigger**: EventBridge triggers news collection every hour
2. **API Query**: Retrieves news data for the past 2 hours
3. **Ticker Matching**: Filters news to only include articles mentioning tracked tickers
4. **Storage**: Stores filtered news with ticker associations and market impact data

## Success Metrics

### **Data Quality Metrics**
- Data validation success rate: >95%
- API call success rate: >98%
- Data freshness: <24 hours for regular data, <4 hours for earnings-triggered data
- Error rate: <2% for all processing workflows

### **System Performance Metrics**
- Daily workflow completion: 100% within scheduled time windows (Monday-Saturday)
- Event processing latency: <30 seconds per pollenationNeeded event
- System uptime: >99% (6-day operational cycle)
- Data processing throughput: Unlimited with full API access
- Maintenance window: Sunday (no data collection operations)

### **Data Coverage Metrics**
- Active ticker coverage: 100% of Polygon.io-listed active tickers
- Earnings calendar coverage: All upcoming earnings for tracked tickers
- News coverage: All relevant news articles from Polygon.io
- Fundamental data completeness: >90% for all required data fields

## Future Expansion Foundation

This data collection system is designed to support future applications including:
- **Investment Analysis Engine**: Rule-based and AI-powered stock analysis
- **Portfolio Management System**: Personalized portfolio recommendations
- **User Interface Applications**: Web and mobile applications for investors
- **API Services**: RESTful APIs for third-party integrations
- **Analytics Platforms**: Business intelligence and reporting systems

The system architecture prioritizes:
- **Scalability**: Designed to handle increasing data volumes and API requests
- **Extensibility**: Easy addition of new data sources and collection workflows  
- **Reliability**: Robust error handling and data consistency measures
- **Maintainability**: Clean, modular architecture with comprehensive monitoring

---

**Document Status**: Updated for hybrid Polygon.io + AlphaVantage approach
**Scope**: Data collection and storage only - no user-facing features
**Next Phase**: Future applications will build upon this data foundation



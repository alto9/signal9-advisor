# Signal9 Advisor - Data Collection System

## Product Overview

**Vision**: Signal9 Advisor Data Collection System is the foundational data layer for future investment analysis applications. The system focuses exclusively on collecting, storing, and maintaining high-quality financial data from external APIs to build a comprehensive database of stocks, earnings, and market sentiment information. This system serves as the data foundation that will enable future analytical and user-facing applications.

**Primary Function**: Automated data collection and storage system that:
- Synchronizes tradable stock assets from Alpaca API
- Maintains an up-to-date earnings calendar from AlphaVantage API
- Collects comprehensive fundamental financial data through event-driven processing
- Gathers hourly news sentiment data for market analysis
- Ensures data quality and consistency through validation and monitoring

**Target Users**: 
- **Primary**: Development teams building investment analysis applications on top of this data layer
- **Secondary**: Data analysts and researchers who need access to clean, structured financial data
- **Future**: End-user applications that will consume this data for investment recommendations

## Core System Components

### **Asset Management System**
- **Daily Asset Synchronization (4:00 AM)**: Automated sync with Alpaca API to maintain current list of tradable stocks
- **Asset Database**: DynamoDB table storing stock symbols, company names, sectors, and sync timestamps
- **Data Validation**: Ensures asset data quality and completeness
- **Change Tracking**: Monitors additions, updates, and deactivations of tradable assets

### **Earnings Calendar System**
- **Daily Earnings Sync (5:00 AM)**: Automated sync with AlphaVantage EARNINGS_CALENDAR endpoint
- **Earnings Database**: DynamoDB table storing upcoming and historical earnings dates, estimates, and actuals
- **Earnings Event Processing**: Tracks when earnings are released to trigger data collection
- **Data Validation**: Validates earnings dates, estimates, and ensures symbol matching with asset database

### **Event-Driven Data Collection Pipeline**
- **Earnings-Triggered Collection (6:00 AM)**: Automatically collects fresh data for stocks that released earnings in the past 24 hours
- **Regular Data Collection (7:00 AM)**: Identifies high-volume assets with oldest data (based on lastPollenationDate) and triggers comprehensive data refresh
- **Dual Pollination Strategy**: Two distinct triggers ensure both event-driven (earnings) and time-based (staleness) data collection
- **pollenationNeeded Events**: Event-driven system that triggers comprehensive data collection for individual assets from both sources
- **Foundational Data Storage**: Stores complete financial dataset including:
  - Company Overview (market cap, sector, financial ratios)
  - Earnings Data (historical and estimated earnings per share)
  - Cash Flow Statements (operating, investing, and financing cash flows)
  - Balance Sheet Data (assets, liabilities, shareholder equity)
  - Income Statements (revenue, expenses, net income)
  - Earnings Call Scripts (management commentary and guidance)

### **News Sentiment Collection System**
- **Hourly News Sync**: Automated collection of news sentiment data from AlphaVantage
- **Asset-Linked News**: News articles filtered and linked to relevant stock symbols
- **Sentiment Analysis Storage**: Structured storage of news sentiment scores and market impact data
- **Real-time Market Intelligence**: Up-to-date news data for market sentiment analysis

### **Data Quality and Monitoring System**
- **Validation Pipeline**: Comprehensive data validation for all incoming financial data
- **Error Handling**: Robust error handling with retry logic and dead letter queues
- **Monitoring Dashboard**: CloudWatch metrics and alerts for system health
- **Data Freshness Tracking**: Monitoring of data age and update frequencies
- **API Rate Management**: Efficient management of external API calls and rate limits

## Technical Architecture

### **Event-Driven Processing Pipeline**
```
Monday-Saturday Operations:
4:00 AM: Asset Sync (Alpaca API) → assets Table
5:00 AM: Earnings Calendar Sync (AlphaVantage API) → earningsCalendar Table
6:00 AM: Earnings-Triggered Pollination → pollenationNeeded Events → Data Collection
7:00 AM: Regular Pollination → pollenationNeeded Events → Data Collection
Hourly: News Sentiment Sync → newsSentiment Table
Event-Driven: pollenationNeeded → Comprehensive Financial Data Collection

Sunday: Maintenance Window (no scheduled data collection)
```

### **Data Storage Strategy**
- **Primary Storage**: DynamoDB for structured financial data with fast access patterns
- **Data Tables**:
  - `assets`: Stock symbols, company info, sync timestamps
  - `earningsCalendar`: Earnings dates, estimates, actuals, processing status
  - `newsSentiment`: News articles, sentiment scores, asset associations
  - `foundationalData`: Complete financial datasets (overview, earnings, statements)
- **Backup Strategy**: Automated DynamoDB backups with point-in-time recovery
- **Data Retention**: Configurable retention policies for different data types

### **External API Integration**
- **Alpaca API**: `/v2/assets?status=active` for tradable asset catalog
- **AlphaVantage API**: Multiple endpoints for comprehensive financial data:
  - EARNINGS_CALENDAR: Earnings dates and estimates
  - COMPANY_OVERVIEW: Company fundamentals and ratios
  - EARNINGS: Historical earnings data
  - CASH_FLOW: Cash flow statements
  - BALANCE_SHEET: Balance sheet data
  - INCOME_STATEMENT: Income statement data
  - NEWS_SENTIMENT: Market news and sentiment analysis
- **API Management**: Full API access with optimized rate management and caching

### **Monitoring and Observability**
- **CloudWatch Metrics**: Custom metrics for data collection success rates, processing times, and error rates
- **Alerting System**: Automated alerts for system failures, data quality issues, and API problems
- **Logging**: Structured logging with correlation IDs for troubleshooting and auditing
- **Health Checks**: Continuous monitoring of system components and data freshness

## Data Collection Workflows

### **Asset Synchronization Workflow**
1. **EventBridge Trigger**: Daily at 4:00 AM
2. **Lambda Execution**: SyncAssets function queries Alpaca API
3. **Data Processing**: Validates and upserts asset records
4. **Status Updates**: Updates sync timestamps and emits metrics

### **Earnings Processing Workflow**
1. **Calendar Sync**: Daily at 5:00 AM, updates earnings calendar
2. **Earnings Detection**: Daily at 6:00 AM, identifies recent earnings releases
3. **Event Dispatch**: Triggers pollenationNeeded events for assets with recent earnings
4. **Data Collection**: Comprehensive financial data collection for earnings-triggered assets

### **Regular Data Refresh Workflow**
1. **Asset Prioritization**: Daily at 7:00 AM, queries assets table for assets with highest volume + oldest lastPollenationDate
2. **Selection Criteria**: Prioritizes assets based on trading volume and data age (e.g., high-volume stocks with data >7 days old)
3. **Event Dispatch**: Triggers pollenationNeeded events for selected high-priority assets
4. **Data Collection**: Updates fundamental data for selected assets, ensuring fresh data for actively traded securities

### **pollenationNeeded Event Processing**
1. **Event Receipt**: Lambda function receives pollenationNeeded event with asset symbol
2. **Complete Dataset Retrieval**: Sequential calls to AlphaVantage endpoints - **each returns complete historical datasets** (typically 10+ years)
3. **Bulk Data Processing**: Process complete historical datasets (20-50 records per financial statement type)
4. **Data Validation**: Validates all incoming financial data
5. **Bulk Upsert Operations**: **Upserts ALL historical records** (both new and existing data for maximum accuracy)
6. **Monitoring**: Emits success/failure metrics and logs

**Key Architecture**: Each pollination re-processes complete historical datasets, ensuring data accuracy and automatic gap-filling.

### **News Sentiment Collection Workflow**
1. **Hourly Trigger**: EventBridge triggers news collection every hour
2. **API Query**: Retrieves news sentiment data for the past 2 hours
3. **Asset Matching**: Filters news to only include articles mentioning tracked assets
4. **Storage**: Stores filtered news with asset associations and sentiment scores

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
- Active asset coverage: 100% of Alpaca-listed active assets
- Earnings calendar coverage: All upcoming earnings for tracked assets
- News sentiment coverage: All relevant news articles from AlphaVantage
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

**Document Status**: Reset for data collection focus
**Scope**: Data collection and storage only - no user-facing features
**Next Phase**: Future applications will build upon this data foundation



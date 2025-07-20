## Technical Requirements Document

### System Architecture

**Infrastructure**:
- AWS Lambda-based serverless architecture
- CDK Deployment with TypeScript
- Node.js lambda functions (v22 runtime)
- Authentication via Auth0
- API Gateway for REST API endpoints
- DynamoDB for all data storage (no RDS)
- S3 for static assets and file storage
- CloudFront for content delivery
- EventBridge for event-driven processing
- CloudWatch for monitoring and logging

**Core Components**:
- **Asset Sync Service**:
  - Purpose: Synchronizes with Alpaca API to maintain current asset list
  - Dependencies: Alpaca API, DynamoDB, CloudWatch
  - Technical Constraints: Daily sync schedule, API rate limits, data validation
  - Schedule: Daily at 5:00 AM
  - Process: Validates asset data and emits monitoring metrics

- **Earnings Calendar Service**:
  - Purpose: Tracks upcoming earnings releases for proactive data updates
  - Dependencies: Alpha Vantage APIs, DynamoDB, CloudWatch
  - Technical Constraints: Daily sync schedule, API rate limits, date validation
  - Schedule: Daily
  - Process: Validates earnings data and prioritizes assets for pollination

- **Asset Data Processing Service**:
  - Purpose: Ingests and processes Alpha Vantage financial data
  - Dependencies: Alpha Vantage APIs, DynamoDB, analysis queue, CloudWatch
  - Technical Constraints: Rate limits on Alpha Vantage APIs, daily update cycles, data validation
  - Schedule: Daily at 6:00 AM
  - Process: Validates financial data, queues assets for analysis, emits monitoring metrics

- **AI Analysis Engine**:
  - Purpose: Processes financial data to generate AI ratings and analysis
  - Dependencies: Financial data storage, AI/ML models, analysis results storage, analysis queue, CloudWatch
  - Technical Constraints: Processing time limits, model accuracy requirements, batch processing, data validation
  - Schedule: Hourly
  - Process: Validates input data, retrieves queued assets, processes in batches of 8, validates AI output, generates analysis, emits monitoring metrics

- **User Management Service**:
  - Purpose: Handles user authentication, profiles, and preferences
  - Dependencies: Auth0, DynamoDB, user preferences storage
  - Technical Constraints: Auth0 integration, user data privacy requirements

- **Daily Briefing Service**:
  - Purpose: Generates personalized daily briefings for users
  - Dependencies: User preferences, AI analysis data, news sentiment data
  - Technical Constraints: Real-time data aggregation, personalization algorithms

- **Watchlist Management Service**:
  - Purpose: Manages user watchlists and portfolio tracking
  - Dependencies: User data, asset data, AI analysis data
  - Technical Constraints: Real-time updates, user-specific data isolation

- **Search and Discovery Service**:
  - Purpose: Provides fast asset search and filtering capabilities
  - Dependencies: Asset database, AI analysis data, search indexing
  - Technical Constraints: Sub-second query performance, semantic search capabilities

### Data Architecture

**Data Storage Strategy**:
- **Primary Storage**: DynamoDB for all structured data and fast queries
- **Secondary Storage**: S3 for full AI analysis JSON objects and large files
- **Search Index**: OpenSearch/Elasticsearch for semantic search capabilities
- **Caching**: ElastiCache Redis for frequently accessed data

**Core Data Models**:

**Users Table**:
- Attributes: user_id (PK), email, first_name, last_name, birth_date, topics_of_interest, investment_knowledge_level, created_at, updated_at
- Relationships: One-to-many with watchlists, user_preferences
- Constraints: Unique email, required fields validation

**Assets Table**:
- Attributes: asset_id (PK), symbol, company_name, sector, industry, market_cap, last_updated
- Relationships: One-to-many with asset_analysis, watchlist_items
- Constraints: Unique symbol, required financial data

**Asset AI Analysis Table**:
- Attributes: analysis_id (PK), asset_id (FK), ai_rating, confidence_interval, rating_stability, pe_ratio, sector_avg_pe, sentiment_score, risk_score, financial_health_score, growth_score, debt_to_equity, current_ratio, roe, roa, profit_margin, revenue_growth_3yr, eps_growth_3yr, full_analysis_json, searchable_text, last_updated
- Relationships: Many-to-one with assets
- Constraints: Daily updates, data validation

**Watchlists Table**:
- Attributes: watchlist_id (PK), user_id (FK), name, description, created_at, updated_at
- Relationships: Many-to-one with users, one-to-many with watchlist_items
- Constraints: User ownership, unique names per user

**Watchlist Items Table**:
- Attributes: item_id (PK), watchlist_id (FK), asset_id (FK), added_at, notes
- Relationships: Many-to-one with watchlists and assets
- Constraints: Unique asset per watchlist

**User Preferences Table**:
- Attributes: preference_id (PK), user_id (FK), preference_key, preference_value, updated_at
- Relationships: Many-to-one with users
- Constraints: User ownership, preference validation

**News Sentiment Table**:
- Attributes: news_id (PK), time_published (SK), asset_symbol, title, url, overall_sentiment_score, overall_sentiment_label, ticker_sentiment_json, relevance_score, related_assets, source, summary, last_sync_timestamp, created_at, updated_at
- Relationships: Many-to-many with assets (news can mention multiple assets)
- Constraints: Real-time updates, sentiment validation, hourly sync schedule
- Indexes: asset-news-index (by asset_symbol + time_published), sentiment-score-index (by sentiment_score + time_published)

**Earnings Calendar Table**:
- Attributes: calendar_id (PK), asset_id (FK), earnings_date, report_time (pre-market/post-market), estimated_eps, actual_eps, surprise, surprise_percentage, created_at, updated_at
- Relationships: Many-to-one with assets
- Constraints: Unique earnings per asset per date, date validation

**Analysis Queue Table**:
- Attributes: queue_id (PK), asset_id (FK), priority (high/normal/low), queued_at, scheduled_for, retry_count, last_attempt, status (pending/processing/completed/failed), error_message, validation_status
- Relationships: Many-to-one with assets
- Constraints: Unique asset per queue, status validation

**Storage Solutions**:
- **Primary Storage**: DynamoDB for all structured data with auto-scaling
- **Secondary Storage**: S3 for large JSON objects and historical data
- **Caching Strategy**: Redis for AI ratings, sector averages, user preferences
- **Data Retention Requirements**: 2+ years for AI analysis, 5+ years for financial data, 90 days for news sentiment

### API Specifications

**REST API Endpoints**:

**Authentication Endpoints**:
- `POST /auth/login` - User authentication via Auth0
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile

**Asset Management Endpoints**:
- `GET /assets` - List assets with filtering and pagination
- `GET /assets/{symbol}` - Get asset details
- `GET /assets/{symbol}/analysis` - Get AI analysis for asset
- `GET /assets/search` - Search assets by criteria
- `GET /assets/sectors` - Get sector performance data

**Watchlist Endpoints**:
- `GET /watchlists` - Get user's watchlists
- `POST /watchlists` - Create new watchlist
- `PUT /watchlists/{id}` - Update watchlist
- `DELETE /watchlists/{id}` - Delete watchlist
- `POST /watchlists/{id}/assets` - Add asset to watchlist
- `DELETE /watchlists/{id}/assets/{asset_id}` - Remove asset from watchlist

**Daily Briefing Endpoints**:
- `GET /briefing/daily` - Get personalized daily briefing
- `GET /briefing/news` - Get personalized news feed
- `GET /briefing/market-overview` - Get market overview data

**AI Analysis Endpoints**:
- `GET /analysis/assets/{symbol}` - Get comprehensive AI analysis
- `GET /analysis/sentiment/{symbol}` - Get sentiment analysis
- `GET /analysis/risk/{symbol}` - Get risk assessment
- `GET /analysis/peers/{symbol}` - Get peer comparison

**Request/Response Format**:
- **Request Format**: JSON with standard HTTP headers
- **Response Format**: JSON with consistent error handling
- **Authentication**: JWT tokens via Auth0
- **Rate Limiting**: 1000 requests per hour per user, 100 requests per minute per endpoint

### Security Requirements

**Authentication**:
- **Method**: Auth0 with JWT tokens
- **User Types**: Individual investors, admin users
- **Session Management**: JWT token expiration (24 hours), refresh token rotation
- **Multi-Factor Authentication**: Optional for enhanced security

**Authorization**:
- **Access Control Model**: Role-based access control (RBAC)
- **Permission Levels**: 
  - User: Access to own data, public asset information
  - Admin: System management, user administration
- **Resource Protection**: User data isolation, API endpoint protection

**Data Protection**:
- **Encryption Requirements**: 
  - Data at rest: AES-256 encryption
  - Data in transit: TLS 1.3
  - Database encryption: DynamoDB encryption at rest
- **Data Classification**: 
  - Public: Asset financial data, AI analysis
  - Private: User profiles, watchlists, preferences
  - Sensitive: Authentication tokens, personal information
- **Compliance Requirements**: 
  - GDPR compliance for EU users
  - CCPA compliance for California users
  - Financial data protection standards

### Testing Strategy

**Unit Testing**:
- **Coverage Requirements**: 80% code coverage minimum
- **Testing Framework**: Jest for Node.js functions
- **Automation Approach**: Automated testing in CI/CD pipeline
- **Test Scope**: Individual Lambda functions, utility functions, data processing logic

**Integration Testing**:
- **Scope**: API endpoints, database interactions, external service integrations
- **Test Environment**: Staging environment with production-like data
- **Data Requirements**: Mock Alpha Vantage data, test user accounts
- **Test Coverage**: End-to-end user workflows, error handling scenarios

**Performance Testing**:
- **Load Testing Requirements**: 
  - Support 1,000 concurrent users
  - Sub-second API response times
  - Handle 10,000+ assets with daily updates
- **Benchmarks**: 
  - API response time: <500ms for 95% of requests
  - Database queries: <100ms for simple queries
  - AI analysis generation: <30 seconds per asset
- **Tools**: Artillery for load testing, AWS X-Ray for performance monitoring

**AI Model Testing**:
- **Accuracy Testing**: Backtest AI ratings against historical performance
- **Model Validation**: Cross-validation of AI analysis components
- **Performance Monitoring**: Track rating accuracy and drift over time

### Data Validation and Quality Assurance

**Asset Data Validation**:
- **Symbol Format**: Valid stock symbol format (e.g., AAPL, MSFT)
- **Required Fields**: Company name, sector, industry, market cap
- **Data Completeness**: All required fields present and non-null
- **Data Types**: Numeric fields contain valid numbers, dates in correct format

**Financial Data Validation**:
- **Numeric Ranges**: P/E ratios > 0, market cap > 0, revenue > 0
- **Date Consistency**: Financial statement dates are logical and sequential
- **Data Completeness**: Required financial metrics present for analysis
- **Cross-Reference**: Earnings data matches income statement data

**Earnings Calendar Validation**:
- **Date Format**: Valid date format and logical earnings dates
- **Symbol Matching**: Earnings symbols exist in assets table
- **Data Consistency**: Estimated vs. actual EPS relationships
- **Report Times**: Valid pre-market/post-market designations

**AI Analysis Validation**:
- **Rating Ranges**: AI ratings within 1-5 scale
- **Confidence Scores**: Confidence intervals within 0-100%
- **Required Fields**: All analysis components present
- **Logical Consistency**: Risk scores align with financial health metrics

**Validation Error Handling**:
- **Soft Failures**: Log warnings, continue processing with defaults
- **Hard Failures**: Skip asset, log error, move to dead letter queue
- **Retry Logic**: Retry validation failures with exponential backoff
- **Alerting**: Notify on high validation failure rates

### Monitoring and Logging

**Custom CloudWatch Metrics**:

**Data Ingestion Metrics**:
- `AssetSyncSuccess` / `AssetSyncFailure` (Count)
- `EarningsCalendarSyncSuccess` / `EarningsCalendarSyncFailure` (Count)
- `NewsSentimentSyncSuccess` / `NewsSentimentSyncFailure` (Count)
- `DataPollinationSuccess` / `DataPollinationFailure` (Count)
- `AssetsProcessed` / `AssetsFailed` (Count)
- `QueueDepth` (Gauge)
- `ProcessingTime` (Histogram)

**API Performance Metrics**:
- `AlphaVantageAPILatency` (Histogram)
- `AlpacaAPILatency` (Histogram)
- `APIRateLimitHits` (Count)
- `APIErrorRate` (Percentage)

**Data Quality Metrics**:
- `ValidationSuccess` / `ValidationFailure` (Count)
- `DataCompleteness` (Percentage)
- `DataFreshness` (Age in hours)
- `AIAnalysisAccuracy` (Percentage)

**Processing Pipeline Metrics**:
- `BatchProcessingTime` (Histogram)
- `BatchSize` (Gauge)
- `QueueProcessingRate` (Rate)
- `RetryCount` (Histogram)
- `NewsRecordsProcessed` / `NewsRecordsFailed` (Count)
- `NewsArticlesPerHour` (Gauge)
- `AssetMatchesFound` (Count)

**CloudWatch Dashboard - Data Ingestion Flow**:
- **Real-time Queue Depth**: Number of pending analysis items
- **Processing Pipeline Status**: Success/failure rates for each workflow
- **API Performance**: Response times and error rates
- **Data Quality**: Validation success rates and data completeness
- **Processing Throughput**: Assets processed per hour
- **Error Tracking**: Failed assets and retry attempts

**Alert Thresholds**:
- Queue depth > 1000 items (high backlog)
- Processing failure rate > 10%
- API error rate > 5%
- Validation failure rate > 15%
- Processing time > 5 minutes per batch
- News sentiment sync failure rate > 20%
- AlphaVantage API rate limit hits > 1 per hour (should never happen with single call)

**Logging**:
- **Log Levels**: ERROR, WARN, INFO, DEBUG with structured logging
- **Retention Policy**: 30 days for application logs, 90 days for access logs
- **Analysis Tools**: CloudWatch Logs Insights, AWS X-Ray for tracing
- **Log Structure**: JSON format with correlation IDs for request tracking
- **Validation Logs**: Detailed validation failure reasons and data samples

**AI Model Monitoring**:
- **Model Performance**: Track rating accuracy, sentiment analysis quality
- **Data Quality**: Monitor Alpha Vantage data completeness and accuracy
- **Drift Detection**: Alert on significant changes in AI model performance
- **User Feedback**: Track user interactions with AI recommendations
- **Processing Efficiency**: Monitor batch processing times and success rates

### Disaster Recovery

**Backup Strategy**:
- **Frequency**: Daily automated backups of DynamoDB tables, continuous S3 replication
- **Retention**: 30 days for daily backups, 1 year for weekly backups
- **Recovery Time Objectives**: 4 hours for full system recovery
- **Backup Locations**: Cross-region replication for critical data

**Failover Plan**:
- **Triggers**: Regional service outages, critical component failures
- **Process**: Automated failover to secondary AWS region
- **Recovery Point Objectives**: 15 minutes for critical services
- **Data Consistency**: Eventual consistency with conflict resolution

**High Availability**:
- **Multi-AZ Deployment**: All services deployed across multiple availability zones
- **Auto-scaling**: Lambda functions and database auto-scaling
- **Circuit Breakers**: Graceful degradation for external service failures
- **Health Checks**: Continuous monitoring of service health

### Pipeline Requirements

**CI/CD**:
- **Build Process**: GitHub Actions with automated testing and security scanning
- **Deployment Stages**: Development → Staging → Production
- **Quality Gates**: Code coverage, security scans, performance tests
- **Deployment Strategy**: Blue-green deployment for zero-downtime updates

**Environment Management**:
- **Environment Types**: Development, Staging, Production
- **Configuration Management**: AWS Systems Manager Parameter Store
- **Promotion Process**: Automated promotion with manual approval gates
- **Infrastructure as Code**: CDK for all infrastructure provisioning

**Data Pipeline**:
- **Alpha Vantage Integration**: Daily data ingestion with error handling
- **AI Analysis Pipeline**: Automated processing of financial data
- **Data Quality Checks**: Validation of incoming financial data
- **Monitoring**: Pipeline health monitoring and alerting

**Event-Driven Data Processing Architecture**:

**Scheduled Triggers (Cron Jobs)**:

**Daily Asset Sync (4:00 AM)**:
- **Purpose**: Synchronize with Alpaca API to get latest tradable assets
- **Trigger**: Daily cron schedule
- **Process**: 
  - Call Alpaca `/v2/assets` endpoint
  - Validate asset data (symbol format, required fields)
  - Sync with assets table (add new, update existing, mark inactive)
  - Emit CloudWatch metrics for sync results
- **Output**: Updated assets table with latest tradable securities
- **Validation**: Symbol format, required fields, data completeness

**Daily Earnings Calendar Sync (5:00 AM)**:
- **Purpose**: Track upcoming earnings releases for proactive data updates
- **Trigger**: Daily cron schedule
- **Process**:
  - Call Alpha Vantage EARNINGS_CALENDAR endpoint
  - Validate earnings data (date format, symbol matching)
  - Update earningsCalendar table
- **Output**: Updated earnings calendar with upcoming releases
- **Validation**: Date format, symbol existence, data consistency

**Daily Earnings-Triggered Pollination (6:00 AM)**:
- **Purpose**: Trigger data updates for assets with recent earnings releases
- **Trigger**: Daily cron schedule
- **Process**:
  - Query earningsCalendar table for assets with earnings in past day
  - For each asset found, dispatch `pollenationNeeded` event
  - For each asset found, dispatch `earningsProcessed` event
- **Output**: Event-driven pollination triggers for earnings-relevant assets
- **Validation**: Earnings date validation, asset existence verification

**Daily Regular Pollination (7:00 AM)**:
- **Purpose**: Trigger data updates for high-priority assets based on volume and freshness
- **Trigger**: Daily cron schedule
- **Process**:
  - Query assets table for highest volume + oldest lastPollenationDate
  - For each asset returned, dispatch `pollenationNeeded` event
- **Output**: Event-driven pollination triggers for regular asset updates
- **Validation**: Asset prioritization logic, rate limit compliance

**Hourly News Sentiment Sync (Every Hour)**:
- **Purpose**: Collect fresh news sentiment data for comprehensive market analysis
- **Trigger**: Hourly cron schedule (`0 * * * ? *`)
- **Process**:
  - Calculate date range (last 2 hours) for news collection
  - Single call to Alpha Vantage NEWS_SENTIMENT endpoint with date range
  - Query signal9_assets table for all active asset symbols
  - Match news to assets by parsing content for ticker mentions
  - Store all news with asset associations
  - Update lastNewsSyncTimestamp
- **Output**: Updated newsSentiment table with all news and asset associations
- **Validation**: Sentiment score ranges, relevance scores, data completeness
- **Rate Limiting**: Single API call per hour (well within AlphaVantage free tier limits)

**Event Handlers**:

**pollenationNeeded Event Handler**:
- **Purpose**: Process financial data ingestion for individual assets
- **Trigger**: Event-driven (from cron triggers)
- **Process**:
  - Call AlphaVantage API endpoints (Company Overview, Earnings, Cash Flow, Balance Sheet, Income Statement, Earnings Call Scripts)
  - Validate all incoming financial data
  - Upsert data in foundational data tables
  - Dispatch `analysisNeeded` event for processed asset
- **Output**: Updated foundational data and analysis trigger
- **Validation**: Financial data completeness, numeric ranges, date consistency

**analysisNeeded Event Handler**:
- **Purpose**: Generate AI analysis for individual assets
- **Trigger**: Event-driven (from pollenationNeeded events)
- **Process**:
  - Load AI models (sentiment analysis, financial analysis, risk assessment, peer comparison)
  - Process financial data through AI analysis engine
  - Generate comprehensive AI analysis and ratings
  - Update asset analysis table with results
  - Mark analysis as completed
  - Dispatch `analysisComplete` events
- **Output**: AI-generated ratings and analysis
- **Validation**: AI model output ranges, confidence scores, required fields

**earningsProcessed Event Handler**:
- **Purpose**: Mark earnings as processed to prevent duplicate processing
- **Trigger**: Event-driven (from earnings-triggered pollination)
- **Process**:
  - Update earningsCalendar table to mark earnings as processed
  - Prevent duplicate processing of same earnings release
- **Output**: Updated earnings processing status
- **Validation**: Earnings record existence, processing status update

**Event Flow Architecture**:
```
4:00 AM: Asset Sync (Cron) → Alpaca API → Assets Table
5:00 AM: Earnings Calendar Sync (Cron) → AlphaVantage → EarningsCalendar Table
6:00 AM: Earnings Pollination (Cron) → pollenationNeeded Events + earningsProcessed Events
7:00 AM: Regular Pollination (Cron) → pollenationNeeded Events
Hourly: News Sentiment Sync (Cron) → AlphaVantage → NewsSentiment Table
Event-Driven: pollenationNeeded → PollenateAsset → analysisNeeded → AnalyzeAsset → analysisComplete
Event-Driven: earningsProcessed → markEarningsProcessed → Update EarningsCalendar
```

### Scalability Requirements

**Performance Targets**:
- **Concurrent Users**: Support 1,000+ concurrent users
- **Data Volume**: Handle 10,000+ assets with daily updates
- **Response Times**: Sub-second API responses for 95% of requests
- **Throughput**: 10,000+ API requests per minute

**Auto-scaling**:
- **Lambda Functions**: Auto-scale based on request volume
- **Database**: DynamoDB auto-scaling for read/write capacity
- **Caching**: Redis auto-scaling for cache capacity
- **CDN**: CloudFront for global content delivery

### Queue-Based Processing Architecture

**Queue Management**:
- **Analysis Queue**: DynamoDB table for pending AI analysis items
- **Priority System**: High-volume assets and older data get priority
- **Status Tracking**: pending, processing, completed, failed, retry
- **Retry Logic**: Exponential backoff with max 3 retries

**Processing Flow**:
```
Daily 5:00 AM: Asset Sync → Alpaca API → Assets Table
Daily 6:00 AM: Data Pollination → Alpha Vantage APIs → Foundational Data → Queue for Analysis
Hourly: AI Processing → Retrieve Queue → Batch Processing → AI Analysis → Update Results
```

**Batch Processing Strategy**:
- **Batch Size**: 8 assets per Lambda execution
- **Grouping**: By industry for better AI context
- **Model Loading**: Once per batch to reduce overhead
- **Memory Usage**: 4GB Lambda with AI model caching

**Error Handling**:
- **Queue Item Status**: Track processing state and error messages
- **Retry Logic**: Exponential backoff (1h, 4h, 24h)
- **Dead Letter Queue**: Handle permanently failed items
- **Monitoring**: Track queue depth and processing success rates
- **Validation Failures**: Log detailed error reasons and data samples
- **Rate Limit Handling**: Implement exponential backoff for API calls
- **Data Quality Alerts**: Notify on high validation failure rates

### External Dependencies

**Alpha Vantage APIs**:
- **Rate Limits**: 5 API calls per minute, 500 per day (free tier)
- **Data Types**: Company overview, financial statements, earnings (news sentiment handled separately via hourly sync)
- **Error Handling**: Graceful degradation when APIs are unavailable
- **Caching**: Cache API responses to minimize rate limit impact

**Alpaca API Integration**:
- **Asset Data**: `/v2/assets` endpoint for tradable securities
- **Rate Limits**: 200 requests per minute
- **Data Types**: Asset symbols, names, status, tradability
- **Sync Strategy**: Daily sync to maintain current asset list

**Auth0 Integration**:
- **Authentication**: JWT token-based authentication
- **User Management**: User profile and preference management
- **Security**: Multi-factor authentication support
- **Compliance**: GDPR and CCPA compliance features
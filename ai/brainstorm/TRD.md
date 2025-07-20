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
  - Schedule: Daily at 4:00 AM
  - Process: Validates asset data and emits monitoring metrics

- **Earnings Calendar Service**:
  - Purpose: Tracks upcoming earnings releases for proactive data updates
  - Dependencies: Alpha Vantage APIs, DynamoDB, CloudWatch
  - Technical Constraints: Daily sync schedule, API rate limits, date validation
  - Schedule: Daily at 5:00 AM
  - Process: Validates earnings data and prioritizes assets for pollination

- **Asset Data Processing Service**:
  - Purpose: Ingests and processes Alpha Vantage financial data
  - Dependencies: Alpha Vantage APIs, DynamoDB, analysis queue, CloudWatch
  - Technical Constraints: Rate limits on Alpha Vantage APIs, daily update cycles, data validation
  - Schedule: Daily at 6:00 AM (earnings-triggered) and 7:00 AM (regular)
  - Process: Validates financial data, queues assets for analysis, emits monitoring metrics

- **AI Analysis Engine**:
  - Purpose: Processes financial data to generate AI ratings and analysis
  - Dependencies: Financial data storage, AI/ML models, analysis results storage, analysis queue, CloudWatch
  - Technical Constraints: Processing time limits, model accuracy requirements, batch processing, data validation
  - Schedule: Event-driven (triggered by analysisNeeded events)
  - Process: Validates input data, retrieves queued assets, processes in batches of 8, validates AI output, generates analysis, emits monitoring metrics

- **News Sentiment Service**:
  - Purpose: Collects and processes news sentiment data for market analysis
  - Dependencies: Alpha Vantage APIs, DynamoDB, CloudWatch
  - Technical Constraints: Hourly sync schedule, API rate limits, sentiment analysis
  - Schedule: Hourly (every hour)
  - Process: Collects news data, matches to assets, stores sentiment analysis

- **User Management Service**:
  - Purpose: Handles user authentication, profiles, and preferences
  - Dependencies: Auth0, DynamoDB, user preferences storage
  - Technical Constraints: Auth0 integration, user data privacy requirements

- **Daily Briefing Service**:
  - Purpose: Generates personalized daily briefings for users
  - Dependencies: User preferences, AI analysis data, news sentiment data, watchlist data
  - Technical Constraints: Real-time data aggregation, personalization algorithms, widget-based UI
  - Features: 8 core widgets (Executive Summary, Watchlists Overview, Portfolio Analytics, Market Sentiment, Earnings Calendar, Market News, Personalized Insights)

- **Asset Profile Service**:
  - Purpose: Provides detailed asset-specific analysis and insights
  - Dependencies: AI analysis data, news sentiment data, financial data, technical data
  - Technical Constraints: Real-time data access, interactive UI components, chart rendering
  - Features: 10 analysis components (Investment Rating, Financial Health, Risk Assessment, Sentiment Analysis, Peer Comparison, Earnings Analysis, News Feed, Technical Analysis, Management Analysis, Financial Modeling)

- **Watchlist Management Service**:
  - Purpose: Manages user watchlists and portfolio tracking
  - Dependencies: User data, asset data, AI analysis data
  - Technical Constraints: Real-time updates, user-specific data isolation, multi-watchlist support

- **Search and Discovery Service**:
  - Purpose: Provides fast asset search and filtering capabilities
  - Dependencies: Asset database, AI analysis data, search indexing
  - Technical Constraints: Sub-second query performance, semantic search capabilities

- **Alert and Notification Service**:
  - Purpose: Manages user alerts and notifications for rating changes, news events, and risk factors
  - Dependencies: User preferences, AI analysis data, news sentiment data, EventBridge
  - Technical Constraints: Real-time event processing, user preference filtering, notification delivery

- **Data Visualization Service**:
  - Purpose: Provides interactive charts, heat maps, and data visualization components
  - Dependencies: Chart libraries, real-time data feeds, user interaction tracking
  - Technical Constraints: Responsive design, interactive features, performance optimization

### Data Architecture

**Data Storage Strategy**:
- **Primary Storage**: DynamoDB for all structured data and fast queries
- **Secondary Storage**: S3 for full AI analysis JSON objects and large files
- **Search Index**: OpenSearch/Elasticsearch for semantic search capabilities
- **Caching**: ElastiCache Redis for frequently accessed data

**Core Data Models**:

**Users Table**:
- Attributes: user_id (PK), email, first_name, last_name, birth_date, topics_of_interest, investment_knowledge_level, created_at, updated_at
- Relationships: One-to-many with watchlists, user_preferences, user_alerts
- Constraints: Unique email, required fields validation

**Assets Table**:
- Attributes: asset_id (PK), symbol, company_name, sector, industry, market_cap, last_updated, last_pollenation_date, status (active/inactive)
- Relationships: One-to-many with asset_analysis, watchlist_items, asset_news, asset_earnings
- Constraints: Unique symbol, required financial data

**Asset AI Analysis Table**:
- Attributes: analysis_id (PK), asset_id (FK), ai_rating, confidence_interval, rating_stability, rating_components_json, rating_reasoning, pe_ratio, sector_avg_pe, sentiment_score, risk_score, financial_health_score, growth_score, debt_to_equity, current_ratio, roe, roa, profit_margin, revenue_growth_3yr, eps_growth_3yr, full_analysis_json, searchable_text, last_updated, rating_history_json
- Relationships: Many-to-one with assets
- Constraints: Daily updates, data validation, rating range 1-5

**Watchlists Table**:
- Attributes: watchlist_id (PK), user_id (FK), name, description, created_at, updated_at, is_default
- Relationships: Many-to-one with users, one-to-many with watchlist_items
- Constraints: User ownership, unique names per user

**Watchlist Items Table**:
- Attributes: item_id (PK), watchlist_id (FK), asset_id (FK), added_at, notes, alert_preferences
- Relationships: Many-to-one with watchlists and assets
- Constraints: Unique asset per watchlist

**User Preferences Table**:
- Attributes: preference_id (PK), user_id (FK), preference_key, preference_value, updated_at
- Relationships: Many-to-one with users
- Constraints: User ownership, preference validation

**User Alerts Table**:
- Attributes: alert_id (PK), user_id (FK), asset_id (FK), alert_type (rating_change, news_event, risk_factor, earnings), alert_conditions, is_active, created_at, updated_at
- Relationships: Many-to-one with users and assets
- Constraints: User ownership, alert type validation

**News Sentiment Table**:
- Attributes: news_id (PK), time_published (SK), asset_symbol, title, url, overall_sentiment_score, overall_sentiment_label, ticker_sentiment_json, relevance_score, related_assets, source, summary, last_sync_timestamp, created_at, updated_at, news_category, market_impact
- Relationships: Many-to-many with assets (news can mention multiple assets)
- Constraints: Real-time updates, sentiment validation, hourly sync schedule
- Indexes: asset-news-index (by asset_symbol + time_published), sentiment-score-index (by sentiment_score + time_published), category-index (by news_category + time_published)

**Earnings Calendar Table**:
- Attributes: calendar_id (PK), asset_id (FK), earnings_date, report_time (pre-market/post-market), estimated_eps, actual_eps, surprise, surprise_percentage, created_at, updated_at, is_processed
- Relationships: Many-to-one with assets
- Constraints: Unique earnings per asset per date, date validation

**Analysis Queue Table**:
- Attributes: queue_id (PK), asset_id (FK), priority (high/normal/low), queued_at, scheduled_for, retry_count, last_attempt, status (pending/processing/completed/failed), error_message, validation_status
- Relationships: Many-to-one with assets
- Constraints: Unique asset per queue, status validation

**Financial Data Table**:
- Attributes: financial_id (PK), asset_id (FK), data_type (income_statement, balance_sheet, cash_flow, company_overview), period_end_date, data_json, last_updated
- Relationships: Many-to-one with assets
- Constraints: Data type validation, date consistency

**Technical Analysis Table**:
- Attributes: technical_id (PK), asset_id (FK), timeframe, price_data_json, indicators_json, patterns_json, support_resistance_json, last_updated
- Relationships: Many-to-one with assets
- Constraints: Timeframe validation, data completeness

**Peer Comparison Table**:
- Attributes: comparison_id (PK), asset_id (FK), sector_rankings_json, valuation_comparison_json, growth_comparison_json, competitive_analysis_json, last_updated
- Relationships: Many-to-one with assets
- Constraints: Data validation, sector consistency

**Daily Briefing Cache Table**:
- Attributes: briefing_id (PK), user_id (FK), briefing_date, widget_data_json, last_generated, expires_at
- Relationships: Many-to-one with users
- Constraints: Daily generation, cache expiration

**Asset Profile Cache Table**:
- Attributes: profile_id (PK), asset_id (FK), profile_data_json, last_generated, expires_at
- Relationships: Many-to-one with assets
- Constraints: Cache expiration, data freshness

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
- `GET /briefing/daily` - Get personalized daily briefing with all 8 widgets
- `GET /briefing/widgets/{widget_name}` - Get specific widget data (executive_summary, watchlists, portfolio_analytics, market_sentiment, earnings_calendar, market_news, personalized_insights)
- `GET /briefing/news` - Get personalized news feed
- `GET /briefing/market-overview` - Get market overview data
- `PUT /briefing/layout` - Update user's widget layout preferences
- `GET /briefing/export` - Export briefing data as PDF/CSV

**Asset Profile Endpoints**:
- `GET /assets/{symbol}/profile` - Get comprehensive asset profile with all 10 analysis components
- `GET /assets/{symbol}/rating` - Get detailed investment rating and components
- `GET /assets/{symbol}/financial-health` - Get financial health analysis
- `GET /assets/{symbol}/risk-assessment` - Get risk assessment details
- `GET /assets/{symbol}/sentiment` - Get sentiment analysis
- `GET /assets/{symbol}/peer-comparison` - Get peer comparison analysis
- `GET /assets/{symbol}/earnings` - Get earnings analysis and history
- `GET /assets/{symbol}/news` - Get asset-specific news feed
- `GET /assets/{symbol}/technical` - Get technical analysis
- `GET /assets/{symbol}/management` - Get management and strategy analysis
- `GET /assets/{symbol}/financial-modeling` - Get financial projections and valuations
- `GET /assets/{symbol}/export` - Export asset analysis as PDF/CSV

**AI Analysis Endpoints**:
- `GET /analysis/assets/{symbol}` - Get comprehensive AI analysis
- `GET /analysis/sentiment/{symbol}` - Get sentiment analysis
- `GET /analysis/risk/{symbol}` - Get risk assessment
- `GET /analysis/peers/{symbol}` - Get peer comparison
- `GET /analysis/financial-health/{symbol}` - Get financial health analysis
- `GET /analysis/earnings-quality/{symbol}` - Get earnings quality assessment
- `GET /analysis/valuation/{symbol}` - Get valuation models and fair value estimates

**Alert and Notification Endpoints**:
- `GET /alerts` - Get user's active alerts
- `POST /alerts` - Create new alert
- `PUT /alerts/{alert_id}` - Update alert
- `DELETE /alerts/{alert_id}` - Delete alert
- `GET /alerts/types` - Get available alert types and conditions
- `POST /alerts/test` - Test alert conditions

**Data Visualization Endpoints**:
- `GET /charts/{symbol}/price` - Get price chart data
- `GET /charts/{symbol}/technical` - Get technical indicators
- `GET /charts/portfolio/performance` - Get portfolio performance charts
- `GET /charts/portfolio/sector-allocation` - Get sector allocation charts
- `GET /charts/portfolio/risk-distribution` - Get risk distribution charts
- `GET /charts/market/sentiment` - Get market sentiment charts

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
- **Component Testing**: Individual testing of financial health, risk assessment, sentiment analysis, and peer comparison models
- **Integration Testing**: End-to-end testing of complete AI analysis pipeline
- **A/B Testing**: Compare different model versions for rating accuracy

**AI Model Specifications**:

**Investment Rating Model**:
- **Input**: Financial metrics, sentiment data, peer comparison data, market data
- **Output**: 1-5 scale rating with confidence interval and component breakdown
- **Components**: Financial health (30%), growth potential (25%), risk assessment (20%), market sentiment (15%), peer comparison (10%)
- **Training**: Historical financial data with subsequent performance outcomes
- **Validation**: Cross-validation with out-of-sample testing

**Financial Health Model**:
- **Input**: Balance sheet, income statement, cash flow data
- **Output**: 1-5 scale health score with detailed metrics
- **Metrics**: P/E, P/B, EV/EBITDA, ROE, ROA, debt ratios, cash flow metrics
- **Training**: Historical financial data with bankruptcy/success outcomes
- **Validation**: Financial distress prediction accuracy

**Risk Assessment Model**:
- **Input**: Financial metrics, market data, industry data, news sentiment
- **Output**: 1-5 scale risk score with specific risk factors
- **Factors**: Financial risk, business risk, market risk, regulatory risk
- **Training**: Historical data with volatility and drawdown outcomes
- **Validation**: Risk prediction accuracy and factor identification

**Sentiment Analysis Model**:
- **Input**: News articles, social media data, analyst reports
- **Output**: Sentiment score (Bullish/Neutral/Bearish) with confidence
- **Processing**: NLP analysis with relevance scoring and impact assessment
- **Training**: News data with subsequent price movement outcomes
- **Validation**: Sentiment prediction accuracy and relevance scoring

**Peer Comparison Model**:
- **Input**: Asset metrics, sector data, industry benchmarks
- **Output**: Sector rankings, relative performance metrics, competitive analysis
- **Analysis**: Percentile rankings, relative valuation, growth comparison
- **Training**: Historical sector performance data
- **Validation**: Relative performance prediction accuracy

**Technical Analysis Model**:
- **Input**: Price data, volume data, market indicators
- **Output**: Technical indicators, pattern recognition, support/resistance levels
- **Indicators**: Moving averages, RSI, MACD, Bollinger Bands, volume analysis
- **Patterns**: Chart patterns, trend analysis, breakout detection
- **Training**: Historical price data with pattern outcomes
- **Validation**: Pattern recognition accuracy and signal quality

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
  - Call Alpaca `/v2/assets?status=active` endpoint
  - Validate asset data (symbol format, required fields)
  - Sync with assets table (add new, update existing, mark inactive)
  - Emit CloudWatch metrics for sync results
- **Output**: Updated assets table with latest active tradable securities
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

### Frontend Technical Requirements

**Technology Stack**:
- **Framework**: React 18+ with TypeScript
- **State Management**: Redux Toolkit for global state, React Query for server state
- **UI Library**: Material-UI (MUI) or Ant Design for component library
- **Charts**: Chart.js, D3.js, or TradingView for financial charts
- **Build Tool**: Vite for fast development and optimized builds
- **Testing**: Jest and React Testing Library for unit and integration tests

**Daily Briefing UI Requirements**:
- **Widget System**: Drag-and-drop widget layout with 8 core widgets
- **Responsive Design**: Mobile-first design supporting desktop, tablet, and mobile
- **Real-time Updates**: WebSocket connections for live data updates
- **Personalization**: User-configurable widget layouts and preferences
- **Performance**: Sub-2-second page load times, smooth interactions
- **Accessibility**: WCAG 2.1 AA compliance for all components

**Asset Profile UI Requirements**:
- **Tabbed Interface**: 10 analysis components in organized tabs
- **Interactive Charts**: Zoom, pan, and customize chart views
- **Data Tables**: Sortable and filterable data tables with export capabilities
- **Comparison Tools**: Side-by-side asset comparison functionality
- **Alert Management**: Inline alert creation and management
- **Print/Export**: PDF generation and data export capabilities

**Data Visualization Requirements**:
- **Chart Types**: Line charts, candlestick charts, heat maps, radar charts, bar charts
- **Interactive Features**: Tooltips, zoom, pan, time range selection
- **Real-time Data**: Live price updates and indicator calculations
- **Performance**: Smooth 60fps animations, efficient data rendering
- **Mobile Optimization**: Touch-friendly interactions and responsive layouts

**User Experience Requirements**:
- **Navigation**: Intuitive breadcrumb navigation and search functionality
- **Loading States**: Skeleton screens and progress indicators
- **Error Handling**: User-friendly error messages and recovery options
- **Notifications**: Toast notifications for alerts and system messages
- **Offline Support**: Basic offline functionality with cached data

### Scalability Requirements

**Performance Targets**:
- **Concurrent Users**: Support 1,000+ concurrent users
- **Data Volume**: Handle 10,000+ assets with daily updates
- **Response Times**: Sub-second API responses for 95% of requests
- **Throughput**: 10,000+ API requests per minute
- **Frontend Performance**: Sub-2-second page loads, smooth 60fps interactions

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
- **Rate Limits**: 5 API calls per minute, 25 per day (free tier)
- **Data Types**: Company overview, financial statements, earnings (news sentiment handled separately via hourly sync)
- **Error Handling**: Graceful degradation when APIs are unavailable
- **Caching**: Cache API responses to minimize rate limit impact
- **Cost Optimization**: Single API call per hour for news sentiment, batch processing for financial data
- **Capacity Planning**: Maximum 25 analysis runs per day under free tier limits

**Cost Estimation**:
- **Per Analysis Run**: ~$0.15-0.25 (Lambda + AI processing + data storage)
- **Daily Capacity**: 25 analysis runs (AlphaVantage free tier limit)
- **Monthly Cost**: ~$375-625 for full daily capacity
- **Scaling Costs**: Additional AlphaVantage API plans for higher capacity
- **Infrastructure Costs**: AWS Lambda, DynamoDB, CloudWatch, EventBridge (~$200-400/month for 1,000 users)

**Alpaca API Integration**:
- **Asset Data**: `/v2/assets?status=active` endpoint for active tradable securities
- **Rate Limits**: 200 requests per minute
- **Data Types**: Asset symbols, names, status, tradability
- **Sync Strategy**: Daily sync to maintain current active asset list
- **Filtering**: Only retrieve active assets to reduce data volume and processing

**Auth0 Integration**:
- **Authentication**: JWT token-based authentication
- **User Management**: User profile and preference management
- **Security**: Multi-factor authentication support
- **Compliance**: GDPR and CCPA compliance features
# Signal9 Advisor - Phase 1 Plan: Core Infrastructure & Data Pipeline Foundation

## Phase Overview

**Duration**: Weeks 1-4  
**Focus**: Establish the foundational infrastructure and data processing pipeline  
**Goal**: Build a robust, event-driven architecture that efficiently processes fundamental financial data from AlphaVantage while maintaining data quality and system reliability.

## Phase Objectives

1. **Event-Driven Architecture**: Implement separate trigger and processing functions with EventBridge
2. **Smart Data Pollination**: Create dual paths for regular and earnings-triggered updates
3. **API Rate Management**: Efficient handling of AlphaVantage (25 calls/day) and Alpaca APIs
4. **Data Quality Assurance**: Comprehensive validation and monitoring
5. **Secrets Management**: Secure credential storage via AWS Secrets Manager
6. **Cost Optimization**: Stay within AlphaVantage free tier limits (25 calls/day)

## Critical Success Factors

- Robust event-driven data processing pipeline
- API rate limit compliance and optimization (AlphaVantage free tier limits)
- Data quality validation achieving >95% success rate
- Comprehensive monitoring and observability
- Secure credential management
- Cost optimization under API constraints

## Deliverables

- Complete AWS infrastructure deployment (Lambda, DynamoDB, EventBridge, CloudWatch, Secrets Manager)
- Event-driven data processing pipeline with 5 scheduled triggers (including hourly news sync)
- Data ingestion from AlphaVantage and Alpaca APIs
- Comprehensive monitoring and alerting with CloudWatch dashboards
- Testing and validation framework
- Cost estimation and capacity planning (25 analysis runs/day)

## High-Level Tasks

### Task 1: AWS Infrastructure Setup
**Duration**: Week 1  
**Dependencies**: None  
**Context Hints**: 
- Use AWS CDK with TypeScript for infrastructure as code
- Implement serverless architecture with Lambda, DynamoDB, EventBridge
- Follow AWS Well-Architected Framework principles
- Ensure proper IAM roles and security configurations
- Use CDK Nag for security validation
- Node.js lambda functions (v22 runtime)
- API Gateway for REST API endpoints
- S3 for static assets and file storage
- CloudFront for content delivery
- AWS Secrets Manager for secure API key storage

**Subtasks**:
1.1. Initialize new npm project with TypeScript configuration
1.2. Initialize CDK project with TypeScript
1.3. Create DynamoDB tables for all data storage (Users, Assets, Asset Analysis, Watchlists, Watchlist Items, User Preferences, News, Earnings Calendar, Financial Data Tables)
1.4. Set up EventBridge rules for scheduled triggers (4:00 AM, 5:00 AM, 6:00 AM, 7:00 AM, Hourly)
1.5. Configure Lambda functions with proper IAM roles and Node.js v22 runtime
1.6. Set up API Gateway for REST API endpoints
1.7. Configure S3 buckets for static assets and file storage
1.8. Set up CloudFront for content delivery
1.9. Configure AWS Secrets Manager for API credentials
1.10. Implement CloudWatch monitoring and logging
1.11. Deploy initial infrastructure stack

### Task 2: Data Pipeline Architecture
**Duration**: Week 1-2  
**Dependencies**: Task 1  
**Context Hints**:
- Implement event-driven architecture with EventBridge
- Create 5 scheduled cron jobs as specified in TRD (including hourly news sync)
- Use DynamoDB for all data storage (no RDS)
- Implement proper error handling and retry logic
- Ensure data validation at every stage
- Set up OpenSearch/Elasticsearch for semantic search capabilities
- Configure ElastiCache Redis for frequently accessed data
- Implement Step Functions for complex analysis workflows

**Subtasks**:
2.1. Design event-driven data flow architecture
2.2. Implement scheduled triggers (4:00 AM, 5:00 AM, 6:00 AM, 7:00 AM, Hourly)
2.3. Create event handlers for pollenationNeeded and analysisNeeded events
2.4. Set up DynamoDB tables for all data storage (Users, Assets, Asset Analysis, Watchlists, Watchlist Items, User Preferences, News, Earnings Calendar, Financial Data Tables)
2.5. Configure OpenSearch/Elasticsearch for semantic search
2.6. Set up ElastiCache Redis for caching
2.7. Implement Step Functions for analysis workflow orchestration
2.8. Implement data validation and error handling
2.9. Create dead letter queues for failed processing

### Task 3: AlphaVantage API Integration
**Duration**: Week 2  
**Dependencies**: Task 2  
**Context Hints**:
- AlphaVantage free tier: 25 API calls per day
- Required endpoints: Company Overview, Earnings, Cash Flow, Balance Sheet, Income Statement, News Sentiment
- Implement rate limiting and caching strategies
- Handle API failures gracefully
- Validate all incoming financial data
- Use AlphaVantage models for data validation (OVERVIEW.json, EARNINGS.json, CASH_FLOW.json, BALANCE_SHEET.json, INCOME_STATEMENT.json, NEWS_SENTIMENT.json)
- Retrieve API credentials from AWS Secrets Manager

**Subtasks**:
3.1. Implement AlphaVantage API client with rate limiting
3.2. Create data ingestion for Company Overview endpoint (OVERVIEW.json model)
3.3. Create data ingestion for Earnings endpoint (EARNINGS.json model)
3.4. Create data ingestion for Cash Flow endpoint (CASH_FLOW.json model)
3.5. Create data ingestion for Balance Sheet endpoint (BALANCE_SHEET.json model)
3.6. Create data ingestion for Income Statement endpoint (INCOME_STATEMENT.json model)
3.7. Create data ingestion for News Sentiment endpoint (NEWS_SENTIMENT.json model)
3.8. Implement data validation using AlphaVantage models
3.9. Set up caching for API responses
3.10. Implement error handling and retry logic
3.11. Configure API credential retrieval from Secrets Manager

### Task 4: Alpaca API Integration
**Duration**: Week 2  
**Dependencies**: Task 2  
**Context Hints**:
- Alpaca API: `/v2/assets?status=active` endpoint
- Rate limit: 200 requests per minute
- Only retrieve active assets to reduce data volume
- Daily sync at 4:00 AM to maintain current asset list
- Validate asset data before storage
- Alpaca is used for Asset and market data (OHLC)
- Retrieve API credentials from AWS Secrets Manager

**Subtasks**:
4.1. Implement Alpaca API client with rate limiting
4.2. Create asset synchronization logic for `/v2/assets?status=active`
4.3. Implement asset data validation
4.4. Set up daily asset sync at 4:00 AM
4.5. Create asset status tracking and updates
4.6. Implement error handling for API failures
4.7. Set up market data (OHLC) integration
4.8. Configure API credential retrieval from Secrets Manager

### Task 5: Event-Driven Processing Implementation
**Duration**: Week 2-3  
**Dependencies**: Tasks 3, 4  
**Context Hints**:
- Implement pollenationNeeded event handler
- Implement analysisNeeded event handler (basic version for Phase 1)
- Use batch processing for efficiency (8 assets per batch as specified in TRD)
- Implement proper state management
- Track processing status in DynamoDB
- Set up analysis queue management
- Implement Step Functions for complex analysis workflows

**Subtasks**:
5.1. Implement pollenationNeeded event handler
5.2. Create foundational data processing logic
5.3. Implement analysisNeeded event handler (basic rule-based analysis)
5.4. Set up batch processing for 8 assets per batch
5.5. Implement state management and tracking
5.6. Create processing queue management
5.7. Implement retry logic with exponential backoff
5.8. Set up analysis results storage in DynamoDB
5.9. Configure Step Functions for analysis workflow orchestration

### Task 6: Data Quality and Validation
**Duration**: Week 3  
**Dependencies**: Tasks 3, 4, 5  
**Context Hints**:
- Validate all financial data before processing using AlphaVantage models
- Implement comprehensive error handling
- Create data quality metrics and monitoring
- Handle missing or invalid data gracefully
- Ensure data consistency across tables
- Validate data types and date consistency
- Validate news sentiment data quality

**Subtasks**:
6.1. Implement financial data validation rules using AlphaVantage models
6.2. Create asset data validation logic
6.3. Implement earnings calendar validation
6.4. Implement news sentiment data validation
6.5. Set up data quality monitoring metrics
6.6. Create validation error handling and logging
6.7. Implement data completeness checks
6.8. Set up data consistency validation
6.9. Implement data type validation and date consistency checks

### Task 7: Monitoring and Observability
**Duration**: Week 3-4  
**Dependencies**: Tasks 1, 2, 3, 4, 5, 6  
**Context Hints**:
- Use CloudWatch for comprehensive monitoring
- Implement custom metrics for data processing
- Set up alerting for critical failures
- Create dashboards for operational visibility
- Monitor API rate limits and costs
- Set up log aggregation and analysis
- Monitor Step Functions execution and performance

**Subtasks**:
7.1. Set up CloudWatch custom metrics
7.2. Create monitoring dashboards
7.3. Implement alerting for critical failures
7.4. Set up API performance monitoring
7.5. Create data quality monitoring
7.6. Implement cost monitoring and alerting
7.7. Set up log aggregation and analysis
7.8. Configure CloudWatch X-Ray for tracing
7.9. Monitor Step Functions execution and performance

### Task 8: Testing and Validation Framework
**Duration**: Week 4  
**Dependencies**: All previous tasks  
**Context Hints**:
- Implement unit tests for all Lambda functions
- Create integration tests for data pipeline
- Test API rate limiting and error handling
- Validate data quality and consistency
- Test monitoring and alerting systems
- Test batch processing of 8 assets
- Test Step Functions workflows
- Test Secrets Manager integration

**Subtasks**:
8.1. Create unit tests for Lambda functions
8.2. Implement integration tests for data pipeline
8.3. Test API integrations and rate limiting
8.4. Validate data quality and consistency
8.5. Test monitoring and alerting systems
8.6. Create end-to-end testing scenarios
8.7. Implement performance testing
8.8. Test batch processing functionality
8.9. Test Step Functions workflows
8.10. Test Secrets Manager integration

### Task 9: Documentation and Deployment
**Duration**: Week 4  
**Dependencies**: All previous tasks  
**Context Hints**:
- Create comprehensive documentation
- Document API integrations and data flows
- Create deployment guides and runbooks
- Document monitoring and troubleshooting procedures
- Create cost estimation and capacity planning
- Document security configurations
- Document Secrets Manager setup and usage

**Subtasks**:
9.1. Create technical documentation
9.2. Document API integrations and data flows
9.3. Create deployment guides and runbooks
9.4. Document monitoring and troubleshooting procedures
9.5. Create cost estimation and capacity planning
9.6. Document security configurations
9.7. Create operational procedures
9.8. Document data models and validation rules
9.9. Document Secrets Manager setup and usage

## Technical Architecture Details

### Scheduled Triggers (Cron Jobs)
- **4:00 AM**: Asset synchronization with Alpaca API (`/v2/assets?status=active`)
- **5:00 AM**: Earnings calendar synchronization with AlphaVantage
- **6:00 AM**: Earnings-triggered pollination (for assets with recent earnings)
- **7:00 AM**: Regular pollination (for high-volume, stale data assets)
- **Hourly**: News sentiment synchronization with AlphaVantage

### Event-Driven Processing
- **pollenationNeeded Events**: Trigger financial data ingestion for individual assets
- **analysisNeeded Events**: Trigger rule-based analysis generation for processed assets (batch processing of 8 assets)
- **earningsProcessed Events**: Mark earnings as processed to prevent duplicates
- **analysisComplete Events**: Signal completion of rule-based analysis workflow

### Data Storage Strategy
- **Primary Storage**: DynamoDB for all structured data and fast queries
- **Secondary Storage**: S3 for full rule-based analysis JSON objects and large files
- **Search Index**: OpenSearch/Elasticsearch for semantic search capabilities
- **Caching**: ElastiCache Redis for frequently accessed data
- **Data Retention**: 2+ years for analysis data, 5+ years for financial data, 90 days for news data

### Core Data Models (DynamoDB Tables)
- **Users Table**: user_id (PK), email, first_name, last_name, birth_date, topics_of_interest, investment_knowledge_level
- **Assets Table**: asset_id (PK), symbol, company_name, sector, industry, market_cap, status
- **Asset Analysis Table**: analysis_id (PK), asset_id (FK), investment_rating, confidence_interval, rating_components_json
- **Watchlists Table**: watchlist_id (PK), user_id (FK), name, description, asset_count
- **Watchlist Items Table**: item_id (PK), watchlist_id (FK), asset_id (FK), added_at, sort_order
- **User Preferences Table**: preference_id (PK), user_id (FK), preference_key, preference_value
- **News Table**: news_id (PK), time_published (SK), asset_symbol, title, url, relevance_score
- **Earnings Calendar Table**: calendar_id (PK), asset_id (FK), earnings_date, estimated_eps, actual_eps
- **Financial Data Tables**: Income Statement, Balance Sheet, Cash Flow, Company Overview, Earnings

## Success Metrics

### Phase 1 Metrics
- System uptime >99.5%
- Data processing latency <30 seconds
- API rate limit compliance 100% (AlphaVantage 25 calls/day limit)
- Data quality validation success >95%
- Cost per processed asset <$0.25 (under AlphaVantage constraints)
- Daily analysis capacity: 25 assets (free tier limit)
- Batch processing efficiency: 8 assets per batch
- Search performance: Sub-second query performance

## Risk Management

### Technical Risks
- **API Rate Limiting**: Mitigated through smart caching, rate management, and AlphaVantage free tier optimization
- **Data Quality**: Addressed through comprehensive validation using AlphaVantage models
- **Scalability**: Designed for horizontal scaling from the start with auto-scaling
- **Cost Management**: Continuous monitoring and optimization under API constraints
- **Search Performance**: Mitigated through OpenSearch/Elasticsearch optimization
- **Secrets Management**: Secure credential storage and rotation via AWS Secrets Manager

### Mitigation Strategies
- Implement robust error handling and retry logic
- Use caching to minimize API calls
- Monitor costs continuously and set up alerts
- Implement data validation at every stage using AlphaVantage models
- Use dead letter queues for failed processing
- Optimize search indexing and query performance
- Implement secure credential management with automated rotation

## Dependencies

### External Dependencies
- AlphaVantage API (financial data, 25 calls/day free tier limit)
- Alpaca API (market data, `/v2/assets?status=active`)
- AWS services (Lambda, DynamoDB, EventBridge, CloudWatch, S3, CloudFront, API Gateway, OpenSearch, ElastiCache, Secrets Manager, Step Functions)

### Internal Dependencies
- Development team with AWS/CDK expertise (TypeScript, Node.js v22)
- Financial domain knowledge (investment analysis, market data)
- Data engineering expertise (event-driven architecture, fundamental data processing)
- DevOps expertise (CI/CD, monitoring, cost optimization)

## Next Steps

1. **Task Breakdown**: Detailed task breakdown and resource allocation
2. **Team Formation**: Assemble development team with required skills
3. **Environment Setup**: Development and testing environment preparation
4. **API Access**: Secure AlphaVantage and Alpaca API credentials
5. **Development Sprint**: Begin Phase 1 implementation

## Conclusion

Phase 1 establishes the foundational infrastructure and data processing pipeline for Signal9 Advisor. The focus is on building a robust, event-driven architecture that efficiently processes fundamental financial data while staying within API constraints and maintaining high data quality. This foundation will support the rule-based analysis engine and user management systems in Phase 2. 
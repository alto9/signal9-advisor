# Hourly Sync News Sentiment Cron Job

This diagram shows the hourly scheduled job that synchronizes news sentiment data from AlphaVantage API, collecting all news and linking it to relevant assets for comprehensive market analysis.

```mermaid
flowchart TD
    %% AWS EventBridge triggers the Lambda function
    A[EventBridge Rule<br/>Cron: 0 * * * ? *] --> B[Lambda Function<br/>SyncNewsSentiment]
    
    %% Lambda function internal processing steps
    B --> C[Lambda: Calculate date range<br/>last 2 hours]
    C --> D[Lambda: HTTP GET request<br/>AlphaVantage NEWS_SENTIMENT API]
    D --> E[External: AlphaVantage API<br/>NEWS_SENTIMENT endpoint]
    E --> F[Lambda: Validate API response<br/>Check required fields & sentiment scores]
    F --> G[Lambda: Extract ticker symbols<br/>From ticker_sentiment arrays]
    G --> H[Lambda: BatchGetItem request<br/>DynamoDB assets table]
    H --> I[DynamoDB: assets table<br/>Query active asset symbols]
    I --> J[Lambda: Filter news articles<br/>Match against active assets]
    J --> K[Lambda: BatchWriteItem request<br/>DynamoDB newsSentiment table]
    K --> L[DynamoDB: newsSentiment table<br/>Store filtered news with asset associations]
    L --> M[Lambda: Update sync timestamp<br/>In DynamoDB metadata table]
    M --> N[Lambda: PutMetricData request<br/>CloudWatch Metrics]
    
    %% AWS Resource groupings
    subgraph "AWS Infrastructure"
        subgraph "EventBridge"
            O[EventBridge Rule<br/>Scheduled Trigger]
        end
        
        subgraph "Lambda"
            P[Lambda Function<br/>SyncNewsSentiment<br/>Runtime: Node.js/Python]
        end
        
        subgraph "DynamoDB"
            Q[assets table<br/>Read: Active asset symbols]
            R[newsSentiment table<br/>Write: News sentiment data]
            S[metadata table<br/>Write: Sync timestamps]
        end
        
        subgraph "CloudWatch"
            T[Metrics & Logs<br/>Monitoring & Alerting]
        end
    end
    
    %% External API
    subgraph "External API"
        U[AlphaVantage Trading API<br/>NEWS_SENTIMENT endpoint]
    end
    
    %% Resource connections for clarity
    A -.-> O
    B -.-> P
    I -.-> Q
    L -.-> R
    M -.-> S
    N -.-> T
    E -.-> U
    
    %% Color coding by resource type
    style A fill:#2196F3,stroke:#1976D2,stroke-width:2px,color:#ffffff
    style B fill:#FF9800,stroke:#F57C00,stroke-width:2px,color:#ffffff
    style C fill:#FF9800,stroke:#F57C00,stroke-width:2px,color:#ffffff
    style D fill:#FF9800,stroke:#F57C00,stroke-width:2px,color:#ffffff
    style E fill:#F44336,stroke:#D32F2F,stroke-width:2px,color:#ffffff
    style F fill:#FF9800,stroke:#F57C00,stroke-width:2px,color:#ffffff
    style G fill:#FF9800,stroke:#F57C00,stroke-width:2px,color:#ffffff
    style H fill:#FF9800,stroke:#F57C00,stroke-width:2px,color:#ffffff
    style I fill:#9C27B0,stroke:#7B1FA2,stroke-width:2px,color:#ffffff
    style J fill:#FF9800,stroke:#F57C00,stroke-width:2px,color:#ffffff
    style K fill:#FF9800,stroke:#F57C00,stroke-width:2px,color:#ffffff
    style L fill:#9C27B0,stroke:#7B1FA2,stroke-width:2px,color:#ffffff
    style M fill:#FF9800,stroke:#F57C00,stroke-width:2px,color:#ffffff
    style N fill:#FF9800,stroke:#F57C00,stroke-width:2px,color:#ffffff
    style O fill:#607D8B,stroke:#455A64,stroke-width:2px,color:#ffffff
    style P fill:#607D8B,stroke:#455A64,stroke-width:2px,color:#ffffff
    style Q fill:#607D8B,stroke:#455A64,stroke-width:2px,color:#ffffff
    style R fill:#607D8B,stroke:#455A64,stroke-width:2px,color:#ffffff
    style S fill:#607D8B,stroke:#455A64,stroke-width:2px,color:#ffffff
    style T fill:#607D8B,stroke:#455A64,stroke-width:2px,color:#ffffff
    style U fill:#FF9800,stroke:#F57C00,stroke-width:2px,color:#ffffff
```

## Process Flow

### AWS Resource Responsibilities

1. **EventBridge Rule** - AWS EventBridge triggers the job every hour using cron expression `0 * * * ? *`
2. **Lambda Function** - AWS Lambda function (Node.js/Python) performs all processing logic:
   - **Calculate date range** - Determines the time window for news collection (e.g., last 2 hours)
   - **HTTP GET request** - Makes HTTPS call to AlphaVantage's NEWS_SENTIMENT endpoint
   - **Validate API response** - Validates incoming data for required fields, sentiment scores, and relevance
   - **Extract ticker symbols** - Extracts unique ticker symbols from the `ticker_sentiment` arrays
   - **BatchGetItem request** - Queries DynamoDB to check which extracted tickers exist in active assets
   - **Filter news articles** - Filters news to only those mentioning tracked assets
   - **BatchWriteItem request** - Writes filtered news to DynamoDB with asset associations
   - **Update sync timestamp** - Updates the sync timestamp in metadata table
   - **PutMetricData request** - Sends metrics to CloudWatch

3. **DynamoDB Tables**:
   - **assets table** - Source of active asset symbols (read operation)
   - **newsSentiment table** - Stores filtered news sentiment information (write operation)
   - **metadata table** - Tracks sync timestamps and job state (write operation)

4. **CloudWatch** - Receives metrics and logs for monitoring and alerting

5. **AlphaVantage API** - External service providing news sentiment data via HTTP endpoint

## Technical Implementation

### AWS Resources Required
- **EventBridge Rule**: Scheduled trigger with cron expression `0 * * * ? *` (every hour)
- **Lambda Function**: Serverless compute for API calls and database operations
- **DynamoDB Tables**: 
  - assets (read access)
  - newsSentiment (write access) 
  - metadata (write access for sync timestamps)
- **IAM Roles**: Permissions for Lambda to access DynamoDB, CloudWatch, and make external API calls
- **CloudWatch**: Monitoring, metrics collection, and logging

### Rate Limiting Strategy
- **AlphaVantage Free Tier**: 5 API calls per minute, 500 per day
- **Single API Call**: One call per hour to get all news in date range
- **Exponential Backoff**: Implement retry logic with exponential backoff
- **Date Range Optimization**: Use 2-hour windows to minimize data overlap
- **Efficient Filtering**: Only process news mentioning our tracked assets, reducing storage and processing costs

### Error Handling
- **API Rate Limiting**: Implement exponential backoff for AlphaVantage API calls
- **Data Validation**: Skip invalid records and log warnings
- **DynamoDB Conditional Writes**: Use optimistic locking for concurrent updates
- **Dead Letter Queue**: Handle permanently failed executions
- **CloudWatch Logging**: Structured logging with correlation IDs
- **SNS Notifications**: Alert on high validation failure rates

### CloudWatch Metrics
- `NewsSentimentSyncSuccess` / `NewsSentimentSyncFailure` (Count)
- `NewsRecordsProcessed` / `NewsRecordsFailed` (Count)
- `NewsRecordsFiltered` (Count) - Number of news articles filtered out (not mentioning tracked assets)
- `AlphaVantageAPILatency` (Histogram)
- `ValidationFailureRate` (Percentage)
- `ProcessingTime` (Histogram)
- `NewsArticlesPerHour` (Gauge)
- `AssetMatchesFound` (Count)
- `UniqueTickersFound` (Count) - Number of unique tickers found in API response
- `ActiveAssetsMatched` (Count) - Number of tickers that matched our active assets

## Notes

- This job runs hourly to ensure fresh news sentiment data is available for AI analysis
- Single API call per hour collects all news within a 2-hour window
- **Efficient Filtering**: Only news mentioning tracked assets is stored, reducing storage costs and processing overhead
- **API-Driven Matching**: Uses AlphaVantage's `ticker_sentiment` arrays for precise asset matching (no content parsing needed)
- **Batch Database Queries**: Efficiently validates tickers against active assets using batch operations
- Rate limiting is minimal since only one API call is made per hour
- **Focused Data Storage**: Only relevant news is stored, improving query performance and reducing costs
- Date range windows prevent duplicate news collection while ensuring coverage
- **Performance Optimization**: Eliminates the need to query all assets or parse news content manually 
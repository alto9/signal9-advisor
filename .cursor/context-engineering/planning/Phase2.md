# Phase 2: Simple Aggregation (Sentiment Rating)

## Product Requirements

The system should be enhanced with sentiment analysis capabilities:
    - Add a new "Sentiment Analysis" section to the Asset Profile
    - Enhance the Daily Briefing Dashboard with sentiment trends and filtering
    - Calculate and display an overall sentiment rating based on the last 5 news items from stored news data
    - Display requirements:
        - Show the sentiment score using AlphaVantage's rating scale
        - Display the number of news items analyzed (e.g., "Based on 5 recent news items")
        - Show a visual indicator (color-coded or icon) representing the sentiment level
        - Include a timestamp of when the sentiment was last calculated
    - Edge case handling:
        - If fewer than 5 news items are available, display "Insufficient news data for sentiment analysis"
        - If no news items are available, hide the sentiment section entirely
    - Update frequency: Recalculate sentiment whenever new news data is pollinated for the asset
    - Daily Briefing enhancements:
        - Add sentiment filtering options (positive, negative, neutral)
        - Show sentiment trend indicators for saved topics
        - Highlight high-impact news items based on sentiment scores

## Technical Requirements

Implement sentiment analysis aggregation using stored news data:
    - Create a Lambda function triggered by the 'analysisNeeded' event for news data changes
    - Sentiment calculation requirements:
        - Query the last 5 news items from internal database for the asset
        - Extract sentiment scores from stored AlphaVantage news data
        - Calculate the arithmetic mean of sentiment scores
        - Store the calculated sentiment with metadata (timestamp, number of items analyzed)
    - Data storage requirements:
        - Store sentiment results in DynamoDB with TTL for data freshness
        - Include calculation metadata for auditability
        - Index by asset ID and calculation timestamp
    - API requirements:
        - Create GET endpoint to retrieve sentiment data for an asset
        - Include sentiment score, calculation metadata, and last updated timestamp
        - Handle cases where insufficient data exists
    - Error handling:
        - Graceful handling of missing news data
        - Retry logic for API failures
        - Logging of calculation attempts and results
    - Daily Briefing API requirements:
        - Create endpoint to retrieve news filtered by user topics
        - Return news items with sentiment scores and asset associations
        - Support pagination for large news datasets
        - Include market activity summary (asset count, sentiment trends)
        - Implement caching for frequently accessed news data
        - Support real-time sentiment trend calculations

## Testing Requirements

### Unit Testing
- **Sentiment Calculation Logic**: Test sentiment aggregation algorithm with various news item counts
- **Edge Case Handling**: Test scenarios with 0, 1-4, and 5+ news items
- **Data Validation**: Test sentiment score validation and normalization
- **Lambda Function Testing**: Unit tests for sentiment calculation Lambda function
- **API Endpoint Testing**: Test sentiment API endpoints with various data scenarios

### Integration Testing
- **Event-Driven Testing**: Test 'analysisNeeded' event triggering and processing
- **Database Integration**: Test DynamoDB operations for sentiment data storage
- **API Integration**: Test sentiment API integration with frontend components
- **Caching Integration**: Test sentiment data caching and invalidation

### Test Scenarios
- Calculate sentiment with exactly 5 news items
- Handle insufficient news data (0-4 items)
- Test sentiment score averaging with various score ranges
- Validate sentiment metadata storage and retrieval
- Test sentiment trend calculations and caching
- Verify error handling for missing or invalid data
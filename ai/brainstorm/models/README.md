# Signal9 Advisor Models

This folder contains the data model definitions for the Signal9 Advisor system.

## Folder Structure

```
models/
├── README.md                 # This file
├── dynamodb/                 # DynamoDB table definitions
│   ├── users.json            # Users table schema
│   ├── watchlists.json       # Watchlists table schema
│   ├── watchlist_items.json  # Watchlist items table schema
│   ├── asset_analysis.json   # Asset analysis table schema
│   ├── user_preferences.json # User preferences table schema

│   ├── assets.json           # Assets comprehensive data table schema (fundamental + trading)
│   ├── news.json             # News data table schema (comprehensive with sentiment)
│   ├── earningsCalendar.json # Earnings calendar table schema
│   ├── companyOverview.json  # Company overview table schema
│   ├── earnings.json         # Earnings data table schema
│   ├── incomeStatement.json  # Income statement table schema
│   ├── balanceSheet.json     # Balance sheet table schema
│   └── cashFlow.json         # Cash flow table schema
└── alphavantage/             # AlphaVantage API response models
    ├── OVERVIEW.json         # Company overview response
    ├── EARNINGS.json         # Earnings data response
    ├── CASH_FLOW.json        # Cash flow statement response
    ├── BALANCE_SHEET.json    # Balance sheet response
    ├── INCOME_STATEMENT.json # Income statement response
    ├── EARNINGS_CALENDAR.csv # Earnings calendar response
    ├── NEWS_SENTIMENT.json   # News sentiment response
    └── EARNINGS_CALL_TRANSCRIPT.json # Earnings call transcript response
```

## DynamoDB Models

### users.json
- **Purpose**: Stores user account information and preferences
- **Primary Key**: `user_id` (String)
- **GSI**: `email-index` for email-based lookups
- **Key Features**: 
  - User authentication via Auth0 integration
  - Profile information and investment preferences
  - Investment knowledge level tracking
  - GDPR/CCPA compliance ready

### watchlists.json
- **Purpose**: Stores user watchlists for tracking assets of interest
- **Primary Key**: `user_id` (String) + `watchlist_id` (String)
- **GSI**: `default-watchlist-index` for finding user's default watchlist
- **Key Features**: 
  - Multi-watchlist support per user
  - Default watchlist designation
  - Asset count tracking for quick display
  - User ownership and access control

### watchlist_items.json
- **Purpose**: Stores individual assets within user watchlists
- **Primary Key**: `watchlist_id` (String) + `asset_id` (String)
- **GSI**: `asset-watchlists-index` for finding all watchlists containing an asset
- **Key Features**: 
  - Unique asset per watchlist constraint
  - Custom sort ordering support
  - Timestamp tracking for when assets were added
  - Efficient asset-to-watchlist relationship queries

### asset_analysis.json
- **Purpose**: Stores rule-based analysis results and Signal9 investment ratings
- **Primary Key**: `asset_id` (String) + `analysis_date` (String)
- **GSIs**: `rating-index`, `sector-rating-index` for rating and sector-based queries
- **Key Features**: 
  - Comprehensive investment rating (1-5 scale)
  - Component scores (financial health, risk, growth, market)
  - Rating confidence and stability metrics
  - Historical rating tracking
  - Searchable analysis content

### user_preferences.json
- **Purpose**: Stores user preferences and settings for personalization
- **Primary Key**: `user_id` (String) + `preference_key` (String)
- **Key Features**: 
  - Flexible key-value preference storage
  - JSON support for complex preferences
  - Common preference keys for themes, notifications, investment style
  - User-specific customization options



### assets.json
- **Purpose**: Stores comprehensive asset data including fundamental analysis data and trading metadata from Alpaca API
- **Primary Key**: `asset_id` (String)
- **GSIs**: `symbol-index`, `sector-status-index`, `tradable-status-index` for symbol, sector, and trading-based queries
- **Key Features**: 
  - Fundamental asset information (sector, industry, market cap)
  - Trading metadata (tradable, marginable, shortable, etc.)
  - Pollenation tracking for data freshness
  - Asset status management (active, inactive, delisted)
  - Integration with analysis and watchlist systems

### news.json
- **Purpose**: Stores comprehensive news data including sentiment analysis, asset associations, and market impact for Signal9 analysis
- **Primary Key**: `news_id` (String) + `time_published` (String)
- **GSIs**: `asset-news-index`, `sentiment-score-index`, `category-index`, `source-index` for asset, sentiment, category, and source-based queries
- **Key Features**: 
  - News articles with comprehensive sentiment analysis and relevance scoring
  - Asset associations and market impact assessment (supports both asset-specific and general market news)
  - Category-based filtering and time-based queries
  - Support for multiple assets per news article via ticker_sentiment
  - Topics categorization with relevance scores
  - Authors, banner images, and source metadata
  - AlphaVantage NEWS_SENTIMENT API compatible structure









### earningsCalendar.json
- **Purpose**: Stores earnings calendar data from AlphaVantage API
- **Primary Key**: `asset_symbol` (String) + `earnings_date` (String)
- **GSI**: `upcoming-earnings-index` for date-based queries
- **Key Features**:
  - Composite key for unique earnings records
  - Optimized for upcoming earnings queries
  - Supports both estimated and actual EPS data

### Financial Data Architecture

The system uses **specialized tables** for different types of financial data rather than a generic table:

- **incomeStatement.json**: Detailed income statement data with revenue, expenses, profitability metrics
- **balanceSheet.json**: Complete balance sheet data for financial health analysis  
- **cashFlow.json**: Cash flow statement data for liquidity and sustainability assessment
- **companyOverview.json**: Company metadata, ratios, and key financial indicators
- **earnings.json**: Earnings data with surprises and analyst estimates

**Benefits of Specialized Tables**:
- **Better Performance**: Direct field access vs JSON parsing
- **Type Safety**: Structured fields with proper data types
- **Efficient Indexing**: GSIs on specific financial fields
- **Analytics**: Easier financial calculations and peer comparisons
- **Validation**: Field-level constraints and data quality checks



### companyOverview.json
- **Purpose**: Stores company overview data from AlphaVantage API
- **Primary Key**: `symbol` (String) + `last_updated` (String)
- **GSI**: `sector-index` (by sector + market_cap)
- **Key Features**:
  - Comprehensive company information including financial ratios and metrics
  - Optimized for sector-based queries and market cap analysis
  - Includes analyst ratings, valuation metrics, and technical indicators
  - Updated during pollenation cycles for fresh company data

### earnings.json
- **Purpose**: Stores earnings data from AlphaVantage API
- **Primary Key**: `symbol` (String) + `fiscal_date_ending` (String)
- **GSI**: `recent-earnings-index` (by fiscal_date_ending + report_time)
- **Key Features**:
  - Stores both quarterly and annual earnings data
  - Includes earnings surprises and analyst estimates
  - Optimized for recent earnings queries and earnings calendar integration
  - Supports earnings trend analysis and comparison

### incomeStatement.json
- **Purpose**: Stores income statement data from AlphaVantage API
- **Primary Key**: `symbol` (String) + `fiscal_date_ending` (String)
- **GSI**: `recent-statements-index` (by fiscal_date_ending + period_type)
- **Key Features**:
  - Comprehensive income statement data for financial analysis
  - Supports both quarterly and annual statements
  - Includes revenue, expenses, and profitability metrics
  - Optimized for trend analysis and peer comparison

### balanceSheet.json
- **Purpose**: Stores balance sheet data from AlphaVantage API
- **Primary Key**: `symbol` (String) + `fiscal_date_ending` (String)
- **GSI**: `recent-balance-sheets-index` (by fiscal_date_ending + period_type)
- **Key Features**:
  - Complete balance sheet data for financial health analysis
  - Includes assets, liabilities, and equity components
  - Supports liquidity and solvency ratio calculations
  - Optimized for financial strength assessment

### cashFlow.json
- **Purpose**: Stores cash flow data from AlphaVantage API
- **Primary Key**: `symbol` (String) + `fiscal_date_ending` (String)
- **GSI**: `recent-cash-flows-index` (by fiscal_date_ending + period_type)
- **Key Features**:
  - Comprehensive cash flow statement data
  - Includes operating, investing, and financing cash flows
  - Supports cash flow analysis and sustainability assessment
  - Optimized for cash flow trend analysis

## AlphaVantage Models

The `alphavantage/` folder contains sample API responses from AlphaVantage endpoints. These serve as reference models for:

- **Data Structure**: Understanding the format of incoming API data
- **Field Mapping**: Mapping API fields to DynamoDB attributes
- **Validation**: Defining validation rules for incoming data
- **Documentation**: Reference for developers working with AlphaVantage APIs

## Usage Guidelines

### Adding New Models

1. **DynamoDB Tables**: Create new JSON files in `dynamodb/` folder
2. **API Models**: Add sample responses in appropriate subfolder
3. **Documentation**: Update this README with new model descriptions
4. **Validation**: Include validation rules in model definitions

### Model Definition Format

DynamoDB models should include:
- Table name and description
- Key schema and attribute definitions
- Global Secondary Indexes (if needed)
- Item schema with field descriptions
- Billing mode and tags

### Best Practices

1. **Consistent Naming**: Use camelCase for DynamoDB attributes
2. **Descriptive Comments**: Include descriptions for all fields
3. **Indexing Strategy**: Design GSIs for common query patterns
4. **Data Types**: Use appropriate DynamoDB data types (S, N, BOOL)
5. **Audit Fields**: Include created_at, updated_at, last_sync_timestamp

### Integration with Diagrams

When creating or updating diagram files (`.md` files in `diagrams/` folder):
1. Reference the model files instead of embedding schemas
2. Use relative paths to link to model definitions
3. Keep diagrams focused on flow and process
4. Move detailed schemas to this models folder

## Example Usage in Diagrams

Instead of embedding schemas in diagram files, reference them like this:

```markdown
## Database Schema
See: [assets.json](../models/dynamodb/assets.json)
```

This keeps the diagrams clean and maintainable while providing detailed model information in a centralized location. 
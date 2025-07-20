# Signal9 Advisor Models

This folder contains the data model definitions for the Signal9 Advisor system.

## Folder Structure

```
models/
├── README.md                 # This file
├── dynamodb/                 # DynamoDB table definitions
│   ├── signal9_assets.json   # Assets table schema
│   ├── earningsCalendar.json # Earnings calendar table schema
│   ├── newsSentiment.json    # News sentiment table schema
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

### signal9_assets.json
- **Purpose**: Stores tradable assets from Alpaca API
- **Primary Key**: `symbol` (String)
- **GSI**: `status-index` for querying by asset status
- **Key Features**: 
  - Single-table design for asset data
  - Optimized for symbol-based lookups
  - Includes trading metadata (tradable, marginable, etc.)

### earningsCalendar.json
- **Purpose**: Stores earnings calendar data from AlphaVantage API
- **Primary Key**: `asset_symbol` (String) + `earnings_date` (String)
- **GSI**: `upcoming-earnings-index` for date-based queries
- **Key Features**:
  - Composite key for unique earnings records
  - Optimized for upcoming earnings queries
  - Supports both estimated and actual EPS data

### newsSentiment.json
- **Purpose**: Stores all news sentiment data from AlphaVantage API with asset associations
- **Primary Key**: `news_id` (String) + `time_published` (String)
- **GSIs**: `asset-news-index` (by asset_symbol + time_published), `sentiment-score-index` (by sentiment_score + time_published)
- **Key Features**:
  - Stores all news regardless of asset association for comprehensive market analysis
  - News is matched to assets by parsing content for ticker mentions
  - Supports many-to-many relationships (news can mention multiple assets)
  - Optimized for both asset-specific and general market news queries
  - Updated hourly with single API call for efficiency

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
See: [signal9_assets.json](../models/dynamodb/signal9_assets.json)
```

This keeps the diagrams clean and maintainable while providing detailed model information in a centralized location. 
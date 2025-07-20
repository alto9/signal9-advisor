# Contextual Requirements Document

## Purpose

This file serves as a central repository for all relevant context that will be needed during the refinement and implementation phases. Context items should be organized by category and include clear references to their sources.

## Context Hints

### APIs
- **Alpaca**: [Alpaca API Documentation](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html) - Alpaca is used for Asset and market data (OHLC).

### Docs
- **AlphaVantage**: Doc: `@AlphaVantage API` - used to inform tasks related to interfacing directly with the Alpha Vantage API. Alpha Vantage is the source used to retrieve all fundamental asset data.

### Models
- **Company Overview**: [AlphaVantage OVERVIEW Model](./models/alphavantage/OVERVIEW.json) - used to describe the format of data received from AlphaVantage for the Company Overviews
- **News and Sentiment**: [AlphaVantage NEWS_SENTIMENT Model](./models/alphavantage/NEWS_SENTIMENT.json) - used to describe the format of data received from AlphaVantage for the News and Sentiment data
- **Balance Sheet**: [AlphaVantage BALANCE_SHEET Model](./models/alphavantage/BALANCE_SHEET.json) - used to describe the format of data received from AlphaVantage for the Balance Sheets
- **Cash Flow**: [AlphaVantage CASH_FLOW Model](./models/alphavantage/CASH_FLOW.json) - used to describe the format of data received from AlphaVantage for the Cash Flow documents
- **Earnings**: [AlphaVantage EARNINGS Model](./models/alphavantage/EARNINGS.json) - used to describe the format of data received from AlphaVantage for the Company Overviews
- **Income Statement**: [AlphaVantage INCOME_STATEMENT Model](./models/alphavantage/INCOME_STATEMENT.json) - used to describe the format of data received from AlphaVantage for the Income Statements

### MCP Tools
- **AWS CDK**: `Tool: CDKGeneralGuidance` - "CDK Construct Guidance"
- **AWS Documentation**: `Tool: read_documentation` - "AWS General Guidance"

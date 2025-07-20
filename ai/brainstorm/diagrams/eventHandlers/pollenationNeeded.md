# Pollenation Needed Event Handler

This diagram shows the flow for handling the `pollenationNeeded` event in the Signal9 Advisor system, which involves fetching foundational data from external APIs.

```mermaid
flowchart TD
    A[EVENT: pollenationNeeded] --> B[Lambda: PollenateAsset]
    B --> C[Call AlphaVantage API endpoints to grab foundational data]
    C --> D[For each Asset response, upsert the data in the foundational data tables and then trigger an event stating that analysis is ready for this Asset.]
    D --> E[Foundational Data Tables]
    D --> F[EVENT: analysisNeeded]
    
    %% Remote Data Sources
    subgraph "Remote Data Sources"
        G[COMPANY OVERVIEW]
        H[EARNINGS]
        I[CASH FLOW]
        J[BALANCE SHEET]
        K[INCOME STATEMENT]
        L[EARNINGS CALL SCRIPTS]
    end
    
    %% API Connection
    N[API: AlphaVantage]
    
    %% Connections from data sources to API
    G --> N
    H --> N
    I --> N
    J --> N
    K --> N
    L --> N
    
    %% API to Lambda connection
    N -.HTTPS.-> C
    
    style A fill:#2196F3,stroke:#1976D2,stroke-width:2px,color:#ffffff
    style B fill:#FF9800,stroke:#F57C00,stroke-width:2px,color:#ffffff
    style E fill:#9C27B0,stroke:#7B1FA2,stroke-width:2px,color:#ffffff
    style F fill:#4CAF50,stroke:#388E3C,stroke-width:2px,color:#ffffff
    style N fill:#F44336,stroke:#D32F2F,stroke-width:2px,color:#ffffff
```

## Process Flow

1. **EVENT: pollenationNeeded** - The system receives a trigger that foundational data needs to be collected
2. **Lambda: PollenateAsset** - A Lambda function is invoked to handle the data collection
3. **Call AlphaVantage API** - The function makes HTTPS calls to AlphaVantage API endpoints
4. **Data Sources** - Multiple financial data sources are accessed:
   - Company Overview
   - Earnings data
   - Cash Flow statements
   - Balance Sheet data
   - Income Statement data
   - Earnings Call Scripts
5. **Process and Store** - For each asset response, the data is upserted into foundational data tables
6. **Trigger Analysis** - An `analysisNeeded` event is dispatched for each processed asset
7. **Foundational Data Tables** - Database tables that store the collected financial data

## Notes

- This is a data ingestion process that collects foundational financial data from external APIs
- The process ensures data is properly stored before triggering analysis
- Multiple data sources are consolidated into a single foundational data store
- The system maintains data integrity through upsert operations
- Each asset processed triggers its own analysis event for parallel processing
- News sentiment data is handled separately via the HourlySyncNewsSentiment cron job 
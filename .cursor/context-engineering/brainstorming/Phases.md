# Development Phase Descriptions

> **Note:** The system’s core workflows are implemented using an event-driven architecture, allowing both scheduled and on-demand actions to trigger the same processing pipelines via event dispatch and handling.

## Phase 1. Data Foundation
    - Crons will pollenate Asset data over time, analysis can be performed on an Asset once all Asset data has been collected from AlphaVantage.
    - User authentication, data collection, integrations, and storage. CDK Stack creation, demo dashboard, Asset search and simple asset profile with real data.
    - Dispatch an 'analysisNeeded' event for each Asset after any action updates that Asset's foundational data.
    - Implement foundational event definitions (e.g., `analysisNeeded`, `dataFetched`) to support both scheduled (cron-based) and on-demand (user-triggered) pollenation.
    - Ensure that both batch and real-time pollenation flows dispatch and consume events in a unified manner.

## Phase 2. Simple aggregation
    - Average the Sentiment Rating of the last 5 news item to create an overall sentiment rating and add this to the Asset Profile. Use the rating scale that comes from the AlphaVantage news endpoint. If there are less than 5, provide no rating.

## Phase 3. Statistical Benchmarking
    - Benchmark a company's key financial metrics (P/E Ratio, Revenue Growth, Debt to Equity) against industry peers and historical performance. Display line charts comparing the company to peer averages and percentiles, with clear explanations of peer selection criteria and analysis methodology.

## Phase 4. Predictive Modeling
    - Predict bankruptcy probability within 5 years by analyzing balance sheet trends, working capital changes, and debt service capabilities. A numeric probability rating from 0 to 100 and AI description should be generated and added to the Asset Profile.

## Phase 5. Advanced Financial Analysis
    - Assess the quality of the asset by analyzing depreciation patterns, inventory turnover, and accounts receivable aging. A numeric score from 1 to 100 should be generated and an AI description of the analysis results should be added to the Asset Profile.

## Phase 6. Operational Insights
    - Algorithms will identify cash flow patterns that indicate operational efficiency improvements or deterioration. A text paragraph of notes relating to operational efficiency should be generated and added to the Asset Profile.

## Phase 7. Comprehensive Rating
    - Use the Credit Risk Analysis, Asset Quality Evaluation, Operational Efficiency Overview, and the Sentiment Rating and generate a single aggregate Investment Rating of A+, A, B, C, D, D-, and F.

## Phase Dependencies

- **Phase 1**: Foundation - no dependencies
- **Phase 2**: Depends on Phase 1 news data collection
- **Phase 3**: Depends on Phase 1 financial data collection
- **Phase 4**: Depends on Phase 1 financial data and Phase 3 peer analysis
- **Phase 5**: Depends on Phase 1 financial data collection
- **Phase 6**: Depends on Phase 1 cash flow data collection
- **Phase 7**: Depends on all previous phases (2-6) for component ratings
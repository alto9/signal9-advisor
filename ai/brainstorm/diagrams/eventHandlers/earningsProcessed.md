# Earnings Processed Event Handler

This diagram shows the flow for handling the `earningsProcessed` event in the Signal9 Advisor system.

```mermaid
flowchart TD
    A[EVENT: earningsProcessed] --> B[Lambda: markEarningsProcessed]
    B --> C[Update the row on the earnings calendar so it doesn't get processed twice.]
    C --> D[Table: earningsCalendar]
    
    style A fill:#2196F3,stroke:#1976D2,stroke-width:2px,color:#ffffff
    style B fill:#FF9800,stroke:#F57C00,stroke-width:2px,color:#ffffff
    style D fill:#9C27B0,stroke:#7B1FA2,stroke-width:2px,color:#ffffff
```

## Process Flow

1. **EVENT: earningsProcessed** - The system receives a trigger that earnings have been processed
2. **Lambda: markEarningsProcessed** - A Lambda function is invoked to handle the event
3. **Update earnings calendar** - The function updates the earnings calendar table to prevent duplicate processing
4. **Table: earningsCalendar** - The database table that stores earnings calendar information

## Notes

- This is a simple event handler that prevents duplicate processing of earnings data
- The Lambda function acts as a guard to ensure idempotency
- The earnings calendar table is updated to mark the earnings as processed
- This prevents the same earnings data from being processed multiple times 
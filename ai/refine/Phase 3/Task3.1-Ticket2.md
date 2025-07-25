# Ticket 3.1.2: Event Payload Construction and EventBridge Integration

### Estimate
3 hours

**Status**: Refinement Complete

#### Description
Implement event payload construction and EventBridge integration for the TriggerEarningsPollenation Lambda function. This includes creating pollenationNeeded events with earnings trigger context and earningsProcessed events to prevent duplicate processing, along with proper EventBridge event dispatch logic.

#### Technical Details
- **Implementation Steps**:
  1. Create `src/events/pollenation/` directory structure for event definitions
  2. Implement `PollenationNeededEvent` interface with required fields:
     - assetSymbol: string
     - triggerType: 'earnings' | 'regular'
     - triggerContext: EarningsTriggerContext
     - timestamp: string
     - eventId: string
  3. Create `EarningsTriggerContext` interface with earnings-specific data:
     - earningsDate: string
     - reportType: string
     - earningsId: string
  4. Implement `EarningsProcessedEvent` interface with required fields:
     - assetSymbol: string
     - earningsDate: string
     - earningsId: string
     - processedAt: string
     - eventId: string
  5. Create `EventPayloadBuilder` class for event construction
  6. Implement `buildPollenationNeededEvent(earnings: EarningsRecord): PollenationNeededEvent` method
  7. Create `buildEarningsProcessedEvent(earnings: EarningsRecord): EarningsProcessedEvent` method
  8. Implement `EventBridgeDispatcher` class for event dispatch
  9. Create `dispatchPollenationNeededEvent(event: PollenationNeededEvent): Promise<void>` method
  10. Implement `dispatchEarningsProcessedEvent(event: EarningsProcessedEvent): Promise<void>` method
  11. Create `EventValidation` class for event payload validation
  12. Implement `validatePollenationNeededEvent(event: PollenationNeededEvent): ValidationResult` method
  13. Add comprehensive unit tests for all event scenarios
  14. Create event dispatch monitoring and logging

- **Architecture Considerations**:
  - Event payloads follow established EventBridge patterns
  - Event context includes sufficient data for downstream processing
  - Event validation ensures data integrity before dispatch
  - Event dispatch includes proper error handling and retry logic
  - Event IDs provide traceability for event processing

- **Security Requirements**:
  - Event payloads don't contain sensitive financial data
  - Event validation prevents malicious payload injection
  - Event dispatch uses proper IAM permissions
  - Event IDs are cryptographically secure

- **Performance Requirements**:
  - Event payload construction completes within 100ms per event
  - EventBridge dispatch completes within 500ms per event
  - Event validation completes within 50ms per event
  - Batch event dispatch handles multiple events efficiently

#### Dependencies
- **Prerequisites**:
  - Task3.1-Ticket1: Core Lambda Function Structure and DynamoDB Query Logic
  - EventBridge custom event rules configured
  - EventBridge IAM permissions established
- **Dependent Tickets**:
  - Task3.1-Ticket3: CloudWatch Metrics and Error Handling

#### Testing Requirements
- **Unit Tests**:
  - Test event payload construction with various earnings records
  - Test event validation with valid/invalid payloads
  - Test EventBridge dispatch with mocked EventBridge responses
  - Test batch event dispatch with multiple events
  - Test edge cases: null earnings, invalid dates, missing data
  - Test coverage target: >90%

- **Integration Tests**:
  - Test EventBridge integration with actual event rules
  - Verify event payload structure matches downstream expectations
  - Test event dispatch performance with realistic event volumes

- **Performance Tests**:
  - Measure event payload construction performance (<100ms per event)
  - Test EventBridge dispatch performance (<500ms per event)
  - Verify event validation performance (<50ms per event)

#### Acceptance Criteria
- [ ] pollenationNeeded events dispatched correctly with earnings trigger context
- [ ] earningsProcessed events dispatched correctly to prevent duplicate processing
- [ ] Event payloads include all required data for downstream processing
- [ ] Event validation ensures data integrity before dispatch
- [ ] EventBridge event dispatch handles errors gracefully with retry logic
- [ ] Event IDs provide proper traceability for event processing
- [ ] Batch event dispatch efficiently handles multiple events
- [ ] All unit tests pass with >90% coverage
- [ ] Performance benchmarks met (construction <100ms, dispatch <500ms, validation <50ms)
- [ ] Code review completed
- [ ] Event integration documentation provides clear implementation details

#### Error Handling
- Event payload construction failures are handled gracefully
- EventBridge dispatch failures trigger retry logic
- Event validation errors provide clear error messages
- Invalid event payloads are logged and reported

#### Monitoring and Observability
- Event payload construction success rates and timing
- EventBridge dispatch success rates and performance
- Event validation error rates and types
- Event processing volume and throughput metrics
- Event traceability and correlation tracking

#### Open Questions
- None - all event integration requirements are clear

#### Notes
Focus on creating robust event payload construction and dispatch logic that provides clear context for downstream processing. The events should include sufficient data for the PollenateAsset function to process earnings-triggered assets with appropriate priority and context. Consider that event dispatch may need to handle high-volume scenarios efficiently. 
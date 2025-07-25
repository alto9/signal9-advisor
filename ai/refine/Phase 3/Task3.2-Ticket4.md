# Ticket 3.2.4: EventBridge Integration and CloudWatch Metrics

### Estimate
3 hours

**Status**: Refinement Complete

#### Description
Implement EventBridge event dispatch for pollenationNeeded events with regular trigger context and comprehensive CloudWatch metrics for asset selection and prioritization tracking. This includes batch event processing, regular trigger context, and detailed monitoring for the regular pollination strategy.

#### Technical Details
- **Implementation Steps**:
  1. Create `src/events/regular-pollenation/` directory structure
  2. Implement `RegularPollenationEvent` interface extending PollenationNeededEvent:
     - assetSymbol: string
     - triggerType: 'regular'
     - triggerContext: RegularTriggerContext
     - timestamp: string
     - eventId: string
  3. Create `RegularTriggerContext` interface with regular-specific data:
     - priorityScore: number
     - lastPollenationDate: string
     - tradingVolume: number
     - selectionBatchId: string
  4. Implement `RegularEventPayloadBuilder` class for event construction
  5. Create `buildRegularPollenationEvent(asset: AssetRecord, batchId: string): RegularPollenationEvent` method
  6. Implement `BatchEventDispatcher` class for batch event dispatch
  7. Create `dispatchBatchEvents(events: RegularPollenationEvent[]): Promise<void>` method
  8. Implement `RegularEventValidation` class for event validation
  9. Create `validateRegularPollenationEvent(event: RegularPollenationEvent): ValidationResult` method
  10. Implement `TriggerRegularMetrics` class for CloudWatch metrics
  11. Create `recordAssetSelectionMetrics(selectedCount: number, totalCount: number, selectionTime: number): void` method
  12. Implement `recordPriorityDistributionMetrics(priorityScores: number[]): void` method
  13. Create `recordBatchDispatchMetrics(batchSize: number, dispatchTime: number, success: boolean): void` method
  14. Add comprehensive unit tests for all event and metrics scenarios
  15. Create monitoring dashboard configuration and alerting setup

- **Architecture Considerations**:
  - Event payloads include regular trigger context for downstream processing
  - Batch event dispatch handles multiple events efficiently
  - Event validation ensures data integrity before dispatch
  - CloudWatch metrics provide comprehensive operational visibility
  - Event dispatch includes proper error handling and retry logic

- **Security Requirements**:
  - Event payloads don't contain sensitive financial data
  - Event validation prevents malicious payload injection
  - Event dispatch uses proper IAM permissions
  - Metrics don't expose sensitive operational details

- **Performance Requirements**:
  - Event payload construction completes within 50ms per event
  - EventBridge batch dispatch completes within 1 second per batch
  - Event validation completes within 25ms per event
  - Metrics recording adds <10ms overhead per operation

#### Dependencies
- **Prerequisites**:
  - Task3.2-Ticket1: Core Lambda Function Structure and DynamoDB GSI Query Logic
  - Task3.2-Ticket2: Priority Scoring Algorithm Implementation
  - Task3.2-Ticket3: Asset Selection Logic and Batch Processing
  - EventBridge custom event rules configured
- **Dependent Tasks**:
  - Task 3.3: PollenateAsset Lambda Function Implementation

#### Testing Requirements
- **Unit Tests**:
  - Test event payload construction with various asset records
  - Test batch event dispatch with different batch sizes
  - Test event validation with valid/invalid payloads
  - Test CloudWatch metrics recording with various scenarios
  - Test edge cases: empty batches, null assets, invalid data
  - Test coverage target: >90%

- **Integration Tests**:
  - Test EventBridge integration with actual event rules
  - Verify event payload structure matches downstream expectations
  - Test batch dispatch performance with realistic event volumes

- **Performance Tests**:
  - Measure event payload construction performance (<50ms per event)
  - Test EventBridge batch dispatch performance (<1 second per batch)
  - Verify event validation performance (<25ms per event)
  - Test metrics recording overhead (<10ms per operation)

#### Acceptance Criteria
- [ ] pollenationNeeded events dispatched correctly with regular trigger context
- [ ] Batch event dispatch efficiently handles multiple events
- [ ] Event payloads include all required data for downstream processing
- [ ] Event validation ensures data integrity before dispatch
- [ ] EventBridge batch processing handles multiple events efficiently
- [ ] CloudWatch metrics provide comprehensive visibility into selection process
- [ ] Metrics include asset selection volume, priority distribution, and dispatch success
- [ ] All unit tests pass with >90% coverage
- [ ] Performance benchmarks met (construction <50ms, dispatch <1s, validation <25ms, metrics <10ms)
- [ ] Code review completed
- [ ] Event integration and metrics documentation provides clear implementation details

#### Error Handling
- Event payload construction failures are handled gracefully
- EventBridge batch dispatch failures trigger retry logic
- Event validation errors provide clear error messages
- Metrics recording failures don't impact event processing

#### Monitoring and Observability
- Asset selection volume and success rates
- Priority score distribution across selected assets
- Batch dispatch performance and success rates
- Event processing volume and throughput metrics
- Selection process timing and efficiency metrics
- Operational alerting for critical failures and performance issues

#### Open Questions
- None - all event integration and metrics requirements are clear

#### Notes
Focus on creating robust event dispatch and comprehensive monitoring that provides clear operational visibility for the regular pollination strategy. The events should include sufficient context for the PollenateAsset function to process regular-triggered assets with appropriate priority and context. Consider that batch event dispatch may need to handle high-volume scenarios efficiently while maintaining reliable delivery. 
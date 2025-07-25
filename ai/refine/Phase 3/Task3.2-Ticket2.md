# Ticket 3.2.2: Priority Scoring Algorithm Implementation

### Estimate
3 hours

**Status**: Refinement Complete

#### Description
Implement the priority scoring algorithm that combines trading volume and data staleness to determine which assets should be prioritized for regular pollination. This algorithm will balance high-volume assets with those that have the oldest lastPollenationDate to optimize data freshness across the asset universe.

#### Technical Details
- **Implementation Steps**:
  1. Create `src/algorithms/priority-scoring/` directory structure
  2. Implement `PriorityScoringAlgorithm` class for asset prioritization
  3. Create `calculatePriorityScore(asset: AssetRecord): number` method
  4. Implement `PriorityScoreConfig` interface with configurable parameters:
     - volumeWeight: number (0.0-1.0, default 0.6)
     - stalenessWeight: number (0.0-1.0, default 0.4)
     - maxStalenessDays: number (default 30)
     - volumeNormalizationFactor: number (default 1000000)
  5. Create `VolumeScorer` class for volume-based scoring
  6. Implement `calculateVolumeScore(volume: number, maxVolume: number): number` method
  7. Create `StalenessScorer` class for data age scoring
  8. Implement `calculateStalenessScore(lastPollenationDate: string, maxAgeDays: number): number` method
  9. Create `ScoreNormalizer` class for score normalization
  10. Implement `normalizeScore(score: number, minScore: number, maxScore: number): number` method
  11. Create `PriorityScoreValidator` class for score validation
  12. Implement `validatePriorityScore(score: number, asset: AssetRecord): ValidationResult` method
  13. Add comprehensive unit tests for all scoring scenarios
  14. Create scoring performance monitoring and logging

- **Architecture Considerations**:
  - Priority scoring algorithm is configurable and extensible
  - Volume and staleness scores are normalized to 0-1 range
  - Weighted combination provides balanced prioritization
  - Algorithm handles edge cases (zero volume, very old data)
  - Scoring results are deterministic and reproducible

- **Security Requirements**:
  - Scoring algorithm doesn't expose sensitive financial data
  - Score calculations are validated to prevent manipulation
  - Algorithm parameters are sanitized and validated

- **Performance Requirements**:
  - Priority score calculation completes within 10ms per asset
  - Batch scoring of 1000 assets completes within 10 seconds
  - Score normalization completes within 5ms per score
  - Memory usage remains constant regardless of asset count

#### Dependencies
- **Prerequisites**:
  - Task3.2-Ticket1: Core Lambda Function Structure and DynamoDB GSI Query Logic
- **Dependent Tickets**:
  - Task3.2-Ticket3: Asset Selection Logic and Batch Processing
  - Task3.2-Ticket4: EventBridge Integration and CloudWatch Metrics

#### Testing Requirements
- **Unit Tests**:
  - Test priority score calculation with various volume/staleness combinations
  - Test volume scoring with different volume ranges and normalization
  - Test staleness scoring with various date ranges and age thresholds
  - Test score normalization with different score distributions
  - Test edge cases: zero volume, very old data, null values
  - Test algorithm configurability with different weight combinations
  - Test coverage target: >90%

- **Integration Tests**:
  - Test priority scoring with actual asset data from DynamoDB
  - Verify scoring algorithm performance with realistic asset volumes
  - Test scoring integration with asset filtering logic

- **Performance Tests**:
  - Measure priority score calculation performance (<10ms per asset)
  - Test batch scoring performance (1000 assets <10 seconds)
  - Verify score normalization performance (<5ms per score)

#### Acceptance Criteria
- [ ] Priority scoring algorithm correctly balances trading volume and data staleness
- [ ] Volume scoring properly normalizes trading volumes across different ranges
- [ ] Staleness scoring accurately reflects data age relative to maximum age
- [ ] Score normalization ensures consistent 0-1 score ranges
- [ ] Algorithm is configurable with different weight combinations
- [ ] Priority scores are deterministic and reproducible
- [ ] Algorithm handles edge cases gracefully
- [ ] All unit tests pass with >90% coverage
- [ ] Performance benchmarks met (calculation <10ms, batch <10s, normalization <5ms)
- [ ] Code review completed
- [ ] Algorithm documentation provides clear implementation details

#### Error Handling
- Invalid asset data triggers appropriate error handling
- Score calculation failures provide clear error messages
- Algorithm parameter validation prevents invalid configurations
- Edge cases are handled gracefully with fallback values

#### Monitoring and Observability
- Priority score calculation performance metrics
- Score distribution statistics across asset universe
- Volume and staleness score component analysis
- Algorithm configuration effectiveness tracking
- Score calculation error rates and types

#### Open Questions
- None - all priority scoring requirements are clear

#### Notes
Focus on creating a robust, configurable priority scoring algorithm that provides balanced asset prioritization. The algorithm should be efficient enough to handle large asset datasets while providing meaningful differentiation between assets. Consider that the algorithm may need to be tuned based on actual usage patterns and business requirements. 
# Ticket 2.3.2: News Filtering, Sentiment Validation, and Asset Association

### Estimate
4 hours

**Status**: Refinement Complete

#### Description
Implement logic to filter news articles to only those mentioning tracked assets, validate sentiment scores, and map news to asset symbols.

#### Technical Details
- **Implementation Steps:**
  1. Implement news filtering logic to include only articles mentioning tracked asset symbols (cross-reference with assets table).
  2. Validate sentiment scores for range and format compliance.
  3. Normalize and map sentiment scores to a standard format.
  4. Map news articles to associated asset symbols for storage.
  5. Implement deduplication logic for articles mentioning multiple assets.
  6. Add metrics and logging for filtering and validation results.

- **Dependencies:**
  - Task 2.1 (SyncAssets Lambda) for asset symbol list
  - Task 2.3.1 (core function)

- **Testing Requirements:**
  - Test filtering logic with various news and asset symbol scenarios
  - Test sentiment score validation and normalization
  - Test asset association mapping and deduplication
  - Coverage >95%

- **Acceptance Criteria:**
  - Only news mentioning tracked assets are processed
  - Sentiment scores are validated and normalized
  - News is correctly associated with asset symbols
  - Deduplication logic prevents duplicate storage 
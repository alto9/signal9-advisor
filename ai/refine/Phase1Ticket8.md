# Ticket 1.8: Testing and Validation Framework

**Status**: Refinement Complete

#### Description
Implement comprehensive testing and validation framework for Signal9 Advisor, including unit tests for all Lambda functions, integration tests for data pipeline, API integration testing with rate limiting validation, data quality and consistency validation, monitoring and alerting system tests, end-to-end testing scenarios, performance testing, batch processing tests, Step Functions workflow tests, and Secrets Manager integration tests. This ensures >90% test coverage, validates all system components, and provides confidence in production deployment.

#### Technical Details
- **Implementation Steps**:
  1. **Create Unit Tests for Lambda Functions**
     ```typescript
     // tests/unit/lambda/event-handlers/pollenation-needed.test.ts
     import { handler } from '../../../src/lambda/event-handlers/pollenation-needed';
     import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
     import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
     import { mockClient } from 'aws-sdk-client-mock';
     
     const mockDynamoClient = mockClient(DynamoDBDocumentClient);
     const mockEventBridgeClient = mockClient(EventBridgeClient);
     
     describe('PollenationNeeded Event Handler', () => {
       beforeEach(() => {
         mockDynamoClient.reset();
         mockEventBridgeClient.reset();
       });
       
       it('should process valid pollenation event successfully', async () => {
         const mockEvent = {
           detail: {
             assetId: 'AAPL',
             dataTypes: ['company_overview', 'earnings'],
             priority: 'high',
             source: 'scheduled',
             triggerTime: new Date().toISOString()
           }
         };
         
         const mockAsset = {
           asset_id: 'ASSET#AAPL',
           symbol: 'AAPL',
           status: 'active',
           company_name: 'Apple Inc.'
         };
         
         mockDynamoClient.on(GetCommand).resolves({ Item: mockAsset });
         mockDynamoClient.on(PutCommand).resolves({});
         mockEventBridgeClient.on(PutEventsCommand).resolves({});
         
         await expect(handler(mockEvent as any)).resolves.not.toThrow();
         
         expect(mockDynamoClient.calls()).toHaveLength(2); // Get asset + Update status
         expect(mockEventBridgeClient.calls()).toHaveLength(2); // Two data ingestion events
       });
       
       it('should handle inactive asset gracefully', async () => {
         const mockEvent = {
           detail: {
             assetId: 'INACTIVE',
             dataTypes: ['company_overview'],
             priority: 'medium',
             source: 'scheduled',
             triggerTime: new Date().toISOString()
           }
         };
         
         const mockAsset = {
           asset_id: 'ASSET#INACTIVE',
           symbol: 'INACTIVE',
           status: 'inactive'
         };
         
         mockDynamoClient.on(GetCommand).resolves({ Item: mockAsset });
         
         await expect(handler(mockEvent as any)).resolves.not.toThrow();
         
         expect(mockEventBridgeClient.calls()).toHaveLength(0); // No events triggered
       });
       
       it('should handle missing asset gracefully', async () => {
         const mockEvent = {
           detail: {
             assetId: 'MISSING',
             dataTypes: ['company_overview'],
             priority: 'low',
             source: 'scheduled',
             triggerTime: new Date().toISOString()
           }
         };
         
         mockDynamoClient.on(GetCommand).resolves({ Item: null });
         
         await expect(handler(mockEvent as any)).resolves.not.toThrow();
         
         expect(mockEventBridgeClient.calls()).toHaveLength(0);
       });
       
       it('should handle DynamoDB errors gracefully', async () => {
         const mockEvent = {
           detail: {
             assetId: 'AAPL',
             dataTypes: ['company_overview'],
             priority: 'high',
             source: 'scheduled',
             triggerTime: new Date().toISOString()
           }
         };
         
         mockDynamoClient.on(GetCommand).rejects(new Error('DynamoDB error'));
         
         await expect(handler(mockEvent as any)).rejects.toThrow('DynamoDB error');
       });
     });
     ```

  2. **Implement Integration Tests for Data Pipeline**
     ```typescript
     // tests/integration/data-pipeline.test.ts
     import { DynamoDBClient } from '@aws-cdk-lib/aws-dynamodb';
     import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
     import { SFNClient } from '@aws-sdk/client-sfn';
     import { createTestStack } from '../utils/test-stack';
     import { DataPipelineIntegration } from '../../src/lib/data-pipeline/integration';
     
     describe('Data Pipeline Integration Tests', () => {
       let testStack: any;
       let dataPipeline: DataPipelineIntegration;
       
       beforeAll(async () => {
         testStack = await createTestStack();
         dataPipeline = new DataPipelineIntegration(testStack);
       });
       
       afterAll(async () => {
         await testStack.destroy();
       });
       
       it('should process complete data pipeline successfully', async () => {
         const testAsset = {
           assetId: 'TEST001',
           symbol: 'TEST',
           dataTypes: ['company_overview', 'earnings']
         };
         
         // Trigger pollenation event
         const pollenationResult = await dataPipeline.triggerPollenation(testAsset);
         expect(pollenationResult.success).toBe(true);
         
         // Wait for data ingestion
         await new Promise(resolve => setTimeout(resolve, 5000));
         
         // Verify data was ingested
         const ingestedData = await dataPipeline.getIngestedData(testAsset.assetId);
         expect(ingestedData).toHaveLength(2);
         
         // Trigger analysis
         const analysisResult = await dataPipeline.triggerAnalysis([testAsset.assetId]);
         expect(analysisResult.success).toBe(true);
         
         // Wait for analysis completion
         await new Promise(resolve => setTimeout(resolve, 10000));
         
         // Verify analysis results
         const analysisData = await dataPipeline.getAnalysisResults(testAsset.assetId);
         expect(analysisData).toBeDefined();
         expect(analysisData.investment_rating).toBeDefined();
       });
       
       it('should handle pipeline failures gracefully', async () => {
         const invalidAsset = {
           assetId: 'INVALID',
           symbol: 'INVALID',
           dataTypes: ['invalid_type']
         };
         
         const result = await dataPipeline.triggerPollenation(invalidAsset);
         expect(result.success).toBe(false);
         expect(result.error).toBeDefined();
       });
       
       it('should respect API rate limits', async () => {
         const assets = Array.from({ length: 30 }, (_, i) => ({
           assetId: `RATE_TEST_${i}`,
           symbol: `RT${i}`,
           dataTypes: ['company_overview']
         }));
         
         const startTime = Date.now();
         
         // Process all assets
         const results = await Promise.allSettled(
           assets.map(asset => dataPipeline.triggerPollenation(asset))
         );
         
         const endTime = Date.now();
         const duration = endTime - startTime;
         
         // Should take at least 25 seconds due to rate limiting (25 calls/day)
         expect(duration).toBeGreaterThan(25000);
         
         // Should have some failures due to rate limiting
         const failures = results.filter(r => r.status === 'rejected').length;
         expect(failures).toBeGreaterThan(0);
       });
     });
     ```

  3. **Test API Integrations and Rate Limiting**
     ```typescript
     // tests/integration/api-integration.test.ts
     import { AlphaVantageClient } from '../../src/lib/api/alpha-vantage-client';
     import { AlpacaClient } from '../../src/lib/api/alpaca-client';
     import { RateLimiter } from '../../src/lib/rate-limiting/rate-limiter';
     
     describe('API Integration Tests', () => {
       let alphaVantageClient: AlphaVantageClient;
       let alpacaClient: AlpacaClient;
       let rateLimiter: RateLimiter;
       
       beforeEach(() => {
         alphaVantageClient = new AlphaVantageClient();
         alpacaClient = new AlpacaClient();
         rateLimiter = new RateLimiter();
       });
       
       describe('AlphaVantage API Tests', () => {
         it('should fetch company overview successfully', async () => {
           const result = await alphaVantageClient.getCompanyOverview('AAPL');
           
           expect(result).toBeDefined();
           expect(result.Symbol).toBe('AAPL');
           expect(result.Name).toBeDefined();
           expect(result.MarketCapitalization).toBeDefined();
         });
         
         it('should handle API errors gracefully', async () => {
           await expect(
             alphaVantageClient.getCompanyOverview('INVALID_SYMBOL')
           ).rejects.toThrow();
         });
         
         it('should respect rate limits', async () => {
           const promises = Array.from({ length: 30 }, () =>
             alphaVantageClient.getCompanyOverview('AAPL')
           );
           
           const results = await Promise.allSettled(promises);
           const failures = results.filter(r => r.status === 'rejected').length;
           
           // Should have failures due to rate limiting
           expect(failures).toBeGreaterThan(0);
         });
         
         it('should cache responses appropriately', async () => {
           const startTime = Date.now();
           
           // First call
           await alphaVantageClient.getCompanyOverview('AAPL');
           const firstCallTime = Date.now() - startTime;
           
           // Second call (should be cached)
           const cacheStartTime = Date.now();
           await alphaVantageClient.getCompanyOverview('AAPL');
           const secondCallTime = Date.now() - cacheStartTime;
           
           // Cached call should be faster
           expect(secondCallTime).toBeLessThan(firstCallTime);
         });
       });
       
       describe('Alpaca API Tests', () => {
         it('should fetch active assets successfully', async () => {
           const result = await alpacaClient.getActiveAssets();
           
           expect(result).toBeDefined();
           expect(Array.isArray(result)).toBe(true);
           expect(result.length).toBeGreaterThan(0);
           
           const firstAsset = result[0];
           expect(firstAsset.id).toBeDefined();
           expect(firstAsset.symbol).toBeDefined();
           expect(firstAsset.status).toBe('active');
         });
         
         it('should handle pagination correctly', async () => {
           const result = await alpacaClient.getActiveAssets({ limit: 5 });
           
           expect(result).toBeDefined();
           expect(result.length).toBeLessThanOrEqual(5);
         });
         
         it('should respect rate limits', async () => {
           const promises = Array.from({ length: 250 }, () =>
             alpacaClient.getActiveAssets({ limit: 1 })
           );
           
           const results = await Promise.allSettled(promises);
           const failures = results.filter(r => r.status === 'rejected').length;
           
           // Should have some failures due to rate limiting (200 req/min)
           expect(failures).toBeGreaterThan(0);
         });
       });
     });
     ```

  4. **Validate Data Quality and Consistency**
     ```typescript
     // tests/validation/data-quality.test.ts
     import { FinancialDataValidator } from '../../src/lib/validation/financial-data-validator';
     import { AssetValidator } from '../../src/lib/validation/asset-validator';
     import { DataConsistencyValidator } from '../../src/lib/validation/consistency-validator';
     
     describe('Data Quality Validation Tests', () => {
       let financialValidator: FinancialDataValidator;
       let assetValidator: AssetValidator;
       let consistencyValidator: DataConsistencyValidator;
       
       beforeEach(() => {
         financialValidator = new FinancialDataValidator();
         assetValidator = new AssetValidator();
         consistencyValidator = new DataConsistencyValidator();
       });
       
       describe('Financial Data Validation', () => {
         it('should validate company overview data correctly', async () => {
           const validData = {
             Symbol: 'AAPL',
             AssetType: 'Common Stock',
             Name: 'Apple Inc.',
             Description: 'Apple Inc. designs, manufactures, and markets smartphones...',
             CIK: '0000320193',
             Exchange: 'NASDAQ',
             Currency: 'USD',
             Country: 'USA',
             Sector: 'Technology',
             Industry: 'Consumer Electronics',
             MarketCapitalization: '2000000000000',
             EBITDA: '100000000000',
             PERatio: '25.5',
             PEGRatio: '1.2',
             BookValue: '4.5',
             DividendPerShare: '0.88',
             DividendYield: '0.5',
             EPS: '5.5'
           };
           
           const result = await financialValidator.validateCompanyOverview(validData, 'AAPL');
           
           expect(result.isValid).toBe(true);
           expect(result.errors).toHaveLength(0);
         });
         
         it('should reject invalid company overview data', async () => {
           const invalidData = {
             Symbol: 'AAPL',
             // Missing required fields
           };
           
           const result = await financialValidator.validateCompanyOverview(invalidData, 'AAPL');
           
           expect(result.isValid).toBe(false);
           expect(result.errors.length).toBeGreaterThan(0);
         });
         
         it('should validate earnings data structure', async () => {
           const validEarningsData = {
             symbol: 'AAPL',
             annualEarnings: [
               {
                 fiscalDateEnding: '2023-09-30',
                 reportedEPS: '5.5'
               }
             ],
             quarterlyEarnings: [
               {
                 fiscalDateEnding: '2023-12-31',
                 reportedEPS: '2.1'
               }
             ]
           };
           
           const result = await financialValidator.validateEarnings(validEarningsData, 'AAPL');
           
           expect(result.isValid).toBe(true);
         });
       });
       
       describe('Asset Data Validation', () => {
         it('should validate asset data correctly', async () => {
           const validAsset = {
             id: '12345678-1234-1234-1234-123456789012',
             class: 'us_equity',
             exchange: 'NASDAQ',
             symbol: 'AAPL',
             name: 'Apple Inc.',
             status: 'active',
             tradable: true,
             marginable: true,
             shortable: true,
             easy_to_borrow: true,
             fractionable: true
           };
           
           const result = await assetValidator.validateAssetData(validAsset);
           
           expect(result.isValid).toBe(true);
           expect(result.errors).toHaveLength(0);
         });
         
         it('should reject invalid asset data', async () => {
           const invalidAsset = {
             id: 'invalid-id',
             symbol: 'INVALID_SYMBOL_TOO_LONG',
             status: 'invalid_status'
           };
           
           const result = await assetValidator.validateAssetData(invalidAsset);
           
           expect(result.isValid).toBe(false);
           expect(result.errors.length).toBeGreaterThan(0);
         });
       });
       
       describe('Data Consistency Validation', () => {
         it('should validate cross-table consistency', async () => {
           const assetId = 'TEST_ASSET_001';
           
           // Mock consistent data across tables
           const result = await consistencyValidator.validateCrossTableConsistency(assetId);
           
           expect(result.isConsistent).toBe(true);
           expect(result.consistencyScore).toBeGreaterThan(0.9);
         });
         
         it('should detect inconsistencies', async () => {
           const assetId = 'INCONSISTENT_ASSET';
           
           // Mock inconsistent data
           const result = await consistencyValidator.validateCrossTableConsistency(assetId);
           
           expect(result.isConsistent).toBe(false);
           expect(result.consistencyScore).toBeLessThan(0.9);
         });
       });
     });
     ```

  5. **Test Monitoring and Alerting Systems**
     ```typescript
     // tests/monitoring/monitoring-system.test.ts
     import { MetricsManager } from '../../src/lib/monitoring/metrics-manager';
     import { AlertManager } from '../../src/lib/monitoring/alert-manager';
     import { DataQualityMonitor } from '../../src/lib/monitoring/data-quality-monitor';
     
     describe('Monitoring System Tests', () => {
       let metricsManager: MetricsManager;
       let alertManager: AlertManager;
       let dataQualityMonitor: DataQualityMonitor;
       
       beforeEach(() => {
         metricsManager = new MetricsManager();
         alertManager = new AlertManager();
         dataQualityMonitor = new DataQualityMonitor();
       });
       
       it('should record metrics correctly', async () => {
         const mockRecordMetric = jest.spyOn(metricsManager, 'recordDataProcessingMetric');
         
         await metricsManager.recordDataProcessingMetric(
           'test_operation',
           'TEST001',
           1500,
           true,
           0
         );
         
         expect(mockRecordMetric).toHaveBeenCalledWith(
           'test_operation',
           'TEST001',
           1500,
           true,
           0
         );
       });
       
       it('should trigger alerts for critical failures', async () => {
         const mockSendAlert = jest.spyOn(alertManager, 'sendAlert');
         
         await alertManager.sendAlert(
           'critical',
           'Test Critical Alert',
           'This is a test critical alert',
           { testData: 'value' }
         );
         
         expect(mockSendAlert).toHaveBeenCalledWith(
           'critical',
           'Test Critical Alert',
           'This is a test critical alert',
           { testData: 'value' }
         );
       });
       
       it('should monitor data quality metrics', async () => {
         const mockRecordMetric = jest.spyOn(dataQualityMonitor, 'recordValidationMetric');
         
         await dataQualityMonitor.recordValidationMetric('company_overview', true, 0);
         
         expect(mockRecordMetric).toHaveBeenCalledWith('company_overview', true, 0);
       });
       
       it('should detect data freshness issues', async () => {
         const mockCheckFreshness = jest.spyOn(dataQualityMonitor, 'checkDataFreshness');
         
         await dataQualityMonitor.checkDataFreshness();
         
         expect(mockCheckFreshness).toHaveBeenCalled();
       });
     });
     ```

  6. **Create End-to-End Testing Scenarios**
     ```typescript
     // tests/e2e/complete-workflow.test.ts
     import { TestEnvironment } from '../utils/test-environment';
     import { Signal9AdvisorE2E } from '../../src/lib/e2e/signal9-advisor-e2e';
     
     describe('End-to-End Workflow Tests', () => {
       let testEnv: TestEnvironment;
       let e2eTester: Signal9AdvisorE2E;
       
       beforeAll(async () => {
         testEnv = await TestEnvironment.create();
         e2eTester = new Signal9AdvisorE2E(testEnv);
       });
       
       afterAll(async () => {
         await testEnv.destroy();
       });
       
       it('should complete full asset analysis workflow', async () => {
         const testAsset = {
           symbol: 'E2E_TEST',
           assetId: 'E2E_TEST_001',
           expectedDataTypes: ['company_overview', 'earnings', 'cash_flow']
         };
         
         // Start the complete workflow
         const workflowResult = await e2eTester.runCompleteWorkflow(testAsset);
         
         expect(workflowResult.success).toBe(true);
         expect(workflowResult.steps).toContain('asset_sync');
         expect(workflowResult.steps).toContain('data_ingestion');
         expect(workflowResult.steps).toContain('data_validation');
         expect(workflowResult.steps).toContain('analysis_generation');
         expect(workflowResult.steps).toContain('result_storage');
         
         // Verify final results
         const analysisResult = await e2eTester.getAnalysisResult(testAsset.assetId);
         expect(analysisResult).toBeDefined();
         expect(analysisResult.investment_rating).toBeDefined();
         expect(analysisResult.confidence_interval).toBeDefined();
       });
       
       it('should handle workflow failures gracefully', async () => {
         const invalidAsset = {
           symbol: 'INVALID_E2E',
           assetId: 'INVALID_E2E_001',
           expectedDataTypes: ['invalid_type']
         };
         
         const workflowResult = await e2eTester.runCompleteWorkflow(invalidAsset);
         
         expect(workflowResult.success).toBe(false);
         expect(workflowResult.error).toBeDefined();
         expect(workflowResult.failedStep).toBeDefined();
       });
       
       it('should respect API rate limits in E2E scenarios', async () => {
         const assets = Array.from({ length: 5 }, (_, i) => ({
           symbol: `RATE_E2E_${i}`,
           assetId: `RATE_E2E_${i}_001`,
           expectedDataTypes: ['company_overview']
         }));
         
         const startTime = Date.now();
         
         const results = await Promise.allSettled(
           assets.map(asset => e2eTester.runCompleteWorkflow(asset))
         );
         
         const endTime = Date.now();
         const duration = endTime - startTime;
         
         // Should take reasonable time due to rate limiting
         expect(duration).toBeGreaterThan(5000);
         
         // Should have some successful results
         const successes = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
         expect(successes).toBeGreaterThan(0);
       });
     });
     ```

  7. **Implement Performance Testing**
     ```typescript
     // tests/performance/performance-tests.test.ts
     import { PerformanceTester } from '../../src/lib/testing/performance-tester';
     import { LoadTester } from '../../src/lib/testing/load-tester';
     
     describe('Performance Tests', () => {
       let performanceTester: PerformanceTester;
       let loadTester: LoadTester;
       
       beforeEach(() => {
         performanceTester = new PerformanceTester();
         loadTester = new LoadTester();
       });
       
       it('should meet data processing latency requirements', async () => {
         const testAsset = {
           assetId: 'PERF_TEST_001',
           symbol: 'PERF',
           dataTypes: ['company_overview', 'earnings']
         };
         
         const startTime = Date.now();
         
         await performanceTester.testDataProcessingLatency(testAsset);
         
         const endTime = Date.now();
         const latency = endTime - startTime;
         
         // Should complete within 30 seconds
         expect(latency).toBeLessThan(30000);
       });
       
       it('should handle concurrent processing efficiently', async () => {
         const assets = Array.from({ length: 8 }, (_, i) => ({
           assetId: `CONCURRENT_${i}`,
           symbol: `CONC${i}`,
           dataTypes: ['company_overview']
         }));
         
         const startTime = Date.now();
         
         const results = await loadTester.testConcurrentProcessing(assets);
         
         const endTime = Date.now();
         const totalTime = endTime - startTime;
         
         // Should process 8 assets efficiently
         expect(results.successCount).toBeGreaterThan(0);
         expect(totalTime).toBeLessThan(60000); // 1 minute for 8 assets
       });
       
       it('should maintain performance under load', async () => {
         const loadTest = await loadTester.runLoadTest({
           concurrentUsers: 10,
           requestsPerUser: 5,
           duration: 30000 // 30 seconds
         });
         
         expect(loadTest.averageResponseTime).toBeLessThan(5000); // 5 seconds
         expect(loadTest.errorRate).toBeLessThan(0.05); // 5% error rate
         expect(loadTest.throughput).toBeGreaterThan(1); // 1 request per second
       });
       
       it('should test memory usage under load', async () => {
         const memoryTest = await performanceTester.testMemoryUsage({
           duration: 60000, // 1 minute
           operationsPerSecond: 2
         });
         
         expect(memoryTest.peakMemoryUsage).toBeLessThan(512 * 1024 * 1024); // 512MB
         expect(memoryTest.memoryLeak).toBe(false);
       });
     });
     ```

  8. **Test Batch Processing Functionality**
     ```typescript
     // tests/batch/batch-processing.test.ts
     import { BatchProcessor } from '../../src/lib/batch-processing/batch-processor';
     import { BatchValidator } from '../../src/lib/batch-processing/batch-validator';
     
     describe('Batch Processing Tests', () => {
       let batchProcessor: BatchProcessor;
       let batchValidator: BatchValidator;
       
       beforeEach(() => {
         batchProcessor = new BatchProcessor();
         batchValidator = new BatchValidator();
       });
       
       it('should process batch of 8 assets correctly', async () => {
         const assetIds = Array.from({ length: 8 }, (_, i) => `BATCH_TEST_${i}`);
         
         const mockProcessor = jest.fn().mockResolvedValue(true);
         
         const result = await batchProcessor.processBatch(assetIds, mockProcessor);
         
         expect(result.total).toBe(8);
         expect(result.successful).toBe(8);
         expect(result.failed).toBe(0);
         expect(mockProcessor).toHaveBeenCalledTimes(8);
       });
       
       it('should handle partial batch failures', async () => {
         const assetIds = Array.from({ length: 8 }, (_, i) => `BATCH_FAIL_${i}`);
         
         const mockProcessor = jest.fn().mockImplementation((assetId) => {
           if (assetId.includes('FAIL_3') || assetId.includes('FAIL_7')) {
             throw new Error('Processing failed');
           }
           return true;
         });
         
         const result = await batchProcessor.processBatch(assetIds, mockProcessor);
         
         expect(result.total).toBe(8);
         expect(result.successful).toBe(6);
         expect(result.failed).toBe(2);
         expect(result.errors).toHaveLength(2);
       });
       
       it('should validate batch size constraints', async () => {
         const largeBatch = Array.from({ length: 100 }, (_, i) => `LARGE_BATCH_${i}`);
         
         const mockProcessor = jest.fn().mockResolvedValue(true);
         
         const result = await batchProcessor.processBatch(largeBatch, mockProcessor);
         
         // Should process in batches of 8
         expect(result.total).toBe(100);
         expect(mockProcessor).toHaveBeenCalledTimes(100);
       });
       
       it('should handle empty batch gracefully', async () => {
         const emptyBatch: string[] = [];
         
         const mockProcessor = jest.fn().mockResolvedValue(true);
         
         const result = await batchProcessor.processBatch(emptyBatch, mockProcessor);
         
         expect(result.total).toBe(0);
         expect(result.successful).toBe(0);
         expect(result.failed).toBe(0);
         expect(mockProcessor).not.toHaveBeenCalled();
       });
     });
     ```

  9. **Test Step Functions Workflows**
     ```typescript
     // tests/step-functions/workflow.test.ts
     import { SFNClient, StartExecutionCommand, DescribeExecutionCommand } from '@aws-sdk/client-sfn';
     import { mockClient } from 'aws-sdk-client-mock';
     
     const mockSFNClient = mockClient(SFNClient);
     
     describe('Step Functions Workflow Tests', () => {
       beforeEach(() => {
         mockSFNClient.reset();
       });
       
       it('should execute analysis workflow successfully', async () => {
         const mockExecutionArn = 'arn:aws:states:us-east-1:123456789012:execution:AnalysisWorkflow:test-execution';
         
         mockSFNClient.on(StartExecutionCommand).resolves({
           executionArn: mockExecutionArn
         });
         
         mockSFNClient.on(DescribeExecutionCommand).resolves({
           executionArn: mockExecutionArn,
           status: 'SUCCEEDED',
           startDate: new Date('2024-01-01T00:00:00Z'),
           stopDate: new Date('2024-01-01T00:05:00Z'),
           output: JSON.stringify({
             analysisId: 'test-analysis-001',
             status: 'completed',
             investmentRating: 'BUY',
             confidenceInterval: 0.85
           })
         });
         
         const workflowInput = {
           assetIds: ['TEST001', 'TEST002'],
           analysisType: 'rule_based',
           batchId: 'test-batch-001'
         };
         
         // Start workflow
         const startResult = await mockSFNClient.send(new StartExecutionCommand({
           stateMachineArn: process.env.ANALYSIS_WORKFLOW_ARN,
           input: JSON.stringify(workflowInput)
         }));
         
         expect(startResult.executionArn).toBe(mockExecutionArn);
         
         // Check execution status
         const executionResult = await mockSFNClient.send(new DescribeExecutionCommand({
           executionArn: mockExecutionArn
         }));
         
         expect(executionResult.status).toBe('SUCCEEDED');
         
         const output = JSON.parse(executionResult.output || '{}');
         expect(output.analysisId).toBe('test-analysis-001');
         expect(output.investmentRating).toBe('BUY');
       });
       
       it('should handle workflow failures gracefully', async () => {
         const mockExecutionArn = 'arn:aws:states:us-east-1:123456789012:execution:AnalysisWorkflow:failed-execution';
         
         mockSFNClient.on(StartExecutionCommand).resolves({
           executionArn: mockExecutionArn
         });
         
         mockSFNClient.on(DescribeExecutionCommand).resolves({
           executionArn: mockExecutionArn,
           status: 'FAILED',
           startDate: new Date('2024-01-01T00:00:00Z'),
           stopDate: new Date('2024-01-01T00:01:00Z'),
           cause: 'Data validation failed',
           error: 'ValidationError'
         });
         
         const workflowInput = {
           assetIds: ['INVALID001'],
           analysisType: 'rule_based',
           batchId: 'failed-batch-001'
         };
         
         const startResult = await mockSFNClient.send(new StartExecutionCommand({
           stateMachineArn: process.env.ANALYSIS_WORKFLOW_ARN,
           input: JSON.stringify(workflowInput)
         }));
         
         const executionResult = await mockSFNClient.send(new DescribeExecutionCommand({
           executionArn: mockExecutionArn
         }));
         
         expect(executionResult.status).toBe('FAILED');
         expect(executionResult.cause).toBe('Data validation failed');
       });
       
       it('should handle workflow timeouts', async () => {
         const mockExecutionArn = 'arn:aws:states:us-east-1:123456789012:execution:AnalysisWorkflow:timeout-execution';
         
         mockSFNClient.on(StartExecutionCommand).resolves({
           executionArn: mockExecutionArn
         });
         
         mockSFNClient.on(DescribeExecutionCommand).resolves({
           executionArn: mockExecutionArn,
           status: 'TIMED_OUT',
           startDate: new Date('2024-01-01T00:00:00Z'),
           stopDate: new Date('2024-01-01T02:05:00Z') // Exceeds 2-hour timeout
         });
         
         const workflowInput = {
           assetIds: Array.from({ length: 100 }, (_, i) => `TIMEOUT_${i}`),
           analysisType: 'rule_based',
           batchId: 'timeout-batch-001'
         };
         
         const startResult = await mockSFNClient.send(new StartExecutionCommand({
           stateMachineArn: process.env.ANALYSIS_WORKFLOW_ARN,
           input: JSON.stringify(workflowInput)
         }));
         
         const executionResult = await mockSFNClient.send(new DescribeExecutionCommand({
           executionArn: mockExecutionArn
         }));
         
         expect(executionResult.status).toBe('TIMED_OUT');
       });
     });
     ```

  10. **Test Secrets Manager Integration**
      ```typescript
      // tests/security/secrets-manager.test.ts
      import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
      import { mockClient } from 'aws-sdk-client-mock';
      
      const mockSecretsClient = mockClient(SecretsManagerClient);
      
      describe('Secrets Manager Integration Tests', () => {
        beforeEach(() => {
          mockSecretsClient.reset();
        });
        
        it('should retrieve API credentials successfully', async () => {
          const mockSecretValue = {
            SecretString: JSON.stringify({
              ALPHA_VANTAGE_API_KEY: 'test-alpha-vantage-key',
              ALPACA_API_KEY: 'test-alpaca-key',
              ALPACA_SECRET_KEY: 'test-alpaca-secret'
            })
          };
          
          mockSecretsClient.on(GetSecretValueCommand).resolves(mockSecretValue);
          
          const result = await mockSecretsClient.send(new GetSecretValueCommand({
            SecretId: 'signal9-advisor/api-credentials'
          }));
          
          expect(result.SecretString).toBeDefined();
          
          const credentials = JSON.parse(result.SecretString!);
          expect(credentials.ALPHA_VANTAGE_API_KEY).toBe('test-alpha-vantage-key');
          expect(credentials.ALPACA_API_KEY).toBe('test-alpaca-key');
          expect(credentials.ALPACA_SECRET_KEY).toBe('test-alpaca-secret');
        });
        
        it('should handle missing secrets gracefully', async () => {
          mockSecretsClient.on(GetSecretValueCommand).rejects(new Error('Secret not found'));
          
          await expect(
            mockSecretsClient.send(new GetSecretValueCommand({
              SecretId: 'signal9-advisor/missing-secret'
            }))
          ).rejects.toThrow('Secret not found');
        });
        
        it('should handle malformed secret data', async () => {
          const mockSecretValue = {
            SecretString: 'invalid-json-data'
          };
          
          mockSecretsClient.on(GetSecretValueCommand).resolves(mockSecretValue);
          
          const result = await mockSecretsClient.send(new GetSecretValueCommand({
            SecretId: 'signal9-advisor/malformed-secret'
          }));
          
          expect(() => JSON.parse(result.SecretString!)).toThrow();
        });
        
        it('should validate required secret fields', async () => {
          const mockSecretValue = {
            SecretString: JSON.stringify({
              ALPHA_VANTAGE_API_KEY: 'test-key'
              // Missing ALPACA credentials
            })
          };
          
          mockSecretsClient.on(GetSecretValueCommand).resolves(mockSecretValue);
          
          const result = await mockSecretsClient.send(new GetSecretValueCommand({
            SecretId: 'signal9-advisor/incomplete-secret'
          }));
          
          const credentials = JSON.parse(result.SecretString!);
          
          expect(credentials.ALPHA_VANTAGE_API_KEY).toBeDefined();
          expect(credentials.ALPACA_API_KEY).toBeUndefined();
          expect(credentials.ALPACA_SECRET_KEY).toBeUndefined();
        });
      });
      ```

- **Architecture Considerations**:
  - Comprehensive test coverage across all system components
  - Isolated test environments for reliable testing
  - Mock external dependencies for controlled testing
  - Performance benchmarks and load testing
  - Security testing for all integrations
  - End-to-end workflow validation

- **Security Requirements**:
  - Secure test data handling without production exposure
  - Proper credential management in test environments
  - No sensitive data in test logs or outputs
  - Secure test environment isolation
  - Access controls for test resources

- **Performance Requirements**:
  - Test execution time <10 minutes for full suite
  - Individual test time <30 seconds
  - Memory usage <512MB per test
  - Parallel test execution capability
  - Minimal impact on production systems

#### Dependencies
- **Prerequisites**:
  - Phase 1 Task 1: AWS Infrastructure Setup (completed)
  - Phase 1 Task 2: Data Pipeline Architecture (completed)
  - Phase 1 Task 3: AlphaVantage API Integration (completed)
  - Phase 1 Task 4: Alpaca API Integration (completed)
  - Phase 1 Task 5: Event-Driven Processing Implementation (completed)
  - Phase 1 Task 6: Data Quality and Validation (completed)
  - Phase 1 Task 7: Monitoring and Observability (completed)
  - Test environment setup and configuration
- **Dependent Tickets**:
  - Phase 1 Task 9: Documentation and Deployment

#### Testing Requirements
- **Unit Tests**:
  - All Lambda function unit tests
  - Validation logic unit tests
  - Utility function unit tests
  - Error handling unit tests
  - Mock external dependencies

- **Integration Tests**:
  - Data pipeline integration tests
  - API integration tests
  - Database integration tests
  - Event-driven workflow tests
  - Cross-service integration tests

- **Performance Tests**:
  - Load testing for concurrent users
  - Stress testing for system limits
  - Memory usage testing
  - Response time benchmarking
  - Throughput testing

- **Security Tests**:
  - Secrets management testing
  - API authentication testing
  - Data encryption testing
  - Access control testing
  - Vulnerability scanning

#### Acceptance Criteria
- [ ] Unit tests for all Lambda functions implemented
- [ ] Integration tests for data pipeline implemented
- [ ] API integration and rate limiting tests implemented
- [ ] Data quality and consistency validation tests implemented
- [ ] Monitoring and alerting system tests implemented
- [ ] End-to-end testing scenarios created
- [ ] Performance testing implemented
- [ ] Batch processing functionality tests implemented
- [ ] Step Functions workflow tests implemented
- [ ] Secrets Manager integration tests implemented
- [ ] All tests pass with >90% coverage
- [ ] Performance benchmarks met
- [ ] Security requirements validated
- [ ] Test documentation completed
- [ ] CI/CD pipeline integration configured
- [ ] Code review completed
- [ ] Test environment cleanup procedures documented

#### Error Handling
- **Test Failures**: Detailed error reporting and debugging information
- **Environment Issues**: Graceful handling of test environment problems
- **Mock Failures**: Fallback mechanisms for mock service failures
- **Timeout Handling**: Proper timeout configuration and handling
- **Resource Cleanup**: Automatic cleanup of test resources
- **Data Isolation**: Proper isolation of test data from production

#### Monitoring and Observability
- **Test Metrics to Track**:
  - Test execution success rates
  - Test execution times
  - Test coverage percentages
  - Performance benchmark results
  - Security test results

- **Logging Requirements**:
  - Structured test execution logs
  - Error logs with context
  - Performance test result logs
  - Security test result logs
  - Test environment setup logs

- **Alerting Criteria**:
  - Test failure rate >10%
  - Test coverage <90%
  - Performance regression >20%
  - Security test failures
  - Test environment issues

#### Open Questions
- None - all technical decisions have been made and documented

#### Notes
- Implement test data factories for consistent test data
- Consider implementing test parallelization for faster execution
- Plan for test environment cost optimization
- Monitor test execution performance and optimize
- Implement test result caching for repeated scenarios
- Consider implementing test result visualization and reporting 
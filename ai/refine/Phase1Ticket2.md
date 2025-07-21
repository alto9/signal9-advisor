# Ticket 1.2: Data Pipeline Architecture

**Status**: Refinement Complete

#### Description
Design and implement the event-driven data pipeline architecture for Signal9 Advisor. This includes creating the complete data flow orchestration with EventBridge, implementing scheduled triggers, setting up OpenSearch for semantic search, configuring ElastiCache Redis for caching, implementing Step Functions for complex analysis workflows, and establishing comprehensive data validation and error handling mechanisms. The pipeline must support the 5 scheduled cron jobs and handle both pollenationNeeded and analysisNeeded events efficiently.

#### Technical Details
- **Implementation Steps**:
  1. **Design Event-Driven Data Flow Architecture**
     ```typescript
     // lib/data-pipeline-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as events from 'aws-cdk-lib/aws-events';
     import * as targets from 'aws-cdk-lib/aws-events-targets';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     import * as sqs from 'aws-cdk-lib/aws-sqs';
     import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
     import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
     import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
     import * as elasticache from 'aws-cdk-lib/aws-elasticache';
     import * as ec2 from 'aws-cdk-lib/aws-ec2';
     import * as iam from 'aws-cdk-lib/aws-iam';
     
     export class DataPipelineStack extends cdk.Stack {
       constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
         super(scope, id, props);
         
         // VPC for ElastiCache and OpenSearch
         const vpc = new ec2.Vpc(this, 'DataPipelineVPC', {
           maxAzs: 2,
           natGateways: 1,
           subnetConfiguration: [
             {
               cidrMask: 24,
               name: 'Public',
               subnetType: ec2.SubnetType.PUBLIC,
             },
             {
               cidrMask: 24,
               name: 'Private',
               subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
             }
           ]
         });
         
         // Event-driven data flow architecture
         this.createEventDrivenArchitecture(vpc);
       }
       
       private createEventDrivenArchitecture(vpc: ec2.Vpc) {
         // Implementation details below
       }
     }
     ```

  2. **Implement Scheduled Triggers with EventBridge**
     ```typescript
     // lib/scheduled-triggers.ts
     import * as events from 'aws-cdk-lib/aws-events';
     import * as targets from 'aws-cdk-lib/aws-events-targets';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     import * as sqs from 'aws-cdk-lib/aws-sqs';
     
     export class ScheduledTriggers {
       constructor(
         private scope: cdk.Stack,
         private assetSyncLambda: lambda.Function,
         private earningsSyncLambda: lambda.Function,
         private newsSyncLambda: lambda.Function,
         private pollinationLambda: lambda.Function,
         private analysisLambda: lambda.Function
       ) {}
       
       public createScheduledTriggers() {
         // 4:00 AM - Asset synchronization with Alpaca API
         const assetSyncRule = new events.Rule(this.scope, 'AssetSyncRule', {
           schedule: events.Schedule.cron({ 
             minute: '0', 
             hour: '4',
             timeZone: 'UTC'
           }),
           description: 'Daily asset synchronization at 4:00 AM UTC',
           targets: [new targets.LambdaFunction(this.assetSyncLambda)]
         });
         
         // 5:00 AM - Earnings calendar synchronization
         const earningsSyncRule = new events.Rule(this.scope, 'EarningsSyncRule', {
           schedule: events.Schedule.cron({ 
             minute: '0', 
             hour: '5',
             timeZone: 'UTC'
           }),
           description: 'Daily earnings calendar sync at 5:00 AM UTC',
           targets: [new targets.LambdaFunction(this.earningsSyncLambda)]
         });
         
         // 6:00 AM - Earnings-triggered pollination
         const earningsPollinationRule = new events.Rule(this.scope, 'EarningsPollinationRule', {
           schedule: events.Schedule.cron({ 
             minute: '0', 
             hour: '6',
             timeZone: 'UTC'
           }),
           description: 'Earnings-triggered pollination at 6:00 AM UTC',
           targets: [new targets.LambdaFunction(this.pollinationLambda, {
             event: events.RuleTargetInput.fromObject({
               triggerType: 'earnings',
               batchSize: 8,
               maxAssets: 25 // AlphaVantage free tier limit
             })
           })]
         });
         
         // 7:00 AM - Regular pollination
         const regularPollinationRule = new events.Rule(this.scope, 'RegularPollinationRule', {
           schedule: events.Schedule.cron({ 
             minute: '0', 
             hour: '7',
             timeZone: 'UTC'
           }),
           description: 'Regular pollination at 7:00 AM UTC',
           targets: [new targets.LambdaFunction(this.pollinationLambda, {
             event: events.RuleTargetInput.fromObject({
               triggerType: 'regular',
               batchSize: 8,
               maxAssets: 25 // AlphaVantage free tier limit
             })
           })]
         });
         
         // Hourly - News sentiment synchronization
         const newsSyncRule = new events.Rule(this.scope, 'NewsSyncRule', {
           schedule: events.Schedule.cron({ 
             minute: '0',
             timeZone: 'UTC'
           }),
           description: 'Hourly news sentiment sync',
           targets: [new targets.LambdaFunction(this.newsSyncLambda)]
         });
         
         return {
           assetSyncRule,
           earningsSyncRule,
           earningsPollinationRule,
           regularPollinationRule,
           newsSyncRule
         };
       }
     }
     ```

  3. **Create Event Handlers for Custom Events**
     ```typescript
     // lib/custom-event-handlers.ts
     import * as events from 'aws-cdk-lib/aws-events';
     import * as targets from 'aws-cdk-lib/aws-events-targets';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     import * as sqs from 'aws-cdk-lib/aws-sqs';
     
     export class CustomEventHandlers {
       constructor(
         private scope: cdk.Stack,
         private pollinationLambda: lambda.Function,
         private analysisLambda: lambda.Function,
         private deadLetterQueue: sqs.Queue
       ) {}
       
       public createCustomEventHandlers() {
         // pollenationNeeded event handler
         const pollenationNeededRule = new events.Rule(this.scope, 'PollenationNeededRule', {
           eventPattern: {
             source: ['signal9.advisor'],
             detailType: ['pollenationNeeded'],
             detail: {
               assetId: [{ exists: true }],
               dataTypes: [{ exists: true }]
             }
           },
           description: 'Trigger financial data ingestion for individual assets',
           targets: [
             new targets.LambdaFunction(this.pollinationLambda, {
               deadLetterQueue: this.deadLetterQueue,
               maxEventAge: cdk.Duration.hours(1),
               retryAttempts: 3
             })
           ]
         });
         
         // analysisNeeded event handler
         const analysisNeededRule = new events.Rule(this.scope, 'AnalysisNeededRule', {
           eventPattern: {
             source: ['signal9.advisor'],
             detailType: ['analysisNeeded'],
             detail: {
               assetIds: [{ exists: true }],
               batchSize: [{ numeric: ['=', 8] }]
             }
           },
           description: 'Trigger rule-based analysis for processed assets (batch processing)',
           targets: [
             new targets.LambdaFunction(this.analysisLambda, {
               deadLetterQueue: this.deadLetterQueue,
               maxEventAge: cdk.Duration.hours(2),
               retryAttempts: 3
             })
           ]
         });
         
         // earningsProcessed event handler
         const earningsProcessedRule = new events.Rule(this.scope, 'EarningsProcessedRule', {
           eventPattern: {
             source: ['signal9.advisor'],
             detailType: ['earningsProcessed'],
             detail: {
               assetId: [{ exists: true }],
               earningsDate: [{ exists: true }]
             }
           },
           description: 'Mark earnings as processed to prevent duplicates'
         });
         
         // analysisComplete event handler
         const analysisCompleteRule = new events.Rule(this.scope, 'AnalysisCompleteRule', {
           eventPattern: {
             source: ['signal9.advisor'],
             detailType: ['analysisComplete'],
             detail: {
               analysisId: [{ exists: true }],
               assetId: [{ exists: true }],
               status: ['completed', 'failed']
             }
           },
           description: 'Signal completion of rule-based analysis workflow'
         });
         
         return {
           pollenationNeededRule,
           analysisNeededRule,
           earningsProcessedRule,
           analysisCompleteRule
         };
       }
     }
     ```

  4. **Configure OpenSearch for Semantic Search**
     ```typescript
     // lib/opensearch-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
     import * as ec2 from 'aws-cdk-lib/aws-ec2';
     import * as iam from 'aws-cdk-lib/aws-iam';
     
     export class OpenSearchStack extends cdk.Stack {
       constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
         super(scope, id, props);
         
         const vpc = ec2.Vpc.fromLookup(this, 'DataPipelineVPC', {
           vpcName: 'DataPipelineVPC'
         });
         
         // OpenSearch domain for semantic search
         const openSearchDomain = new opensearch.Domain(this, 'Signal9OpenSearchDomain', {
           domainName: 'signal9-advisor-search',
           version: opensearch.EngineVersion.OPENSEARCH_2_11,
           capacity: {
             dataNodes: 2,
             dataNodeInstanceType: 't3.small.search'
           },
           ebs: {
             volumeSize: 20,
             volumeType: ec2.EbsDeviceVolumeType.GP3
           },
           zoneAwareness: {
             enabled: true,
             availabilityZoneCount: 2
           },
           encryptionAtRest: {
             enabled: true
           },
           nodeToNodeEncryption: {
             enabled: true
           },
           enforceHttps: true,
           fineGrainedAccessControl: {
             masterUserArn: 'arn:aws:iam::ACCOUNT:user/opensearch-master'
           },
           vpc: vpc,
           vpcSubnets: [{
             subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
           }],
           securityGroups: [this.createOpenSearchSecurityGroup(vpc)],
           accessPolicies: [
             new iam.PolicyStatement({
               effect: iam.Effect.ALLOW,
               principals: [new iam.ServicePrincipal('lambda.amazonaws.com')],
               actions: [
                 'es:ESHttp*'
               ],
               resources: ['*']
             })
           ]
         });
         
         // Create indices for different data types
         this.createOpenSearchIndices(openSearchDomain);
         
         // Export domain endpoint
         new cdk.CfnOutput(this, 'OpenSearchDomainEndpoint', {
           value: openSearchDomain.domainEndpoint
         });
       }
       
       private createOpenSearchSecurityGroup(vpc: ec2.Vpc): ec2.SecurityGroup {
         const securityGroup = new ec2.SecurityGroup(this, 'OpenSearchSecurityGroup', {
           vpc,
           description: 'Security group for OpenSearch domain',
           allowAllOutbound: true
         });
         
         // Allow Lambda functions to access OpenSearch
         securityGroup.addIngressRule(
           ec2.Peer.anyIpv4(),
           ec2.Port.tcp(443),
           'Allow HTTPS access from Lambda'
         );
         
         return securityGroup;
       }
       
       private createOpenSearchIndices(domain: opensearch.Domain) {
         // Asset index for semantic search
         const assetIndexConfig = {
           mappings: {
             properties: {
               asset_id: { type: 'keyword' },
               symbol: { type: 'keyword' },
               company_name: { 
                 type: 'text',
                 analyzer: 'standard',
                 fields: {
                   keyword: { type: 'keyword' }
                 }
               },
               sector: { type: 'keyword' },
               industry: { type: 'keyword' },
               description: { 
                 type: 'text',
                 analyzer: 'standard'
               },
               market_cap: { type: 'long' },
               status: { type: 'keyword' },
               last_updated: { type: 'date' }
             }
           },
           settings: {
             number_of_shards: 1,
             number_of_replicas: 1
           }
         };
         
         // News index for semantic search
         const newsIndexConfig = {
           mappings: {
             properties: {
               news_id: { type: 'keyword' },
               asset_symbol: { type: 'keyword' },
               title: { 
                 type: 'text',
                 analyzer: 'standard'
               },
               content: { 
                 type: 'text',
                 analyzer: 'standard'
               },
               url: { type: 'keyword' },
               relevance_score: { type: 'float' },
               sentiment_score: { type: 'float' },
               time_published: { type: 'date' },
               source: { type: 'keyword' }
             }
           },
           settings: {
             number_of_shards: 1,
             number_of_replicas: 1
           }
         };
         
         // Analysis index for semantic search
         const analysisIndexConfig = {
           mappings: {
             properties: {
               analysis_id: { type: 'keyword' },
               asset_id: { type: 'keyword' },
               investment_rating: { type: 'keyword' },
               confidence_interval: { type: 'float' },
               rating_components: { type: 'object' },
               analysis_date: { type: 'date' },
               analysis_type: { type: 'keyword' }
             }
           },
           settings: {
             number_of_shards: 1,
             number_of_replicas: 1
           }
         };
         
         // Lambda function to create indices
         const createIndicesLambda = new lambda.Function(this, 'CreateIndicesFunction', {
           runtime: lambda.Runtime.NODEJS_22_X,
           handler: 'index.handler',
           code: lambda.Code.fromInline(`
             const { Client } = require('@opensearch-project/opensearch');
             const { defaultProvider } = require('@aws-sdk/credential-provider-node');
             const { createAwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
             
             exports.handler = async (event) => {
               const signer = createAwsSigv4Signer({
                 region: '${this.region}',
                 service: 'es',
                 getCredentials: () => defaultProvider()()
               });
               
               const client = new Client({
                 ...signer.getClientConfig(),
                 node: '${domain.domainEndpoint}'
               });
               
               const indices = [
                 { name: 'assets', config: ${JSON.stringify(assetIndexConfig)} },
                 { name: 'news', config: ${JSON.stringify(newsIndexConfig)} },
                 { name: 'analysis', config: ${JSON.stringify(analysisIndexConfig)} }
               ];
               
               for (const index of indices) {
                 try {
                   await client.indices.create({
                     index: index.name,
                     body: index.config
                   });
                   console.log(\`Created index: \${index.name}\`);
                 } catch (error) {
                   if (error.message.includes('resource_already_exists_exception')) {
                     console.log(\`Index \${index.name} already exists\`);
                   } else {
                     throw error;
                   }
                 }
               }
             };
           `),
           timeout: cdk.Duration.minutes(5),
           environment: {
             OPENSEARCH_ENDPOINT: domain.domainEndpoint
           }
         });
         
         // Grant permissions to Lambda
         domain.grantReadWrite(createIndicesLambda);
       }
     }
     ```

  5. **Set up ElastiCache Redis for Caching**
     ```typescript
     // lib/elasticache-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as elasticache from 'aws-cdk-lib/aws-elasticache';
     import * as ec2 from 'aws-cdk-lib/aws-ec2';
     import * as iam from 'aws-cdk-lib/aws-iam';
     
     export class ElastiCacheStack extends cdk.Stack {
       constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
         super(scope, id, props);
         
         const vpc = ec2.Vpc.fromLookup(this, 'DataPipelineVPC', {
           vpcName: 'DataPipelineVPC'
         });
         
         // Redis subnet group
         const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
           description: 'Subnet group for Redis cluster',
           subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId)
         });
         
         // Redis security group
         const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
           vpc,
           description: 'Security group for Redis cluster',
           allowAllOutbound: true
         });
         
         // Allow Lambda functions to access Redis
         redisSecurityGroup.addIngressRule(
           ec2.Peer.anyIpv4(),
           ec2.Port.tcp(6379),
           'Allow Redis access from Lambda'
         );
         
         // Redis cluster for caching
         const redisCluster = new elasticache.CfnCacheCluster(this, 'Signal9RedisCluster', {
           engine: 'redis',
           cacheNodeType: 'cache.t3.micro',
           numCacheNodes: 1,
           vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
           cacheSubnetGroupName: redisSubnetGroup.ref,
           port: 6379,
           preferredMaintenanceWindow: 'sun:05:00-sun:09:00',
           snapshotRetentionLimit: 7,
           snapshotWindow: '03:00-05:00'
         });
         
         // Redis parameter group for optimization
         const redisParameterGroup = new elasticache.CfnParameterGroup(this, 'RedisParameterGroup', {
           description: 'Parameter group for Signal9 Redis cluster',
           family: 'redis7',
           properties: {
             'maxmemory-policy': 'allkeys-lru',
             'notify-keyspace-events': 'Ex',
             'timeout': '300'
           }
         });
         
         // Export Redis endpoint
         new cdk.CfnOutput(this, 'RedisEndpoint', {
           value: redisCluster.attrRedisEndpointAddress
         });
         
         new cdk.CfnOutput(this, 'RedisPort', {
           value: redisCluster.attrRedisEndpointPort
         });
       }
     }
     ```

  6. **Implement Step Functions for Analysis Workflow Orchestration**
     ```typescript
     // lib/step-functions-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
     import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     import * as iam from 'aws-cdk-lib/aws-iam';
     
     export class StepFunctionsStack extends cdk.Stack {
       constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
         super(scope, id, props);
         
         // Lambda functions for Step Functions tasks
         const dataValidationLambda = new lambda.Function(this, 'DataValidationFunction', {
           runtime: lambda.Runtime.NODEJS_22_X,
           handler: 'index.handler',
           code: lambda.Code.fromAsset('lambda/step-functions/data-validation'),
           timeout: cdk.Duration.minutes(5),
           environment: {
             ASSETS_TABLE_NAME: 'signal9-assets',
             FINANCIAL_DATA_TABLES: JSON.stringify({
               incomeStatement: 'signal9-income-statement',
               balanceSheet: 'signal9-balance-sheet',
               cashFlow: 'signal9-cash-flow',
               companyOverview: 'signal9-company-overview',
               earnings: 'signal9-earnings'
             })
           }
         });
         
         const ruleBasedAnalysisLambda = new lambda.Function(this, 'RuleBasedAnalysisFunction', {
           runtime: lambda.Runtime.NODEJS_22_X,
           handler: 'index.handler',
           code: lambda.Code.fromAsset('lambda/step-functions/rule-based-analysis'),
           timeout: cdk.Duration.minutes(10),
           memorySize: 2048,
           environment: {
             ASSET_ANALYSIS_TABLE_NAME: 'signal9-asset-analysis',
             OPENSEARCH_ENDPOINT: '${OpenSearchDomainEndpoint}',
             REDIS_ENDPOINT: '${RedisEndpoint}',
             REDIS_PORT: '${RedisPort}'
           }
         });
         
         const resultStorageLambda = new lambda.Function(this, 'ResultStorageFunction', {
           runtime: lambda.Runtime.NODEJS_22_X,
           handler: 'index.handler',
           code: lambda.Code.fromAsset('lambda/step-functions/result-storage'),
           timeout: cdk.Duration.minutes(5),
           environment: {
             ASSET_ANALYSIS_TABLE_NAME: 'signal9-asset-analysis',
             S3_BUCKET_NAME: 'signal9-analysis-results'
           }
         });
         
         const notificationLambda = new lambda.Function(this, 'NotificationFunction', {
           runtime: lambda.Runtime.NODEJS_22_X,
           handler: 'index.handler',
           code: lambda.Code.fromAsset('lambda/step-functions/notification'),
           timeout: cdk.Duration.minutes(2),
           environment: {
             SNS_TOPIC_ARN: '${AnalysisNotificationTopicArn}'
           }
         });
         
         // Step Functions state machine definition
         const analysisWorkflow = new stepfunctions.StateMachine(this, 'AnalysisWorkflow', {
           definition: this.createAnalysisWorkflow(
             dataValidationLambda,
             ruleBasedAnalysisLambda,
             resultStorageLambda,
             notificationLambda
           ),
           timeout: cdk.Duration.hours(2),
           stateMachineType: stepfunctions.StateMachineType.STANDARD
         });
         
         // Export state machine ARN
         new cdk.CfnOutput(this, 'AnalysisWorkflowArn', {
           value: analysisWorkflow.stateMachineArn
         });
       }
       
       private createAnalysisWorkflow(
         dataValidationLambda: lambda.Function,
         ruleBasedAnalysisLambda: lambda.Function,
         resultStorageLambda: lambda.Function,
         notificationLambda: lambda.Function
       ): stepfunctions.Chain {
         // Data validation task
         const dataValidationTask = new tasks.LambdaInvoke(this, 'DataValidationTask', {
           lambdaFunction: dataValidationLambda,
           outputPath: '$.Payload',
           resultPath: '$.validationResult'
         });
         
         // Rule-based analysis task
         const ruleBasedAnalysisTask = new tasks.LambdaInvoke(this, 'RuleBasedAnalysisTask', {
           lambdaFunction: ruleBasedAnalysisLambda,
           outputPath: '$.Payload',
           resultPath: '$.analysisResult'
         });
         
         // Result storage task
         const resultStorageTask = new tasks.LambdaInvoke(this, 'ResultStorageTask', {
           lambdaFunction: resultStorageLambda,
           outputPath: '$.Payload',
           resultPath: '$.storageResult'
         });
         
         // Notification task
         const notificationTask = new tasks.LambdaInvoke(this, 'NotificationTask', {
           lambdaFunction: notificationLambda,
           outputPath: '$.Payload'
         });
         
         // Error handling
         const errorHandler = new stepfunctions.Fail(this, 'AnalysisFailed', {
           cause: 'Analysis workflow failed',
           error: 'AnalysisError'
         });
         
         // Success handler
         const successHandler = new stepfunctions.Succeed(this, 'AnalysisSucceeded', {
           comment: 'Analysis workflow completed successfully'
         });
         
         // Conditional branching based on validation result
         const validationChoice = new stepfunctions.Choice(this, 'ValidationChoice')
           .when(stepfunctions.Condition.booleanEquals('$.validationResult.isValid', true), 
                 ruleBasedAnalysisTask.next(resultStorageTask).next(notificationTask).next(successHandler))
           .otherwise(errorHandler);
         
         // Start with data validation
         return dataValidationTask.next(validationChoice);
       }
     }
     ```

  7. **Implement Data Validation and Error Handling**
     ```typescript
     // lib/data-validation-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
     import * as sqs from 'aws-cdk-lib/aws-sqs';
     import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
     
     export class DataValidationStack extends cdk.Stack {
       constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
         super(scope, id, props);
         
         // Dead letter queue for failed processing
         const deadLetterQueue = new sqs.Queue(this, 'DataPipelineDLQ', {
           queueName: 'signal9-data-pipeline-dlq',
           visibilityTimeout: cdk.Duration.minutes(5),
           retentionPeriod: cdk.Duration.days(14),
           encryption: sqs.QueueEncryption.SQS_MANAGED
         });
         
         // Data validation Lambda
         const dataValidationLambda = new lambda.Function(this, 'DataValidationFunction', {
           runtime: lambda.Runtime.NODEJS_22_X,
           handler: 'index.handler',
           code: lambda.Code.fromAsset('lambda/data-validation'),
           timeout: cdk.Duration.minutes(5),
           memorySize: 512,
           environment: {
             DEAD_LETTER_QUEUE_URL: deadLetterQueue.queueUrl,
             VALIDATION_ERROR_TOPIC_ARN: '${ValidationErrorTopicArn}'
           }
         });
         
         // Grant permissions
         deadLetterQueue.grantSendMessages(dataValidationLambda);
         
         // Custom metrics for data validation
         const validationMetrics = new cloudwatch.Metric({
           namespace: 'Signal9/DataValidation',
           metricName: 'ValidationSuccessRate',
           statistic: 'Average',
           period: cdk.Duration.minutes(5)
         });
         
         const errorMetrics = new cloudwatch.Metric({
           namespace: 'Signal9/DataValidation',
           metricName: 'ValidationErrors',
           statistic: 'Sum',
           period: cdk.Duration.minutes(5)
         });
         
         // CloudWatch alarm for validation failures
         const validationAlarm = new cloudwatch.Alarm(this, 'ValidationFailureAlarm', {
           metric: errorMetrics,
           threshold: 5,
           evaluationPeriods: 2,
           alarmDescription: 'Alert when data validation errors exceed threshold'
         });
         
         // Export DLQ URL
         new cdk.CfnOutput(this, 'DeadLetterQueueUrl', {
           value: deadLetterQueue.queueUrl
         });
       }
     }
     ```

  8. **Create Dead Letter Queues for Failed Processing**
     ```typescript
     // lib/dead-letter-queues.ts
     import * as cdk from 'aws-cdk-lib';
     import * as sqs from 'aws-cdk-lib/aws-sqs';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     import * as sns from 'aws-cdk-lib/aws-sns';
     import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
     
     export class DeadLetterQueues {
       constructor(private scope: cdk.Stack) {}
       
       public createDeadLetterQueues() {
         // Main DLQ for data pipeline
         const dataPipelineDLQ = new sqs.Queue(this.scope, 'DataPipelineDLQ', {
           queueName: 'signal9-data-pipeline-dlq',
           visibilityTimeout: cdk.Duration.minutes(5),
           retentionPeriod: cdk.Duration.days(14),
           encryption: sqs.QueueEncryption.SQS_MANAGED
         });
         
         // DLQ for API processing
         const apiProcessingDLQ = new sqs.Queue(this.scope, 'ApiProcessingDLQ', {
           queueName: 'signal9-api-processing-dlq',
           visibilityTimeout: cdk.Duration.minutes(5),
           retentionPeriod: cdk.Duration.days(14),
           encryption: sqs.QueueEncryption.SQS_MANAGED
         });
         
         // DLQ for analysis processing
         const analysisProcessingDLQ = new sqs.Queue(this.scope, 'AnalysisProcessingDLQ', {
           queueName: 'signal9-analysis-processing-dlq',
           visibilityTimeout: cdk.Duration.minutes(10),
           retentionPeriod: cdk.Duration.days(14),
           encryption: sqs.QueueEncryption.SQS_MANAGED
         });
         
         // SNS topic for DLQ notifications
         const dlqNotificationTopic = new sns.Topic(this.scope, 'DLQNotificationTopic', {
           topicName: 'signal9-dlq-notifications',
           displayName: 'Signal9 DLQ Notifications'
         });
         
         // DLQ processing Lambda
         const dlqProcessorLambda = new lambda.Function(this.scope, 'DLQProcessorFunction', {
           runtime: lambda.Runtime.NODEJS_22_X,
           handler: 'index.handler',
           code: lambda.Code.fromAsset('lambda/dlq-processor'),
           timeout: cdk.Duration.minutes(5),
           environment: {
             NOTIFICATION_TOPIC_ARN: dlqNotificationTopic.topicArn
           }
         });
         
         // Grant permissions
         dataPipelineDLQ.grantConsumeMessages(dlqProcessorLambda);
         apiProcessingDLQ.grantConsumeMessages(dlqProcessorLambda);
         analysisProcessingDLQ.grantConsumeMessages(dlqProcessorLambda);
         dlqNotificationTopic.grantPublish(dlqProcessorLambda);
         
         return {
           dataPipelineDLQ,
           apiProcessingDLQ,
           analysisProcessingDLQ,
           dlqNotificationTopic,
           dlqProcessorLambda
         };
       }
     }
     ```

  9. **Main Data Pipeline Stack Integration**
     ```typescript
     // lib/data-pipeline-main-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import { ScheduledTriggers } from './scheduled-triggers';
     import { CustomEventHandlers } from './custom-event-handlers';
     import { DeadLetterQueues } from './dead-letter-queues';
     
     export class DataPipelineMainStack extends cdk.Stack {
       constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
         super(scope, id, props);
         
         // Create dead letter queues first
         const dlqSystem = new DeadLetterQueues(this);
         const dlqs = dlqSystem.createDeadLetterQueues();
         
         // Create scheduled triggers
         const scheduledTriggers = new ScheduledTriggers(
           this,
           this.assetSyncLambda,
           this.earningsSyncLambda,
           this.newsSyncLambda,
           this.pollinationLambda,
           this.analysisLambda
         );
         
         const triggers = scheduledTriggers.createScheduledTriggers();
         
         // Create custom event handlers
         const customEventHandlers = new CustomEventHandlers(
           this,
           this.pollinationLambda,
           this.analysisLambda,
           dlqs.dataPipelineDLQ
         );
         
         const eventHandlers = customEventHandlers.createCustomEventHandlers();
         
         // Export important resources
         new cdk.CfnOutput(this, 'DataPipelineDLQUrl', {
           value: dlqs.dataPipelineDLQ.queueUrl
         });
         
         new cdk.CfnOutput(this, 'DLQNotificationTopicArn', {
           value: dlqs.dlqNotificationTopic.topicArn
         });
       }
     }
     ```

  10. **Deploy Data Pipeline Infrastructure**
      ```bash
      # Deploy OpenSearch stack
      cdk deploy Signal9OpenSearchStack
      
      # Deploy ElastiCache stack
      cdk deploy Signal9ElastiCacheStack
      
      # Deploy Step Functions stack
      cdk deploy Signal9StepFunctionsStack
      
      # Deploy data validation stack
      cdk deploy Signal9DataValidationStack
      
      # Deploy main data pipeline stack
      cdk deploy Signal9DataPipelineMainStack
      
      # Verify deployment
      cdk diff
      ```

- **Architecture Considerations**:
  - Event-driven architecture with EventBridge for loose coupling
  - Step Functions for complex workflow orchestration
  - OpenSearch for semantic search capabilities
  - ElastiCache Redis for high-performance caching
  - Dead letter queues for reliable error handling
  - Batch processing for efficiency (8 assets per batch)
  - Proper state management and tracking

- **Security Requirements**:
  - OpenSearch domain with encryption at rest and in transit
  - ElastiCache Redis in private subnets with security groups
  - IAM roles with least privilege for all Lambda functions
  - Dead letter queues with encryption
  - Step Functions with proper error handling and logging

- **Performance Requirements**:
  - OpenSearch cluster with 2 data nodes for high availability
  - ElastiCache Redis for sub-millisecond response times
  - Step Functions with 2-hour timeout for complex workflows
  - EventBridge with retry logic and dead letter queues
  - Batch processing optimized for 8 assets per batch

#### Dependencies
- **Prerequisites**:
  - Phase 1 Task 1: AWS Infrastructure Setup (completed)
  - VPC with public and private subnets
  - DynamoDB tables created and accessible
  - Lambda functions with proper IAM roles
  - EventBridge rules configured
- **Dependent Tickets**:
  - Phase 1 Task 3: AlphaVantage API Integration
  - Phase 1 Task 4: Alpaca API Integration
  - Phase 1 Task 5: Event-Driven Processing Implementation

#### Testing Requirements
- **Unit Tests**:
  - Step Functions workflow unit tests
  - EventBridge rule configuration tests
  - OpenSearch index creation and query tests
  - ElastiCache Redis connection and operation tests
  - Dead letter queue processing tests

- **Integration Tests**:
  - End-to-end data pipeline workflow tests
  - Event-driven processing integration tests
  - OpenSearch semantic search integration tests
  - ElastiCache caching integration tests
  - Step Functions workflow integration tests

- **Performance Tests**:
  - OpenSearch query performance tests
  - ElastiCache Redis performance tests
  - Step Functions workflow performance tests
  - EventBridge event processing performance tests
  - Batch processing performance tests

- **Security Tests**:
  - OpenSearch access control tests
  - ElastiCache security group tests
  - Step Functions IAM role validation
  - Dead letter queue encryption tests
  - EventBridge security validation

#### Acceptance Criteria
- [ ] Event-driven architecture implemented with EventBridge
- [ ] All 5 scheduled triggers configured and functional
- [ ] Custom event handlers for pollenationNeeded and analysisNeeded events
- [ ] OpenSearch domain deployed with semantic search capabilities
- [ ] ElastiCache Redis cluster deployed and accessible
- [ ] Step Functions workflow for analysis orchestration
- [ ] Data validation and error handling mechanisms implemented
- [ ] Dead letter queues created for failed processing
- [ ] All Lambda functions can access OpenSearch and ElastiCache
- [ ] Batch processing configured for 8 assets per batch
- [ ] CloudWatch metrics and alarms configured
- [ ] All unit tests pass with >90% coverage
- [ ] Integration tests pass successfully
- [ ] Performance benchmarks met
- [ ] Security requirements validated
- [ ] Code review completed
- [ ] Documentation updated

#### Error Handling
- **EventBridge Failures**: Dead letter queues with retry logic
- **Step Functions Failures**: Error states with notification
- **OpenSearch Failures**: Fallback to DynamoDB queries
- **ElastiCache Failures**: Fallback to direct API calls
- **Lambda Function Failures**: Exponential backoff retry
- **Data Validation Failures**: Logging and notification system

#### Monitoring and Observability
- **Metrics to Track**:
  - EventBridge rule invocations and failures
  - Step Functions execution success/failure rates
  - OpenSearch query performance and errors
  - ElastiCache hit/miss ratios
  - Dead letter queue message counts
  - Batch processing completion rates

- **Logging Requirements**:
  - Structured logging for all Lambda functions
  - Step Functions execution logs
  - OpenSearch access logs
  - ElastiCache connection logs
  - EventBridge event logs

- **Alerting Criteria**:
  - EventBridge rule failure rate >5%
  - Step Functions workflow failure rate >10%
  - OpenSearch error rate >2%
  - ElastiCache connection failures
  - Dead letter queue message count >100

#### Open Questions
- None - all technical decisions have been made and documented

#### Notes
- OpenSearch domain uses t3.small.search instances for cost optimization
- ElastiCache Redis uses t3.micro for development, can scale to larger instances
- Step Functions workflow designed for extensibility in future phases
- Dead letter queues configured with 14-day retention for debugging
- All components designed for horizontal scaling as needed
- Consider implementing AWS X-Ray for distributed tracing
- Monitor costs closely during initial deployment and scaling 
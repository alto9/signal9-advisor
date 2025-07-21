# Ticket 1.2: Data Pipeline Architecture

**Status**: Refinement Complete

#### Description
Design and implement the event-driven data pipeline architecture for Signal9 Advisor. This includes creating the complete data flow orchestration with EventBridge, implementing scheduled triggers, setting up OpenSearch for semantic search, configuring ElastiCache Redis for caching, implementing Step Functions for complex analysis workflows, and establishing comprehensive data validation and error handling mechanisms. The pipeline must support the 5 scheduled cron jobs and handle both pollenationNeeded and analysisNeeded events efficiently.

#### Technical Details

**CRITICAL: Complete these steps in exact order - each step builds on previous infrastructure**

- **Implementation Steps**:

  1. **Install Required Dependencies and Create Project Structure**
     ```bash
     # Navigate to infrastructure directory (from Phase 1 Task 1)
     cd signal9-advisor/infrastructure
     
     # Install additional dependencies for data pipeline
     npm install @opensearch-project/opensearch@2.4.0
     npm install @aws-sdk/credential-provider-node@3.450.0
     npm install ioredis@5.3.2
     npm install uuid@9.0.1
     npm install --save-dev @types/uuid@9.0.7
     
     # Create Lambda function directories for data pipeline
     mkdir -p lambda/step-functions/{data-validation,rule-based-analysis,result-storage,notification}
     mkdir -p lambda/data-pipeline/{validation,dlq-processor}
     mkdir -p lambda/opensearch/{index-management,search-operations}
     mkdir -p lambda/elasticache/{cache-operations}
     
     # Verify structure
     ls -la lambda/
     ```

  2. **Create VPC Stack for Data Pipeline Components**
     ```typescript
     // lib/vpc-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as ec2 from 'aws-cdk-lib/aws-ec2';
     import { Construct } from 'constructs';
     
     export interface VpcStackProps extends cdk.StackProps {
       environmentName: string;
     }
     
     export class VpcStack extends cdk.Stack {
       public readonly vpc: ec2.Vpc;
       public readonly privateSubnets: ec2.ISubnet[];
       public readonly publicSubnets: ec2.ISubnet[];
       
       constructor(scope: Construct, id: string, props: VpcStackProps) {
         super(scope, id, props);
         
         const { environmentName } = props;
         
         // VPC for data pipeline components (OpenSearch, ElastiCache)
         this.vpc = new ec2.Vpc(this, 'DataPipelineVPC', {
           vpcName: `signal9-data-pipeline-vpc-${environmentName}`,
           maxAzs: 3, // Use 3 AZs for better fault tolerance
           natGateways: 2, // 2 NAT gateways for high availability
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
             },
             {
               cidrMask: 28,
               name: 'Isolated',
               subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
             }
           ],
           enableDnsHostnames: true,
           enableDnsSupport: true
         });
         
         this.privateSubnets = this.vpc.privateSubnets;
         this.publicSubnets = this.vpc.publicSubnets;
         
         // VPC Endpoints for AWS services to reduce NAT gateway costs
         this.vpc.addGatewayEndpoint('S3Endpoint', {
           service: ec2.GatewayVpcEndpointAwsService.S3
         });
         
         this.vpc.addGatewayEndpoint('DynamoDBEndpoint', {
           service: ec2.GatewayVpcEndpointAwsService.DYNAMODB
         });
         
         // Interface endpoints for other services
         new ec2.InterfaceVpcEndpoint(this, 'SecretsManagerEndpoint', {
           vpc: this.vpc,
           service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
           subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
         });
         
         new ec2.InterfaceVpcEndpoint(this, 'EventBridgeEndpoint', {
           vpc: this.vpc,
           service: ec2.InterfaceVpcEndpointAwsService.EVENTBRIDGE,
           subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
         });
         
         // Export VPC details
         new cdk.CfnOutput(this, 'VpcId', {
           value: this.vpc.vpcId,
           exportName: `Signal9-${environmentName}-VPC-Id`
         });
         
         new cdk.CfnOutput(this, 'PrivateSubnetIds', {
           value: this.privateSubnets.map(subnet => subnet.subnetId).join(','),
           exportName: `Signal9-${environmentName}-PrivateSubnet-Ids`
         });
       }
     }
     ```

  3. **Create OpenSearch Stack with Proper Configuration**
     ```typescript
     // lib/opensearch-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
     import * as ec2 from 'aws-cdk-lib/aws-ec2';
     import * as iam from 'aws-cdk-lib/aws-iam';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
     import { Construct } from 'constructs';
     
     export interface OpenSearchStackProps extends cdk.StackProps {
       environmentName: string;
       vpc: ec2.Vpc;
     }
     
     export class OpenSearchStack extends cdk.Stack {
       public readonly domain: opensearch.Domain;
       public readonly domainEndpoint: string;
       
       constructor(scope: Construct, id: string, props: OpenSearchStackProps) {
         super(scope, id, props);
         
         const { environmentName, vpc } = props;
         
         // Security group for OpenSearch
         const openSearchSecurityGroup = new ec2.SecurityGroup(this, 'OpenSearchSecurityGroup', {
           vpc,
           description: 'Security group for OpenSearch domain',
           allowAllOutbound: false
         });
         
         // Allow HTTPS traffic from Lambda functions in VPC
         openSearchSecurityGroup.addIngressRule(
           ec2.Peer.ipv4(vpc.vpcCidrBlock),
           ec2.Port.tcp(443),
           'Allow HTTPS access from VPC'
         );
         
         // Allow HTTPS outbound for replication
         openSearchSecurityGroup.addEgressRule(
           ec2.Peer.anyIpv4(),
           ec2.Port.tcp(443),
           'Allow HTTPS outbound'
         );
         
         // OpenSearch domain
         this.domain = new opensearch.Domain(this, 'Signal9OpenSearchDomain', {
           domainName: `signal9-search-${environmentName}`,
           version: opensearch.EngineVersion.OPENSEARCH_2_11,
           capacity: {
             dataNodes: environmentName === 'prod' ? 3 : 2,
             dataNodeInstanceType: environmentName === 'prod' ? 'm6g.large.search' : 't3.small.search',
             masterNodes: environmentName === 'prod' ? 3 : 0,
             masterNodeInstanceType: environmentName === 'prod' ? 'm6g.medium.search' : undefined
           },
           ebs: {
             volumeSize: environmentName === 'prod' ? 100 : 20,
             volumeType: ec2.EbsDeviceVolumeType.GP3
           },
           zoneAwareness: {
             enabled: true,
             availabilityZoneCount: environmentName === 'prod' ? 3 : 2
           },
           encryptionAtRest: {
             enabled: true
           },
           nodeToNodeEncryption: {
             enabled: true
           },
           enforceHttps: true,
           domainEndpointOptions: {
             enforceHttps: true,
             tlsSecurityPolicy: opensearch.TLSSecurityPolicy.TLS_1_2
           },
           vpc,
           vpcSubnets: [{
             subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
           }],
           securityGroups: [openSearchSecurityGroup],
           accessPolicies: [
             new iam.PolicyStatement({
               effect: iam.Effect.ALLOW,
               principals: [new iam.AnyPrincipal()],
               actions: ['es:*'],
               resources: ['*'],
               conditions: {
                 IpAddress: {
                   'aws:SourceIp': [vpc.vpcCidrBlock]
                 }
               }
             })
           ],
           logging: {
             slowSearchLogEnabled: true,
             appLogEnabled: true,
             slowIndexLogEnabled: true
           }
         });
         
         this.domainEndpoint = this.domain.domainEndpoint;
         
         // Lambda function to initialize OpenSearch indices
         const initializeOpenSearchLambda = new nodejs.NodejsFunction(this, 'InitializeOpenSearchFunction', {
           functionName: `signal9-opensearch-init-${environmentName}`,
           entry: 'lambda/opensearch/initialize-indices.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(10),
           memorySize: 512,
           vpc,
           vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
           securityGroups: [openSearchSecurityGroup],
           environment: {
             OPENSEARCH_ENDPOINT: this.domain.domainEndpoint,
             ENVIRONMENT: environmentName
           },
           bundling: {
             externalModules: ['@aws-sdk/*'],
             nodeModules: ['@opensearch-project/opensearch']
           }
         });
         
         // Grant OpenSearch access to Lambda
         this.domain.grantReadWrite(initializeOpenSearchLambda);
         
         // Custom resource to initialize indices on stack creation
         const initializeIndicesProvider = new cdk.custom_resources.Provider(this, 'InitializeIndicesProvider', {
           onEventHandler: initializeOpenSearchLambda
         });
         
         new cdk.CustomResource(this, 'InitializeIndicesCustomResource', {
           serviceToken: initializeIndicesProvider.serviceToken,
           properties: {
             DomainEndpoint: this.domain.domainEndpoint,
             Environment: environmentName,
             Timestamp: Date.now() // Force update on each deployment
           }
         });
         
         // Export OpenSearch details
         new cdk.CfnOutput(this, 'OpenSearchDomainEndpoint', {
           value: this.domain.domainEndpoint,
           exportName: `Signal9-${environmentName}-OpenSearch-Endpoint`
         });
         
         new cdk.CfnOutput(this, 'OpenSearchDomainArn', {
           value: this.domain.domainArn,
           exportName: `Signal9-${environmentName}-OpenSearch-Arn`
         });
       }
     }
     ```

  4. **Create Lambda Function for OpenSearch Index Initialization**
     ```typescript
     // lambda/opensearch/initialize-indices.ts
     import { CustomResourceEvent, Context } from 'aws-lambda';
     import { Client } from '@opensearch-project/opensearch';
     import { defaultProvider } from '@aws-sdk/credential-provider-node';
     import { createAwsEsConnector } from '@opensearch-project/opensearch/aws';
     
     interface IndexConfig {
       name: string;
       mappings: any;
       settings: any;
     }
     
     export const handler = async (event: CustomResourceEvent, context: Context) => {
       console.log('Event:', JSON.stringify(event, null, 2));
       
       const client = new Client({
         ...createAwsEsConnector({
           region: process.env.AWS_REGION!,
           getCredentials: () => defaultProvider()()
         }),
         node: `https://${process.env.OPENSEARCH_ENDPOINT}`
       });
       
       const indices: IndexConfig[] = [
         {
           name: 'assets',
           mappings: {
             properties: {
               asset_id: { type: 'keyword' },
               symbol: { type: 'keyword' },
               company_name: { 
                 type: 'text',
                 analyzer: 'standard',
                 fields: {
                   keyword: { type: 'keyword', ignore_above: 256 },
                   suggest: { type: 'completion' }
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
               last_updated: { type: 'date' },
               created_at: { type: 'date' }
             }
           },
           settings: {
             number_of_shards: 1,
             number_of_replicas: process.env.ENVIRONMENT === 'prod' ? 2 : 1,
             refresh_interval: '30s',
             analysis: {
               analyzer: {
                 company_analyzer: {
                   type: 'standard',
                   stopwords: '_english_'
                 }
               }
             }
           }
         },
         {
           name: 'news',
           mappings: {
             properties: {
               news_id: { type: 'keyword' },
               asset_symbol: { type: 'keyword' },
               title: { 
                 type: 'text',
                 analyzer: 'standard',
                 fields: {
                   keyword: { type: 'keyword', ignore_above: 512 }
                 }
               },
               summary: { 
                 type: 'text',
                 analyzer: 'standard'
               },
               url: { type: 'keyword' },
               relevance_score: { type: 'float' },
               sentiment_score: { type: 'float' },
               sentiment_label: { type: 'keyword' },
               time_published: { type: 'date' },
               source: { type: 'keyword' },
               topics: { type: 'keyword' },
               overall_sentiment_score: { type: 'float' },
               overall_sentiment_label: { type: 'keyword' },
               ticker_sentiment: {
                 type: 'nested',
                 properties: {
                   ticker: { type: 'keyword' },
                   relevance_score: { type: 'float' },
                   ticker_sentiment_score: { type: 'float' },
                   ticker_sentiment_label: { type: 'keyword' }
                 }
               }
             }
           },
           settings: {
             number_of_shards: 2,
             number_of_replicas: process.env.ENVIRONMENT === 'prod' ? 2 : 1,
             refresh_interval: '5s'
           }
         },
         {
           name: 'analysis',
           mappings: {
             properties: {
               analysis_id: { type: 'keyword' },
               asset_id: { type: 'keyword' },
               asset_symbol: { type: 'keyword' },
               investment_rating: { type: 'float' },
               rating_confidence: { type: 'float' },
               rating_components: {
                 type: 'object',
                 properties: {
                   financial_health: { type: 'float' },
                   growth_potential: { type: 'float' },
                   risk_assessment: { type: 'float' },
                   market_sentiment: { type: 'float' },
                   peer_comparison: { type: 'float' }
                 }
               },
               financial_metrics: {
                 type: 'object',
                 properties: {
                   pe_ratio: { type: 'float' },
                   market_cap: { type: 'long' },
                   revenue_growth: { type: 'float' },
                   profit_margin: { type: 'float' },
                   debt_to_equity: { type: 'float' },
                   roe: { type: 'float' },
                   roa: { type: 'float' }
                 }
               },
               analysis_date: { type: 'date' },
               analysis_type: { type: 'keyword' },
               created_at: { type: 'date' },
               updated_at: { type: 'date' }
             }
           },
           settings: {
             number_of_shards: 1,
             number_of_replicas: process.env.ENVIRONMENT === 'prod' ? 2 : 1,
             refresh_interval: '10s'
           }
         }
       ];
       
       try {
         for (const indexConfig of indices) {
           try {
             // Check if index exists
             const exists = await client.indices.exists({
               index: indexConfig.name
             });
             
             if (!exists.body) {
               // Create index
               await client.indices.create({
                 index: indexConfig.name,
                 body: {
                   mappings: indexConfig.mappings,
                   settings: indexConfig.settings
                 }
               });
               console.log(`Created index: ${indexConfig.name}`);
             } else {
               console.log(`Index ${indexConfig.name} already exists`);
               
               // Update mapping (add new fields only)
               await client.indices.putMapping({
                 index: indexConfig.name,
                 body: indexConfig.mappings
               });
               console.log(`Updated mapping for index: ${indexConfig.name}`);
             }
           } catch (error) {
             console.error(`Error processing index ${indexConfig.name}:`, error);
             throw error;
           }
         }
         
         return {
           statusCode: 200,
           body: JSON.stringify({
             message: 'OpenSearch indices initialized successfully',
             indices: indices.map(i => i.name)
           })
         };
         
       } catch (error) {
         console.error('Error initializing OpenSearch indices:', error);
         throw error;
       }
     };
     ```

  5. **Create ElastiCache Redis Stack**
     ```typescript
     // lib/elasticache-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as elasticache from 'aws-cdk-lib/aws-elasticache';
     import * as ec2 from 'aws-cdk-lib/aws-ec2';
     import { Construct } from 'constructs';
     
     export interface ElastiCacheStackProps extends cdk.StackProps {
       environmentName: string;
       vpc: ec2.Vpc;
     }
     
     export class ElastiCacheStack extends cdk.Stack {
       public readonly redisCluster: elasticache.CfnCacheCluster;
       public readonly redisEndpoint: string;
       public readonly redisPort: string;
       public readonly securityGroup: ec2.SecurityGroup;
       
       constructor(scope: Construct, id: string, props: ElastiCacheStackProps) {
         super(scope, id, props);
         
         const { environmentName, vpc } = props;
         
         // Redis parameter group
         const redisParameterGroup = new elasticache.CfnParameterGroup(this, 'RedisParameterGroup', {
           family: 'redis7.x',
           description: `Parameter group for Signal9 Redis - ${environmentName}`,
           properties: {
             'maxmemory-policy': 'allkeys-lru',
             'notify-keyspace-events': 'Ex',
             'timeout': '300',
             'tcp-keepalive': '300',
             'databases': '16'
           }
         });
         
         // Redis subnet group
         const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
           description: 'Subnet group for Redis cluster',
           subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
           cacheSubnetGroupName: `signal9-redis-subnet-group-${environmentName}`
         });
         
         // Security group for Redis
         this.securityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
           vpc,
           description: 'Security group for Redis cluster',
           allowAllOutbound: false
         });
         
         // Allow Redis access from Lambda functions in VPC
         this.securityGroup.addIngressRule(
           ec2.Peer.ipv4(vpc.vpcCidrBlock),
           ec2.Port.tcp(6379),
           'Allow Redis access from VPC'
         );
         
         // Redis cluster
         this.redisCluster = new elasticache.CfnCacheCluster(this, 'Signal9RedisCluster', {
           cacheNodeType: environmentName === 'prod' ? 'cache.r7g.large' : 'cache.t4g.micro',
           engine: 'redis',
           engineVersion: '7.0',
           numCacheNodes: 1,
           port: 6379,
           cacheParameterGroupName: redisParameterGroup.ref,
           cacheSubnetGroupName: redisSubnetGroup.ref,
           vpcSecurityGroupIds: [this.securityGroup.securityGroupId],
           preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
           snapshotRetentionLimit: environmentName === 'prod' ? 7 : 1,
           snapshotWindow: '03:00-04:00',
           clusterName: `signal9-redis-${environmentName}`,
           azMode: 'single-az',
           transitEncryptionEnabled: false, // Disabled for VPC internal traffic
           atRestEncryptionEnabled: true
         });
         
         this.redisEndpoint = this.redisCluster.attrRedisEndpointAddress;
         this.redisPort = this.redisCluster.attrRedisEndpointPort;
         
         // Export Redis details
         new cdk.CfnOutput(this, 'RedisEndpoint', {
           value: this.redisEndpoint,
           exportName: `Signal9-${environmentName}-Redis-Endpoint`
         });
         
         new cdk.CfnOutput(this, 'RedisPort', {
           value: this.redisPort,
           exportName: `Signal9-${environmentName}-Redis-Port`
         });
         
         new cdk.CfnOutput(this, 'RedisSecurityGroupId', {
           value: this.securityGroup.securityGroupId,
           exportName: `Signal9-${environmentName}-Redis-SecurityGroup`
         });
       }
     }
     ```

  6. **Create Step Functions Analysis Workflow Stack**
     ```typescript
     // lib/step-functions-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
     import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
     import * as iam from 'aws-cdk-lib/aws-iam';
     import * as ec2 from 'aws-cdk-lib/aws-ec2';
     import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
     import { Construct } from 'constructs';
     
     export interface StepFunctionsStackProps extends cdk.StackProps {
       environmentName: string;
       vpc: ec2.Vpc;
       redisSecurityGroup: ec2.SecurityGroup;
       openSearchSecurityGroup: ec2.SecurityGroup;
       tables: { [key: string]: dynamodb.Table };
       openSearchEndpoint: string;
       redisEndpoint: string;
       redisPort: string;
     }
     
     export class StepFunctionsStack extends cdk.Stack {
       public readonly stateMachine: stepfunctions.StateMachine;
       public readonly functions: { [key: string]: lambda.Function };
       
       constructor(scope: Construct, id: string, props: StepFunctionsStackProps) {
         super(scope, id, props);
         
         const { 
           environmentName, 
           vpc, 
           redisSecurityGroup, 
           openSearchSecurityGroup,
           tables,
           openSearchEndpoint,
           redisEndpoint,
           redisPort
         } = props;
         
         // Common Lambda execution role
         const stepFunctionLambdaRole = new iam.Role(this, 'StepFunctionLambdaRole', {
           assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
           managedPolicies: [
             iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
           ]
         });
         
         // Grant DynamoDB access
         Object.values(tables).forEach(table => {
           table.grantReadWriteData(stepFunctionLambdaRole);
         });
         
         // Grant CloudWatch access
         stepFunctionLambdaRole.addToPolicy(new iam.PolicyStatement({
           effect: iam.Effect.ALLOW,
           actions: [
             'logs:CreateLogGroup',
             'logs:CreateLogStream',
             'logs:PutLogEvents',
             'cloudwatch:PutMetricData'
           ],
           resources: ['*']
         }));
         
         // Common environment variables
         const commonEnvironment = {
           ENVIRONMENT: environmentName,
           OPENSEARCH_ENDPOINT: openSearchEndpoint,
           REDIS_ENDPOINT: redisEndpoint,
           REDIS_PORT: redisPort,
           ASSETS_TABLE_NAME: tables.assets.tableName,
           ASSET_ANALYSIS_TABLE_NAME: tables.assetAnalysis.tableName,
           INCOME_STATEMENT_TABLE_NAME: tables.incomeStatement.tableName,
           BALANCE_SHEET_TABLE_NAME: tables.balanceSheet.tableName,
           CASH_FLOW_TABLE_NAME: tables.cashFlow.tableName,
           COMPANY_OVERVIEW_TABLE_NAME: tables.companyOverview.tableName,
           EARNINGS_TABLE_NAME: tables.earnings.tableName,
           AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
         };
         
         // Data Validation Lambda
         const dataValidationLambda = new nodejs.NodejsFunction(this, 'DataValidationFunction', {
           functionName: `signal9-data-validation-${environmentName}`,
           entry: 'lambda/step-functions/data-validation.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(5),
           memorySize: 512,
           role: stepFunctionLambdaRole,
           vpc,
           vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
           securityGroups: [redisSecurityGroup],
           environment: commonEnvironment,
           bundling: {
             externalModules: ['@aws-sdk/*'],
             nodeModules: ['ioredis', 'uuid']
           }
         });
         
         // Rule-Based Analysis Lambda
         const ruleBasedAnalysisLambda = new nodejs.NodejsFunction(this, 'RuleBasedAnalysisFunction', {
           functionName: `signal9-rule-analysis-${environmentName}`,
           entry: 'lambda/step-functions/rule-based-analysis.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(15),
           memorySize: 3008, // Max memory for CPU-intensive analysis
           role: stepFunctionLambdaRole,
           vpc,
           vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
           securityGroups: [redisSecurityGroup, openSearchSecurityGroup],
           environment: commonEnvironment,
           bundling: {
             externalModules: ['@aws-sdk/*'],
             nodeModules: ['ioredis', 'uuid', '@opensearch-project/opensearch']
           }
         });
         
         // Result Storage Lambda
         const resultStorageLambda = new nodejs.NodejsFunction(this, 'ResultStorageFunction', {
           functionName: `signal9-result-storage-${environmentName}`,
           entry: 'lambda/step-functions/result-storage.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(5),
           memorySize: 1024,
           role: stepFunctionLambdaRole,
           vpc,
           vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
           securityGroups: [redisSecurityGroup, openSearchSecurityGroup],
           environment: commonEnvironment,
           bundling: {
             externalModules: ['@aws-sdk/*'],
             nodeModules: ['ioredis', 'uuid', '@opensearch-project/opensearch']
           }
         });
         
         // Notification Lambda
         const notificationLambda = new nodejs.NodejsFunction(this, 'NotificationFunction', {
           functionName: `signal9-notification-${environmentName}`,
           entry: 'lambda/step-functions/notification.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(2),
           memorySize: 256,
           role: stepFunctionLambdaRole,
           environment: {
             ENVIRONMENT: environmentName
           },
           bundling: {
             externalModules: ['@aws-sdk/*']
           }
         });
         
         // Store functions for reference
         this.functions = {
           dataValidation: dataValidationLambda,
           ruleBasedAnalysis: ruleBasedAnalysisLambda,
           resultStorage: resultStorageLambda,
           notification: notificationLambda
         };
         
         // Create Step Functions state machine
         this.stateMachine = new stepfunctions.StateMachine(this, 'AnalysisWorkflow', {
           stateMachineName: `signal9-analysis-workflow-${environmentName}`,
           definition: this.createAnalysisWorkflow(),
           timeout: cdk.Duration.hours(3),
           stateMachineType: stepfunctions.StateMachineType.STANDARD,
           logs: {
             destination: new stepfunctions.LogGroup(this, 'StateMachineLogGroup', {
               logGroupName: `/aws/stepfunctions/signal9-analysis-${environmentName}`
             }),
             level: stepfunctions.LogLevel.ALL
           },
           tracingEnabled: true
         });
         
         // Export state machine ARN
         new cdk.CfnOutput(this, 'AnalysisWorkflowArn', {
           value: this.stateMachine.stateMachineArn,
           exportName: `Signal9-${environmentName}-StepFunctions-Arn`
         });
         
         // Export function ARNs
         Object.entries(this.functions).forEach(([key, func]) => {
           new cdk.CfnOutput(this, `${key}FunctionArn`, {
             value: func.functionArn,
             exportName: `Signal9-${environmentName}-${key}-Function-Arn`
           });
         });
       }
       
       private createAnalysisWorkflow(): stepfunctions.Chain {
         // Data validation task
         const dataValidationTask = new tasks.LambdaInvoke(this, 'DataValidationTask', {
           lambdaFunction: this.functions.dataValidation,
           outputPath: '$.Payload',
           resultPath: '$.validationResult',
           retryOnServiceExceptions: true,
           timeout: cdk.Duration.minutes(5)
         });
         
         // Rule-based analysis task with parallel processing for batches
         const ruleBasedAnalysisTask = new tasks.LambdaInvoke(this, 'RuleBasedAnalysisTask', {
           lambdaFunction: this.functions.ruleBasedAnalysis,
           outputPath: '$.Payload',
           resultPath: '$.analysisResult',
           retryOnServiceExceptions: true,
           timeout: cdk.Duration.minutes(15)
         });
         
         // Result storage task
         const resultStorageTask = new tasks.LambdaInvoke(this, 'ResultStorageTask', {
           lambdaFunction: this.functions.resultStorage,
           outputPath: '$.Payload',
           resultPath: '$.storageResult',
           retryOnServiceExceptions: true,
           timeout: cdk.Duration.minutes(5)
         });
         
         // Notification task
         const notificationTask = new tasks.LambdaInvoke(this, 'NotificationTask', {
           lambdaFunction: this.functions.notification,
           outputPath: '$.Payload',
           retryOnServiceExceptions: true,
           timeout: cdk.Duration.minutes(2)
         });
         
         // Error handling states
         const validationFailedState = new stepfunctions.Fail(this, 'ValidationFailed', {
           cause: 'Data validation failed',
           error: 'VALIDATION_ERROR'
         });
         
         const analysisFailedState = new stepfunctions.Fail(this, 'AnalysisFailed', {
           cause: 'Rule-based analysis failed',
           error: 'ANALYSIS_ERROR'
         });
         
         const storageFailedState = new stepfunctions.Fail(this, 'StorageFailed', {
           cause: 'Result storage failed',
           error: 'STORAGE_ERROR'
         });
         
         // Success state
         const successState = new stepfunctions.Succeed(this, 'AnalysisSucceeded', {
           comment: 'Analysis workflow completed successfully'
         });
         
         // Wait state for rate limiting
         const waitState = new stepfunctions.Wait(this, 'WaitForRateLimit', {
           time: stepfunctions.WaitTime.duration(cdk.Duration.seconds(1))
         });
         
         // Choice states for conditional logic
         const validationChoice = new stepfunctions.Choice(this, 'ValidationChoice')
           .when(
             stepfunctions.Condition.booleanEquals('$.validationResult.isValid', true),
             waitState.next(ruleBasedAnalysisTask)
           )
           .otherwise(validationFailedState);
         
         const analysisChoice = new stepfunctions.Choice(this, 'AnalysisChoice')
           .when(
             stepfunctions.Condition.booleanEquals('$.analysisResult.success', true),
             resultStorageTask
           )
           .otherwise(analysisFailedState);
         
         const storageChoice = new stepfunctions.Choice(this, 'StorageChoice')
           .when(
             stepfunctions.Condition.booleanEquals('$.storageResult.success', true),
             notificationTask.next(successState)
           )
           .otherwise(storageFailedState);
         
         // Build the workflow chain
         ruleBasedAnalysisTask.next(analysisChoice);
         resultStorageTask.next(storageChoice);
         
         // Add error handling to all tasks
         dataValidationTask.addCatch(validationFailedState, {
           errors: ['States.ALL'],
           resultPath: '$.error'
         });
         
         ruleBasedAnalysisTask.addCatch(analysisFailedState, {
           errors: ['States.ALL'],
           resultPath: '$.error'
         });
         
         resultStorageTask.addCatch(storageFailedState, {
           errors: ['States.ALL'],
           resultPath: '$.error'
         });
         
         // Start with data validation
         return dataValidationTask.next(validationChoice);
       }
     }
     ```

  7. **Create Data Validation and Error Handling Stack**
     ```typescript
     // lib/data-validation-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as sqs from 'aws-cdk-lib/aws-sqs';
     import * as sns from 'aws-cdk-lib/aws-sns';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
     import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
     import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
     import * as iam from 'aws-cdk-lib/aws-iam';
     import { Construct } from 'constructs';
     
     export interface DataValidationStackProps extends cdk.StackProps {
       environmentName: string;
     }
     
     export class DataValidationStack extends cdk.Stack {
       public readonly deadLetterQueues: { [key: string]: sqs.Queue };
       public readonly notificationTopic: sns.Topic;
       public readonly dlqProcessorLambda: lambda.Function;
       
       constructor(scope: Construct, id: string, props: DataValidationStackProps) {
         super(scope, id, props);
         
         const { environmentName } = props;
         
         // SNS topic for error notifications
         this.notificationTopic = new sns.Topic(this, 'ErrorNotificationTopic', {
           topicName: `signal9-error-notifications-${environmentName}`,
           displayName: `Signal9 Error Notifications - ${environmentName}`
         });
         
         // Dead letter queues for different processing types
         this.deadLetterQueues = {
           dataPipeline: new sqs.Queue(this, 'DataPipelineDLQ', {
             queueName: `signal9-data-pipeline-dlq-${environmentName}`,
             visibilityTimeout: cdk.Duration.minutes(5),
             retentionPeriod: cdk.Duration.days(14),
             encryption: sqs.QueueEncryption.SQS_MANAGED,
             deadLetterQueue: {
               queue: new sqs.Queue(this, 'DataPipelineDLQDLQ', {
                 queueName: `signal9-data-pipeline-dlq-dlq-${environmentName}`,
                 retentionPeriod: cdk.Duration.days(14)
               }),
               maxReceiveCount: 3
             }
           }),
           
           analysis: new sqs.Queue(this, 'AnalysisDLQ', {
             queueName: `signal9-analysis-dlq-${environmentName}`,
             visibilityTimeout: cdk.Duration.minutes(10),
             retentionPeriod: cdk.Duration.days(14),
             encryption: sqs.QueueEncryption.SQS_MANAGED,
             deadLetterQueue: {
               queue: new sqs.Queue(this, 'AnalysisDLQDLQ', {
                 queueName: `signal9-analysis-dlq-dlq-${environmentName}`,
                 retentionPeriod: cdk.Duration.days(14)
               }),
               maxReceiveCount: 3
             }
           }),
           
           apiProcessing: new sqs.Queue(this, 'ApiProcessingDLQ', {
             queueName: `signal9-api-processing-dlq-${environmentName}`,
             visibilityTimeout: cdk.Duration.minutes(5),
             retentionPeriod: cdk.Duration.days(14),
             encryption: sqs.QueueEncryption.SQS_MANAGED
           })
         };
         
         // DLQ processor Lambda
         this.dlqProcessorLambda = new nodejs.NodejsFunction(this, 'DLQProcessorFunction', {
           functionName: `signal9-dlq-processor-${environmentName}`,
           entry: 'lambda/data-pipeline/dlq-processor.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(5),
           memorySize: 512,
           environment: {
             ENVIRONMENT: environmentName,
             NOTIFICATION_TOPIC_ARN: this.notificationTopic.topicArn
           },
           bundling: {
             externalModules: ['@aws-sdk/*']
           }
         });
         
         // Grant permissions
         this.notificationTopic.grantPublish(this.dlqProcessorLambda);
         Object.values(this.deadLetterQueues).forEach(queue => {
           queue.grantConsumeMessages(this.dlqProcessorLambda);
         });
         
         // CloudWatch metrics and alarms
         const createDLQAlarm = (queueName: string, queue: sqs.Queue) => {
           const messagesVisible = new cloudwatch.Metric({
             namespace: 'AWS/SQS',
             metricName: 'ApproximateNumberOfVisibleMessages',
             dimensionsMap: {
               QueueName: queue.queueName
             },
             statistic: 'Maximum',
             period: cdk.Duration.minutes(5)
           });
           
           const alarm = new cloudwatch.Alarm(this, `${queueName}DLQAlarm`, {
             alarmName: `Signal9-${environmentName}-${queueName}-DLQ-Messages`,
             metric: messagesVisible,
             threshold: 5,
             evaluationPeriods: 1,
             comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
             alarmDescription: `Alert when ${queueName} DLQ has messages`,
             treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
           });
           
           alarm.addAlarmAction(new actions.SnsAction(this.notificationTopic));
           
           return alarm;
         };
         
         // Create alarms for all DLQs
         createDLQAlarm('DataPipeline', this.deadLetterQueues.dataPipeline);
         createDLQAlarm('Analysis', this.deadLetterQueues.analysis);
         createDLQAlarm('ApiProcessing', this.deadLetterQueues.apiProcessing);
         
         // Export DLQ details
         Object.entries(this.deadLetterQueues).forEach(([key, queue]) => {
           new cdk.CfnOutput(this, `${key}DLQUrl`, {
             value: queue.queueUrl,
             exportName: `Signal9-${environmentName}-${key}-DLQ-Url`
           });
           
           new cdk.CfnOutput(this, `${key}DLQArn`, {
             value: queue.queueArn,
             exportName: `Signal9-${environmentName}-${key}-DLQ-Arn`
           });
         });
         
         new cdk.CfnOutput(this, 'ErrorNotificationTopicArn', {
           value: this.notificationTopic.topicArn,
           exportName: `Signal9-${environmentName}-ErrorNotification-Topic-Arn`
         });
       }
     }
     ```

  8. **Create Lambda Functions for Step Functions Tasks**

     **Data Validation Lambda:**
     ```typescript
     // lambda/step-functions/data-validation.ts
     import { EventBridgeEvent } from 'aws-lambda';
     import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
     import { DynamoDBDocumentClient, GetCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
     import Redis from 'ioredis';
     import { v4 as uuidv4 } from 'uuid';
     
     const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
     let redisClient: Redis | null = null;
     
     interface ValidationInput {
       assetIds: string[];
       validationId?: string;
       batchSize?: number;
     }
     
     interface ValidationResult {
       isValid: boolean;
       validAssets: string[];
       invalidAssets: { assetId: string; reason: string }[];
       validationId: string;
       timestamp: string;
       batchSize: number;
     }
     
     export const handler = async (event: ValidationInput): Promise<ValidationResult> => {
       const validationId = event.validationId || uuidv4();
       const batchSize = event.batchSize || 8;
       
       console.log(`Starting data validation for ${event.assetIds.length} assets`, {
         validationId,
         assetIds: event.assetIds,
         batchSize
       });
       
       try {
         // Initialize Redis connection if needed
         if (!redisClient) {
           redisClient = new Redis({
             host: process.env.REDIS_ENDPOINT!,
             port: parseInt(process.env.REDIS_PORT!),
             retryDelayOnFailover: 100,
             maxRetriesPerRequest: 3,
             lazyConnect: true
           });
         }
         
         const validAssets: string[] = [];
         const invalidAssets: { assetId: string; reason: string }[] = [];
         
         // Validate batch size
         if (event.assetIds.length > batchSize) {
           throw new Error(`Batch size ${event.assetIds.length} exceeds maximum of ${batchSize}`);
         }
         
         // Validate each asset
         for (const assetId of event.assetIds) {
           try {
             const isValid = await validateAsset(assetId);
             if (isValid) {
               validAssets.push(assetId);
             } else {
               invalidAssets.push({
                 assetId,
                 reason: 'Asset validation failed - missing required data'
               });
             }
           } catch (error) {
             console.error(`Error validating asset ${assetId}:`, error);
             invalidAssets.push({
               assetId,
               reason: `Validation error: ${error.message}`
             });
           }
         }
         
         const result: ValidationResult = {
           isValid: validAssets.length > 0 && invalidAssets.length === 0,
           validAssets,
           invalidAssets,
           validationId,
           timestamp: new Date().toISOString(),
           batchSize
         };
         
         // Cache validation result
         if (redisClient) {
           await redisClient.setex(
             `validation:${validationId}`,
             3600, // 1 hour TTL
             JSON.stringify(result)
           );
         }
         
         console.log('Data validation completed', {
           validationId,
           validAssets: validAssets.length,
           invalidAssets: invalidAssets.length,
           isValid: result.isValid
         });
         
         return result;
         
       } catch (error) {
         console.error('Data validation failed:', error);
         throw error;
       }
     };
     
     async function validateAsset(assetId: string): Promise<boolean> {
       try {
         // Check if asset exists
         const assetResponse = await dynamoClient.send(new GetCommand({
           TableName: process.env.ASSETS_TABLE_NAME!,
           Key: { asset_id: assetId }
         }));
         
         if (!assetResponse.Item || assetResponse.Item.status !== 'active') {
           return false;
         }
         
         // Check for required financial data
         const requiredTables = [
           process.env.COMPANY_OVERVIEW_TABLE_NAME!,
           process.env.INCOME_STATEMENT_TABLE_NAME!,
           process.env.BALANCE_SHEET_TABLE_NAME!,
           process.env.CASH_FLOW_TABLE_NAME!
         ];
         
         for (const tableName of requiredTables) {
           const dataResponse = await dynamoClient.send(new GetCommand({
             TableName: tableName,
             Key: { asset_id: assetId }
           }));
           
           if (!dataResponse.Item) {
             console.log(`Missing data in ${tableName} for asset ${assetId}`);
             return false;
           }
         }
         
         return true;
         
       } catch (error) {
         console.error(`Error validating asset ${assetId}:`, error);
         return false;
       }
     }
     ```

     **Rule-Based Analysis Lambda:**
     ```typescript
     // lambda/step-functions/rule-based-analysis.ts
     import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
     import { DynamoDBDocumentClient, GetCommand, PutCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
     import { Client } from '@opensearch-project/opensearch';
     import { defaultProvider } from '@aws-sdk/credential-provider-node';
     import { createAwsEsConnector } from '@opensearch-project/opensearch/aws';
     import Redis from 'ioredis';
     import { v4 as uuidv4 } from 'uuid';
     
     const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
     let openSearchClient: Client | null = null;
     let redisClient: Redis | null = null;
     
     interface AnalysisInput {
       validAssets: string[];
       validationId: string;
       batchSize: number;
     }
     
     interface AnalysisResult {
       success: boolean;
       processedAssets: string[];
       failedAssets: { assetId: string; error: string }[];
       analysisId: string;
       timestamp: string;
       totalProcessed: number;
     }
     
     interface FinancialData {
       companyOverview: any;
       incomeStatement: any;
       balanceSheet: any;
       cashFlow: any;
       earnings: any;
     }
     
     interface AnalysisComponents {
       financial_health: number;
       growth_potential: number;
       risk_assessment: number;
       market_sentiment: number;
       peer_comparison: number;
     }
     
     export const handler = async (event: AnalysisInput): Promise<AnalysisResult> => {
       const analysisId = uuidv4();
       
       console.log(`Starting rule-based analysis for ${event.validAssets.length} assets`, {
         analysisId,
         validationId: event.validationId,
         assets: event.validAssets
       });
       
       try {
         // Initialize clients
         await initializeClients();
         
         const processedAssets: string[] = [];
         const failedAssets: { assetId: string; error: string }[] = [];
         
         // Process each asset
         for (const assetId of event.validAssets) {
           try {
             const analysis = await processAsset(assetId, analysisId);
             if (analysis) {
               processedAssets.push(assetId);
             } else {
               failedAssets.push({
                 assetId,
                 error: 'Analysis processing failed'
               });
             }
           } catch (error) {
             console.error(`Error processing asset ${assetId}:`, error);
             failedAssets.push({
               assetId,
               error: error.message
             });
           }
         }
         
         const result: AnalysisResult = {
           success: processedAssets.length > 0,
           processedAssets,
           failedAssets,
           analysisId,
           timestamp: new Date().toISOString(),
           totalProcessed: processedAssets.length
         };
         
         console.log('Rule-based analysis completed', {
           analysisId,
           processed: processedAssets.length,
           failed: failedAssets.length,
           success: result.success
         });
         
         return result;
         
       } catch (error) {
         console.error('Rule-based analysis failed:', error);
         throw error;
       }
     };
     
     async function initializeClients() {
       if (!openSearchClient) {
         openSearchClient = new Client({
           ...createAwsEsConnector({
             region: process.env.AWS_REGION!,
             getCredentials: () => defaultProvider()()
           }),
           node: `https://${process.env.OPENSEARCH_ENDPOINT!}`
         });
       }
       
       if (!redisClient) {
         redisClient = new Redis({
           host: process.env.REDIS_ENDPOINT!,
           port: parseInt(process.env.REDIS_PORT!),
           retryDelayOnFailover: 100,
           maxRetriesPerRequest: 3,
           lazyConnect: true
         });
       }
     }
     
     async function processAsset(assetId: string, analysisId: string): Promise<boolean> {
       try {
         // Load financial data
         const financialData = await loadFinancialData(assetId);
         if (!financialData) {
           console.log(`No financial data found for asset ${assetId}`);
           return false;
         }
         
         // Perform rule-based analysis
         const analysisComponents = calculateAnalysisComponents(financialData);
         const investmentRating = calculateInvestmentRating(analysisComponents);
         const confidence = calculateConfidence(analysisComponents, financialData);
         
         // Create analysis record
         const analysisRecord = {
           analysis_id: `${analysisId}_${assetId}`,
           asset_id: assetId,
           asset_symbol: financialData.companyOverview.Symbol,
           investment_rating: investmentRating,
           rating_confidence: confidence,
           rating_components: analysisComponents,
           financial_metrics: extractFinancialMetrics(financialData),
           analysis_date: new Date().toISOString(),
           analysis_type: 'rule_based',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         };
         
         // Store in DynamoDB
         await dynamoClient.send(new PutCommand({
           TableName: process.env.ASSET_ANALYSIS_TABLE_NAME!,
           Item: analysisRecord
         }));
         
         // Index in OpenSearch
         if (openSearchClient) {
           await openSearchClient.index({
             index: 'analysis',
             id: analysisRecord.analysis_id,
             body: analysisRecord
           });
         }
         
         // Cache in Redis
         if (redisClient) {
           await redisClient.setex(
             `analysis:${assetId}`,
             3600, // 1 hour TTL
             JSON.stringify(analysisRecord)
           );
         }
         
         console.log(`Analysis completed for asset ${assetId}`, {
           rating: investmentRating,
           confidence: confidence
         });
         
         return true;
         
       } catch (error) {
         console.error(`Error processing asset ${assetId}:`, error);
         return false;
       }
     }
     
     async function loadFinancialData(assetId: string): Promise<FinancialData | null> {
       try {
         const [companyOverview, incomeStatement, balanceSheet, cashFlow, earnings] = await Promise.all([
           dynamoClient.send(new GetCommand({
             TableName: process.env.COMPANY_OVERVIEW_TABLE_NAME!,
             Key: { asset_id: assetId }
           })),
           dynamoClient.send(new GetCommand({
             TableName: process.env.INCOME_STATEMENT_TABLE_NAME!,
             Key: { asset_id: assetId }
           })),
           dynamoClient.send(new GetCommand({
             TableName: process.env.BALANCE_SHEET_TABLE_NAME!,
             Key: { asset_id: assetId }
           })),
           dynamoClient.send(new GetCommand({
             TableName: process.env.CASH_FLOW_TABLE_NAME!,
             Key: { asset_id: assetId }
           })),
           dynamoClient.send(new GetCommand({
             TableName: process.env.EARNINGS_TABLE_NAME!,
             Key: { asset_id: assetId }
           }))
         ]);
         
         if (!companyOverview.Item || !incomeStatement.Item || !balanceSheet.Item || !cashFlow.Item) {
           return null;
         }
         
         return {
           companyOverview: companyOverview.Item,
           incomeStatement: incomeStatement.Item,
           balanceSheet: balanceSheet.Item,
           cashFlow: cashFlow.Item,
           earnings: earnings.Item
         };
         
       } catch (error) {
         console.error(`Error loading financial data for ${assetId}:`, error);
         return null;
       }
     }
     
     function calculateAnalysisComponents(data: FinancialData): AnalysisComponents {
       // Financial Health Component (30% weight)
       const financial_health = calculateFinancialHealth(data);
       
       // Growth Potential Component (25% weight)
       const growth_potential = calculateGrowthPotential(data);
       
       // Risk Assessment Component (20% weight)
       const risk_assessment = calculateRiskAssessment(data);
       
       // Market Sentiment Component (15% weight)
       const market_sentiment = calculateMarketSentiment(data);
       
       // Peer Comparison Component (10% weight)
       const peer_comparison = calculatePeerComparison(data);
       
       return {
         financial_health,
         growth_potential,
         risk_assessment,
         market_sentiment,
         peer_comparison
       };
     }
     
     function calculateFinancialHealth(data: FinancialData): number {
       let score = 0;
       let factors = 0;
       
       // Current Ratio (Balance Sheet)
       const currentRatio = parseFloat(data.companyOverview.CurrentRatio || '0');
       if (currentRatio > 0) {
         factors++;
         if (currentRatio >= 2.0) score += 1.0;
         else if (currentRatio >= 1.5) score += 0.8;
         else if (currentRatio >= 1.0) score += 0.6;
         else score += 0.3;
       }
       
       // Debt to Equity Ratio
       const debtToEquity = parseFloat(data.companyOverview.DebtToEquityRatio || '0');
       if (debtToEquity >= 0) {
         factors++;
         if (debtToEquity <= 0.3) score += 1.0;
         else if (debtToEquity <= 0.6) score += 0.8;
         else if (debtToEquity <= 1.0) score += 0.6;
         else score += 0.3;
       }
       
       // Return on Equity
       const roe = parseFloat(data.companyOverview.ReturnOnEquityTTM || '0');
       if (roe > 0) {
         factors++;
         if (roe >= 0.2) score += 1.0;
         else if (roe >= 0.15) score += 0.8;
         else if (roe >= 0.1) score += 0.6;
         else score += 0.3;
       }
       
       // Profit Margin
       const profitMargin = parseFloat(data.companyOverview.ProfitMargin || '0');
       if (profitMargin > 0) {
         factors++;
         if (profitMargin >= 0.2) score += 1.0;
         else if (profitMargin >= 0.15) score += 0.8;
         else if (profitMargin >= 0.1) score += 0.6;
         else score += 0.3;
       }
       
       return factors > 0 ? Math.min(5.0, (score / factors) * 5) : 2.5;
     }
     
     function calculateGrowthPotential(data: FinancialData): number {
       let score = 0;
       let factors = 0;
       
       // Revenue Growth
       const revenueGrowth = parseFloat(data.companyOverview.QuarterlyRevenueGrowthYOY || '0');
       if (revenueGrowth !== 0) {
         factors++;
         if (revenueGrowth >= 0.2) score += 1.0;
         else if (revenueGrowth >= 0.1) score += 0.8;
         else if (revenueGrowth >= 0.05) score += 0.6;
         else if (revenueGrowth >= 0) score += 0.4;
         else score += 0.2;
       }
       
       // Earnings Growth
       const earningsGrowth = parseFloat(data.companyOverview.QuarterlyEarningsGrowthYOY || '0');
       if (earningsGrowth !== 0) {
         factors++;
         if (earningsGrowth >= 0.2) score += 1.0;
         else if (earningsGrowth >= 0.1) score += 0.8;
         else if (earningsGrowth >= 0.05) score += 0.6;
         else if (earningsGrowth >= 0) score += 0.4;
         else score += 0.2;
       }
       
       return factors > 0 ? Math.min(5.0, (score / factors) * 5) : 2.5;
     }
     
     function calculateRiskAssessment(data: FinancialData): number {
       let score = 5.0; // Start with low risk (high score)
       
       // Beta (market risk)
       const beta = parseFloat(data.companyOverview.Beta || '1');
       if (beta > 1.5) score -= 1.0;
       else if (beta > 1.2) score -= 0.5;
       
       // P/E Ratio (valuation risk)
       const peRatio = parseFloat(data.companyOverview.PERatio || '0');
       if (peRatio > 30) score -= 1.0;
       else if (peRatio > 20) score -= 0.5;
       
       // Debt levels
       const debtToEquity = parseFloat(data.companyOverview.DebtToEquityRatio || '0');
       if (debtToEquity > 1.0) score -= 1.0;
       else if (debtToEquity > 0.6) score -= 0.5;
       
       return Math.max(1.0, Math.min(5.0, score));
     }
     
     function calculateMarketSentiment(data: FinancialData): number {
       // Simplified market sentiment based on analyst target price
       const currentPrice = parseFloat(data.companyOverview.LastPrice || '0');
       const targetPrice = parseFloat(data.companyOverview.AnalystTargetPrice || '0');
       
       if (currentPrice > 0 && targetPrice > 0) {
         const upside = (targetPrice - currentPrice) / currentPrice;
         if (upside >= 0.2) return 5.0;
         else if (upside >= 0.1) return 4.0;
         else if (upside >= 0.05) return 3.5;
         else if (upside >= 0) return 3.0;
         else if (upside >= -0.1) return 2.5;
         else return 2.0;
       }
       
       return 3.0; // Neutral sentiment
     }
     
     function calculatePeerComparison(data: FinancialData): number {
       // Simplified peer comparison - would need industry averages for full implementation
       // For now, use relative metrics
       const peRatio = parseFloat(data.companyOverview.PERatio || '0');
       const profitMargin = parseFloat(data.companyOverview.ProfitMargin || '0');
       
       let score = 3.0; // Start neutral
       
       // P/E comparison (lower is generally better for value)
       if (peRatio > 0 && peRatio < 15) score += 0.5;
       else if (peRatio > 25) score -= 0.5;
       
       // Profit margin comparison
       if (profitMargin > 0.15) score += 0.5;
       else if (profitMargin < 0.05) score -= 0.5;
       
       return Math.max(1.0, Math.min(5.0, score));
     }
     
     function calculateInvestmentRating(components: AnalysisComponents): number {
       // Weighted average of components
       const weights = {
         financial_health: 0.30,
         growth_potential: 0.25,
         risk_assessment: 0.20,
         market_sentiment: 0.15,
         peer_comparison: 0.10
       };
       
       const rating = 
         components.financial_health * weights.financial_health +
         components.growth_potential * weights.growth_potential +
         components.risk_assessment * weights.risk_assessment +
         components.market_sentiment * weights.market_sentiment +
         components.peer_comparison * weights.peer_comparison;
       
       return Math.round(rating * 10) / 10; // Round to 1 decimal place
     }
     
     function calculateConfidence(components: AnalysisComponents, data: FinancialData): number {
       // Calculate confidence based on data completeness and consistency
       let confidence = 0.8; // Base confidence
       
       // Check data completeness
       const requiredFields = ['PERatio', 'ProfitMargin', 'ReturnOnEquityTTM', 'CurrentRatio'];
       const availableFields = requiredFields.filter(field => 
         data.companyOverview[field] && parseFloat(data.companyOverview[field]) !== 0
       );
       
       const completeness = availableFields.length / requiredFields.length;
       confidence *= completeness;
       
       // Adjust for extreme values (might indicate data issues)
       const componentValues = Object.values(components);
       const extremeValues = componentValues.filter(v => v <= 1.0 || v >= 5.0).length;
       if (extremeValues > 2) confidence *= 0.8;
       
       return Math.max(0.3, Math.min(1.0, confidence));
     }
     
     function extractFinancialMetrics(data: FinancialData) {
       return {
         pe_ratio: parseFloat(data.companyOverview.PERatio || '0'),
         market_cap: parseInt(data.companyOverview.MarketCapitalization || '0'),
         revenue_growth: parseFloat(data.companyOverview.QuarterlyRevenueGrowthYOY || '0'),
         profit_margin: parseFloat(data.companyOverview.ProfitMargin || '0'),
         debt_to_equity: parseFloat(data.companyOverview.DebtToEquityRatio || '0'),
         roe: parseFloat(data.companyOverview.ReturnOnEquityTTM || '0'),
         roa: parseFloat(data.companyOverview.ReturnOnAssetsTTM || '0'),
         current_ratio: parseFloat(data.companyOverview.CurrentRatio || '0'),
         beta: parseFloat(data.companyOverview.Beta || '0'),
         earnings_growth: parseFloat(data.companyOverview.QuarterlyEarningsGrowthYOY || '0')
       };
     }
     ```

  9. **Update Main CDK App to Include Data Pipeline Stacks**
     ```typescript
     // bin/signal9-advisor.ts - Add to existing app
     
     // ... existing imports and stacks ...
     
     import { VpcStack } from '../lib/vpc-stack';
     import { OpenSearchStack } from '../lib/opensearch-stack';
     import { ElastiCacheStack } from '../lib/elasticache-stack';
     import { StepFunctionsStack } from '../lib/step-functions-stack';
     import { DataValidationStack } from '../lib/data-validation-stack';
     
     // ... existing stacks creation ...
     
     // 7. VPC for data pipeline (depends on nothing)
     const vpcStack = new VpcStack(app, `Signal9VpcStack-${environmentName}`, {
       ...commonProps
     });
     
     // 8. OpenSearch (depends on VPC)
     const openSearchStack = new OpenSearchStack(app, `Signal9OpenSearchStack-${environmentName}`, {
       ...commonProps,
       vpc: vpcStack.vpc
     });
     openSearchStack.addDependency(vpcStack);
     
     // 9. ElastiCache (depends on VPC)
     const elastiCacheStack = new ElastiCacheStack(app, `Signal9ElastiCacheStack-${environmentName}`, {
       ...commonProps,
       vpc: vpcStack.vpc
     });
     elastiCacheStack.addDependency(vpcStack);
     
     // 10. Data Validation and Error Handling
     const dataValidationStack = new DataValidationStack(app, `Signal9DataValidationStack-${environmentName}`, {
       ...commonProps
     });
     
     // 11. Step Functions (depends on VPC, OpenSearch, ElastiCache, Database)
     const stepFunctionsStack = new StepFunctionsStack(app, `Signal9StepFunctionsStack-${environmentName}`, {
       ...commonProps,
       vpc: vpcStack.vpc,
       redisSecurityGroup: elastiCacheStack.securityGroup,
       openSearchSecurityGroup: openSearchStack.domain.connections.securityGroups[0],
       tables: databaseStack.tables,
       openSearchEndpoint: openSearchStack.domainEndpoint,
       redisEndpoint: elastiCacheStack.redisEndpoint,
       redisPort: elastiCacheStack.redisPort
     });
     stepFunctionsStack.addDependency(vpcStack);
     stepFunctionsStack.addDependency(openSearchStack);
     stepFunctionsStack.addDependency(elastiCacheStack);
     stepFunctionsStack.addDependency(databaseStack);
     
     // Update existing monitoring stack to include new components
     const monitoringStack = new MonitoringStack(app, `Signal9MonitoringStack-${environmentName}`, {
       ...commonProps,
       functions: {
         ...lambdaStack.functions,
         ...stepFunctionsStack.functions
       }
     });
     monitoringStack.addDependency(stepFunctionsStack);
     
     // ... rest of existing code ...
     ```

  10. **Deploy Data Pipeline Infrastructure in Correct Order**
      ```bash
      # Navigate to infrastructure directory
      cd signal9-advisor/infrastructure
      
      # Ensure all dependencies are installed
      npm install
      npm run build
      
      # Deploy in dependency order
      echo "Deploying VPC stack..."
      npx cdk deploy Signal9VpcStack-dev --require-approval never
      
      echo "Deploying OpenSearch stack..."
      npx cdk deploy Signal9OpenSearchStack-dev --require-approval never
      
      echo "Deploying ElastiCache stack..."
      npx cdk deploy Signal9ElastiCacheStack-dev --require-approval never
      
      echo "Deploying Data Validation stack..."
      npx cdk deploy Signal9DataValidationStack-dev --require-approval never
      
      echo "Deploying Step Functions stack..."
      npx cdk deploy Signal9StepFunctionsStack-dev --require-approval never
      
      # Verify all deployments
      npx cdk list | grep -E "(Vpc|OpenSearch|ElastiCache|DataValidation|StepFunctions)"
      
      # Test OpenSearch connectivity
      OPENSEARCH_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name Signal9OpenSearchStack-dev \
        --query 'Stacks[0].Outputs[?OutputKey==`OpenSearchDomainEndpoint`].OutputValue' \
        --output text)
      
      echo "OpenSearch endpoint: $OPENSEARCH_ENDPOINT"
      
      # Test Redis connectivity  
      REDIS_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name Signal9ElastiCacheStack-dev \
        --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' \
        --output text)
      
      echo "Redis endpoint: $REDIS_ENDPOINT"
      
      # Test Step Functions
      STATE_MACHINE_ARN=$(aws cloudformation describe-stacks \
        --stack-name Signal9StepFunctionsStack-dev \
        --query 'Stacks[0].Outputs[?OutputKey==`AnalysisWorkflowArn`].OutputValue' \
        --output text)
      
      echo "Step Functions ARN: $STATE_MACHINE_ARN"
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

**CRITICAL: These must be completed before starting this ticket**

- **Prerequisites**:
  - Phase 1 Task 1: AWS Infrastructure Setup (COMPLETED and verified)
  - Node.js v18+ and npm installed locally
  - AWS CDK CLI v2.110.0+ installed globally
  - All Phase 1 Task 1 stacks deployed successfully
  - DynamoDB tables created and accessible (verified via AWS CLI)
  - Lambda functions with proper IAM roles (verified via AWS Console)
  - EventBridge rules configured (verified via AWS Console)
  - Sufficient AWS permissions for VPC, OpenSearch, ElastiCache, Step Functions

- **External Dependencies**:
  - AWS Account with VPC creation permissions
  - OpenSearch domain creation permissions
  - ElastiCache cluster creation permissions
  - Step Functions creation permissions
  - Minimum 3 Availability Zones in selected region

- **Dependent Tickets**:
  - Phase 1 Task 3: AlphaVantage API Integration (will use OpenSearch and Redis)
  - Phase 1 Task 4: Alpaca API Integration (will use OpenSearch and Redis)
  - Phase 1 Task 5: Event-Driven Processing Implementation (will use Step Functions)

#### Testing Requirements

**CRITICAL: All tests must pass before ticket completion**

- **Unit Tests**:
  ```bash
  # Create test structure for data pipeline
  mkdir -p test/unit/data-pipeline
  mkdir -p test/integration/data-pipeline
  
  # Install test dependencies
  npm install --save-dev @opensearch-project/opensearch-test
  npm install --save-dev ioredis-mock@8.9.0
  
  # Run unit tests
  npm test -- --testPathPattern=data-pipeline
  ```

  Required test coverage:
  - VpcStack: VPC creation, subnet configuration, endpoints
  - OpenSearchStack: Domain creation, index initialization, security groups
  - ElastiCacheStack: Redis cluster creation, parameter groups, security
  - StepFunctionsStack: State machine definition, Lambda integration, error handling
  - DataValidationStack: DLQ creation, alarm configuration, notification setup
  - Lambda functions: Data validation logic, analysis algorithms, error handling

- **Integration Tests**:
  ```bash
  # Deploy to test environment
  npx cdk deploy --all -c environment=test --require-approval never
  
  # Test OpenSearch connectivity and indexing
  aws lambda invoke \
    --function-name signal9-opensearch-init-test \
    --payload '{"test": true}' \
    response.json
  
  # Test Redis connectivity
  aws lambda invoke \
    --function-name signal9-data-validation-test \
    --payload '{"assetIds": ["TEST_ASSET"], "batchSize": 1}' \
    response.json
  
  # Test Step Functions execution
  aws stepfunctions start-execution \
    --state-machine-arn arn:aws:states:us-east-1:ACCOUNT:stateMachine:signal9-analysis-workflow-test \
    --input '{"assetIds": ["TEST_ASSET"], "batchSize": 1}'
  
  # Verify VPC connectivity
  aws ec2 describe-vpc-endpoints --filters Name=vpc-id,Values=$(aws cloudformation describe-stacks --stack-name Signal9VpcStack-test --query 'Stacks[0].Outputs[?OutputKey==`VpcId`].OutputValue' --output text)
  ```

- **Performance Tests**:
  ```bash
  # Test OpenSearch query performance
  curl -X GET "https://OPENSEARCH_ENDPOINT/assets/_search" \
    -H 'Content-Type: application/json' \
    -d '{"query": {"match_all": {}}, "size": 1000}'
  
  # Test Redis performance
  redis-cli -h REDIS_ENDPOINT -p 6379 --latency-history -i 1
  
  # Test Step Functions performance with batch processing
  aws stepfunctions start-execution \
    --state-machine-arn STATE_MACHINE_ARN \
    --input '{"assetIds": ["ASSET1", "ASSET2", "ASSET3", "ASSET4", "ASSET5", "ASSET6", "ASSET7", "ASSET8"], "batchSize": 8}'
  ```

- **Security Tests**:
  ```bash
  # Test OpenSearch security groups
  aws ec2 describe-security-groups --group-ids OPENSEARCH_SG_ID
  
  # Test Redis security groups  
  aws ec2 describe-security-groups --group-ids REDIS_SG_ID
  
  # Test VPC endpoints
  aws ec2 describe-vpc-endpoints --vpc-endpoint-ids VPC_ENDPOINT_ID
  
  # Validate IAM policies
  aws iam simulate-principal-policy \
    --policy-source-arn LAMBDA_ROLE_ARN \
    --action-names es:ESHttpGet,elasticache:DescribeCacheClusters
  ```

#### Acceptance Criteria

**MANDATORY - All criteria must be verified before marking ticket complete**

**Infrastructure Deployment**:
- [ ] **VERIFIED**: VPC stack deployed with 3 AZs, public/private/isolated subnets
- [ ] **VERIFIED**: VPC endpoints created for S3, DynamoDB, Secrets Manager, EventBridge
- [ ] **VERIFIED**: OpenSearch domain deployed with proper security groups and encryption
- [ ] **VERIFIED**: OpenSearch indices created (assets, news, analysis) with correct mappings
- [ ] **VERIFIED**: ElastiCache Redis cluster deployed in private subnets with encryption
- [ ] **VERIFIED**: Step Functions state machine deployed with all Lambda functions
- [ ] **VERIFIED**: Data validation stack deployed with DLQs and SNS notifications

**Functional Verification**:
- [ ] **VERIFIED**: OpenSearch indices can be created, updated, and queried
- [ ] **VERIFIED**: Redis cluster accepts connections and caching operations
- [ ] **VERIFIED**: Step Functions workflow executes successfully with test data
- [ ] **VERIFIED**: Data validation Lambda processes asset batches correctly
- [ ] **VERIFIED**: Rule-based analysis Lambda generates investment ratings
- [ ] **VERIFIED**: Result storage Lambda saves to DynamoDB and OpenSearch
- [ ] **VERIFIED**: Dead letter queues capture and process failed messages

**Performance Requirements**:
- [ ] **VERIFIED**: OpenSearch query response time <500ms for 1000 records
- [ ] **VERIFIED**: Redis cache operations complete in <10ms
- [ ] **VERIFIED**: Step Functions workflow completes 8-asset batch in <15 minutes
- [ ] **VERIFIED**: Data validation processes 8 assets in <30 seconds
- [ ] **VERIFIED**: Rule-based analysis completes for single asset in <2 minutes

**Security Configuration**:
- [ ] **VERIFIED**: OpenSearch domain only accessible from VPC
- [ ] **VERIFIED**: Redis cluster only accessible from Lambda security groups
- [ ] **VERIFIED**: All data encrypted at rest and in transit
- [ ] **VERIFIED**: IAM roles have minimal required permissions
- [ ] **VERIFIED**: DLQs encrypted with SQS managed keys
- [ ] **VERIFIED**: Step Functions logging enabled with CloudWatch

**Testing and Quality**:
- [ ] **VERIFIED**: Unit tests pass with >85% coverage for all Lambda functions
- [ ] **VERIFIED**: Integration tests pass for all deployed stacks
- [ ] **VERIFIED**: Performance tests meet specified benchmarks
- [ ] **VERIFIED**: Security tests validate access controls
- [ ] **VERIFIED**: CDK synth generates valid CloudFormation templates
- [ ] **VERIFIED**: TypeScript compilation succeeds without errors

**Monitoring and Observability**:
- [ ] **VERIFIED**: CloudWatch metrics published for all components
- [ ] **VERIFIED**: CloudWatch alarms configured for DLQ message counts
- [ ] **VERIFIED**: Step Functions execution logs captured
- [ ] **VERIFIED**: OpenSearch and Redis metrics available in CloudWatch
- [ ] **VERIFIED**: SNS notifications sent for critical errors

**Documentation and Deployment**:
- [ ] **VERIFIED**: All environment variables documented
- [ ] **VERIFIED**: Deployment script runs from clean environment
- [ ] **VERIFIED**: Resource tagging applied consistently
- [ ] **VERIFIED**: CloudFormation outputs exported with proper naming
- [ ] **VERIFIED**: Cost estimation documented (<$200/month for dev environment)

**Data Pipeline Specific**:
- [ ] **VERIFIED**: Batch processing handles exactly 8 assets per batch
- [ ] **VERIFIED**: Investment rating calculation produces values 1.0-5.0
- [ ] **VERIFIED**: Analysis confidence scores between 0.3-1.0
- [ ] **VERIFIED**: Financial metrics extraction works for all data types
- [ ] **VERIFIED**: OpenSearch indexing supports semantic search queries
- [ ] **VERIFIED**: Redis caching improves response times for repeated queries

#### Error Handling

**Comprehensive Error Management Strategy**:

- **VPC and Networking Errors**:
  - **Subnet Availability**: Automatic retry with different AZ if subnet creation fails
  - **NAT Gateway Failures**: Fallback to Internet Gateway for development environments
  - **VPC Endpoint Issues**: Graceful degradation to Internet-based API calls

- **OpenSearch Failures**:
  - **Domain Creation Issues**: Validate minimum requirements and retry with reduced configuration
  - **Index Creation Failures**: Retry with simplified mappings, log detailed errors
  - **Query Failures**: Fallback to DynamoDB direct queries with caching
  - **Connection Timeouts**: Implement exponential backoff with maximum 3 retries

- **ElastiCache Redis Failures**:
  - **Cluster Creation Issues**: Retry with different instance type or single AZ
  - **Connection Failures**: Fallback to in-memory caching for development
  - **Memory Issues**: Implement LRU eviction and monitoring alerts
  - **Network Connectivity**: Validate security groups and retry connection

- **Step Functions Errors**:
  - **State Machine Execution Failures**: Retry with exponential backoff
  - **Lambda Function Timeouts**: Increase timeout and memory, implement checkpointing
  - **Data Validation Failures**: Route to error state with detailed logging
  - **Analysis Processing Errors**: Partial success handling, save completed analyses

- **Lambda Function Errors**:
  - **Cold Start Issues**: Pre-warm functions with scheduled invocations
  - **Memory/Timeout Errors**: Auto-scale memory and implement progress tracking
  - **VPC Connection Issues**: Validate ENI availability and security groups
  - **External Service Failures**: Circuit breaker pattern with fallback responses

#### Monitoring and Observability

**Comprehensive Metrics Collection**:

- **Infrastructure Metrics**:
  ```typescript
  // Custom CloudWatch metrics for data pipeline
  const dataPipelineMetrics = {
    'OpenSearch/QueryLatency': 'Milliseconds',
    'OpenSearch/IndexingRate': 'Count/Second', 
    'Redis/CacheHitRatio': 'Percent',
    'Redis/ConnectionCount': 'Count',
    'StepFunctions/ExecutionDuration': 'Milliseconds',
    'StepFunctions/SuccessRate': 'Percent',
    'DataValidation/BatchProcessingTime': 'Milliseconds',
    'DataValidation/ErrorRate': 'Percent',
    'Analysis/RatingGeneration': 'Count',
    'Analysis/ConfidenceScore': 'Number'
  };
  ```

- **Performance Monitoring**:
  - OpenSearch query performance and errors (target: <500ms)
  - Redis cache hit/miss ratios (target: >90% hit rate)
  - Step Functions execution duration (target: <15 minutes for 8 assets)
  - Lambda function cold start times (target: <3 seconds)
  - Dead letter queue message counts (alert on >5 messages)

- **Business Logic Monitoring**:
  - Investment rating distribution (1.0-5.0 scale)
  - Analysis confidence score distribution (0.3-1.0 range)
  - Batch processing completion rates (target: >95%)
  - Data validation success rates (target: >98%)

- **Cost Monitoring**:
  - OpenSearch instance hours and storage costs
  - ElastiCache instance hours and data transfer
  - Step Functions state transitions and execution time
  - Lambda function invocations and duration
  - Data transfer costs between services

**Alerting Strategy**:
- **Critical Alerts (immediate response)**:
  - Step Functions failure rate >20%
  - OpenSearch cluster health status red
  - Redis cluster unavailable
  - DLQ message count >10
  
- **Warning Alerts (review within 4 hours)**:
  - Performance degradation >25% from baseline
  - Cost increase >50% from projected
  - Data validation failure rate >5%

**Troubleshooting Runbooks**:

1. **OpenSearch Domain Issues**:
   ```bash
   # Check domain status
   aws opensearch describe-domain --domain-name signal9-search-dev
   
   # Check cluster health
   curl -X GET "https://OPENSEARCH_ENDPOINT/_cluster/health?pretty"
   
   # Review CloudWatch logs
   aws logs filter-log-events --log-group-name /aws/opensearch/domains/signal9-search-dev
   ```

2. **Redis Connection Issues**:
   ```bash
   # Test Redis connectivity
   redis-cli -h REDIS_ENDPOINT -p 6379 ping
   
   # Check security groups
   aws ec2 describe-security-groups --group-ids REDIS_SG_ID
   
   # Monitor Redis metrics
   aws cloudwatch get-metric-statistics --namespace AWS/ElastiCache --metric-name CPUUtilization
   ```

3. **Step Functions Debugging**:
   ```bash
   # List failed executions
   aws stepfunctions list-executions --state-machine-arn STATE_MACHINE_ARN --status-filter FAILED
   
   # Get execution details
   aws stepfunctions describe-execution --execution-arn EXECUTION_ARN
   
   # Review execution history
   aws stepfunctions get-execution-history --execution-arn EXECUTION_ARN
   ```

#### Post-Deployment Verification

**MANDATORY - Complete within 24 hours of deployment**:

1. **Infrastructure Verification**:
   ```bash
   # Verify all stacks deployed
   aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE | grep Signal9
   
   # Test VPC connectivity
   aws ec2 describe-vpcs --filters Name=tag:Name,Values=signal9-data-pipeline-vpc-dev
   
   # Verify OpenSearch domain
   aws opensearch describe-domain --domain-name signal9-search-dev
   
   # Check Redis cluster
   aws elasticache describe-cache-clusters --cache-cluster-id signal9-redis-dev
   ```

2. **Functional Testing**:
   ```bash
   # Test OpenSearch index creation
   curl -X PUT "https://OPENSEARCH_ENDPOINT/test-index" \
     -H 'Content-Type: application/json' \
     -d '{"mappings": {"properties": {"test": {"type": "text"}}}}'
   
   # Test Redis operations
   redis-cli -h REDIS_ENDPOINT -p 6379 set test-key "test-value"
   redis-cli -h REDIS_ENDPOINT -p 6379 get test-key
   
   # Execute Step Functions test
   aws stepfunctions start-execution \
     --state-machine-arn STATE_MACHINE_ARN \
     --input '{"assetIds": ["TEST"], "batchSize": 1}' \
     --name "verification-test-$(date +%s)"
   ```

3. **Performance Validation**:
   ```bash
   # Benchmark OpenSearch queries
   ab -n 100 -c 10 -H "Content-Type: application/json" \
     -p query.json https://OPENSEARCH_ENDPOINT/assets/_search
   
   # Test Redis latency
   redis-cli -h REDIS_ENDPOINT -p 6379 --latency
   
   # Monitor Step Functions execution time
   aws cloudwatch get-metric-statistics \
     --namespace AWS/States \
     --metric-name ExecutionTime \
     --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%SZ) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
     --period 300 \
     --statistics Average
   ```

#### Open Questions
- **RESOLVED**: All technical decisions documented and dependencies identified
- **RESOLVED**: OpenSearch vs ElasticSearch decision made (OpenSearch selected)
- **RESOLVED**: Redis vs MemoryDB decision made (Redis selected for cost optimization)
- **RESOLVED**: Step Functions vs Lambda orchestration decision made (Step Functions for complex workflows)
- **RESOLVED**: VPC design strategy finalized (3 AZ deployment with VPC endpoints)

#### Notes
- **Environment Scaling**: Use `--context environment=prod` for production with larger instances
- **Cost Optimization**: Development environment uses minimal instance sizes
- **Performance**: Monitor and scale OpenSearch and Redis based on actual usage patterns
- **Security**: All inter-service communication stays within VPC
- **Maintenance**: Automated backups configured for ElastiCache, OpenSearch handles its own backups
- **Disaster Recovery**: Multi-AZ deployment provides high availability
- **Future Enhancements**: Infrastructure designed to support ML/AI analysis in later phases 
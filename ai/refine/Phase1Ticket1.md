# Ticket 1.1: AWS Infrastructure Setup

**Status**: Refinement Complete

#### Description
Establish the foundational AWS infrastructure for Signal9 Advisor using AWS CDK with TypeScript. This includes setting up the complete serverless architecture with Lambda functions, DynamoDB tables, EventBridge rules, API Gateway, S3 buckets, CloudFront, Secrets Manager, and comprehensive monitoring with CloudWatch. The infrastructure must follow AWS Well-Architected Framework principles and implement proper security configurations.

#### Technical Details
- **Implementation Steps**:
  1. **Initialize CDK Project Structure**
     ```bash
     # Create project directory structure
     mkdir -p signal9-advisor/infrastructure
     cd signal9-advisor/infrastructure
     
     # Initialize CDK project with TypeScript
     cdk init app --language typescript
     
     # Install required dependencies
     npm install aws-cdk-lib constructs
     npm install --save-dev @types/node typescript
     ```

  2. **Configure TypeScript and CDK Settings**
     ```typescript
     // tsconfig.json configuration
     {
       "compilerOptions": {
         "target": "ES2020",
         "module": "commonjs",
         "lib": ["es2020"],
         "declaration": true,
         "strict": true,
         "noImplicitAny": true,
         "strictNullChecks": true,
         "noImplicitReturns": true,
         "noFallthroughCasesInSwitch": false,
         "inlineSourceMap": true,
         "inlineSources": true,
         "experimentalDecorators": true,
         "strictPropertyInitialization": false,
         "typeRoots": ["./node_modules/@types"]
       },
       "exclude": ["node_modules", "cdk.out"]
     }
     ```

  3. **Create DynamoDB Tables**
     ```typescript
     // lib/database-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
     
     export class DatabaseStack extends cdk.Stack {
       constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
         super(scope, id, props);
         
         // Users Table
         const usersTable = new dynamodb.Table(this, 'UsersTable', {
           tableName: 'signal9-users',
           partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
           billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           pointInTimeRecovery: true,
           encryption: dynamodb.TableEncryption.AWS_MANAGED
         });
         
         // Assets Table
         const assetsTable = new dynamodb.Table(this, 'AssetsTable', {
           tableName: 'signal9-assets',
           partitionKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
           billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           pointInTimeRecovery: true,
           encryption: dynamodb.TableEncryption.AWS_MANAGED
         });
         
         // Asset Analysis Table
         const assetAnalysisTable = new dynamodb.Table(this, 'AssetAnalysisTable', {
           tableName: 'signal9-asset-analysis',
           partitionKey: { name: 'analysis_id', type: dynamodb.AttributeType.STRING },
           sortKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
           billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           pointInTimeRecovery: true,
           encryption: dynamodb.TableEncryption.AWS_MANAGED
         });
         
         // Watchlists Table
         const watchlistsTable = new dynamodb.Table(this, 'WatchlistsTable', {
           tableName: 'signal9-watchlists',
           partitionKey: { name: 'watchlist_id', type: dynamodb.AttributeType.STRING },
           sortKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
           billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           pointInTimeRecovery: true,
           encryption: dynamodb.TableEncryption.AWS_MANAGED
         });
         
         // Watchlist Items Table
         const watchlistItemsTable = new dynamodb.Table(this, 'WatchlistItemsTable', {
           tableName: 'signal9-watchlist-items',
           partitionKey: { name: 'item_id', type: dynamodb.AttributeType.STRING },
           sortKey: { name: 'watchlist_id', type: dynamodb.AttributeType.STRING },
           billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           pointInTimeRecovery: true,
           encryption: dynamodb.TableEncryption.AWS_MANAGED
         });
         
         // User Preferences Table
         const userPreferencesTable = new dynamodb.Table(this, 'UserPreferencesTable', {
           tableName: 'signal9-user-preferences',
           partitionKey: { name: 'preference_id', type: dynamodb.AttributeType.STRING },
           sortKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
           billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           pointInTimeRecovery: true,
           encryption: dynamodb.TableEncryption.AWS_MANAGED
         });
         
         // News Table
         const newsTable = new dynamodb.Table(this, 'NewsTable', {
           tableName: 'signal9-news',
           partitionKey: { name: 'news_id', type: dynamodb.AttributeType.STRING },
           sortKey: { name: 'time_published', type: dynamodb.AttributeType.STRING },
           billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           pointInTimeRecovery: true,
           encryption: dynamodb.TableEncryption.AWS_MANAGED
         });
         
         // Earnings Calendar Table
         const earningsCalendarTable = new dynamodb.Table(this, 'EarningsCalendarTable', {
           tableName: 'signal9-earnings-calendar',
           partitionKey: { name: 'calendar_id', type: dynamodb.AttributeType.STRING },
           sortKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
           billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           pointInTimeRecovery: true,
           encryption: dynamodb.TableEncryption.AWS_MANAGED
         });
         
         // Financial Data Tables
         const financialDataTables = {
           incomeStatement: new dynamodb.Table(this, 'IncomeStatementTable', {
             tableName: 'signal9-income-statement',
             partitionKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
             sortKey: { name: 'fiscal_date', type: dynamodb.AttributeType.STRING },
             billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
             removalPolicy: cdk.RemovalPolicy.RETAIN,
             pointInTimeRecovery: true,
             encryption: dynamodb.TableEncryption.AWS_MANAGED
           }),
           
           balanceSheet: new dynamodb.Table(this, 'BalanceSheetTable', {
             tableName: 'signal9-balance-sheet',
             partitionKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
             sortKey: { name: 'fiscal_date', type: dynamodb.AttributeType.STRING },
             billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
             removalPolicy: cdk.RemovalPolicy.RETAIN,
             pointInTimeRecovery: true,
             encryption: dynamodb.TableEncryption.AWS_MANAGED
           }),
           
           cashFlow: new dynamodb.Table(this, 'CashFlowTable', {
             tableName: 'signal9-cash-flow',
             partitionKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
             sortKey: { name: 'fiscal_date', type: dynamodb.AttributeType.STRING },
             billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
             removalPolicy: cdk.RemovalPolicy.RETAIN,
             pointInTimeRecovery: true,
             encryption: dynamodb.TableEncryption.AWS_MANAGED
           }),
           
           companyOverview: new dynamodb.Table(this, 'CompanyOverviewTable', {
             tableName: 'signal9-company-overview',
             partitionKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
             billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
             removalPolicy: cdk.RemovalPolicy.RETAIN,
             pointInTimeRecovery: true,
             encryption: dynamodb.TableEncryption.AWS_MANAGED
           }),
           
           earnings: new dynamodb.Table(this, 'EarningsTable', {
             tableName: 'signal9-earnings',
             partitionKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
             sortKey: { name: 'fiscal_date', type: dynamodb.AttributeType.STRING },
             billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
             removalPolicy: cdk.RemovalPolicy.RETAIN,
             pointInTimeRecovery: true,
             encryption: dynamodb.TableEncryption.AWS_MANAGED
           })
         };
         
         // Export table names for other stacks
         new cdk.CfnOutput(this, 'UsersTableName', { value: usersTable.tableName });
         new cdk.CfnOutput(this, 'AssetsTableName', { value: assetsTable.tableName });
         new cdk.CfnOutput(this, 'AssetAnalysisTableName', { value: assetAnalysisTable.tableName });
       }
     }
     ```

  4. **Set up EventBridge Rules**
     ```typescript
     // lib/eventbridge-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as events from 'aws-cdk-lib/aws-events';
     import * as targets from 'aws-cdk-lib/aws-events-targets';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     
     export class EventBridgeStack extends cdk.Stack {
       constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
         super(scope, id, props);
         
         // 4:00 AM - Asset synchronization with Alpaca API
         const assetSyncRule = new events.Rule(this, 'AssetSyncRule', {
           schedule: events.Schedule.cron({ minute: '0', hour: '4' }),
           description: 'Daily asset synchronization at 4:00 AM'
         });
         
         // 5:00 AM - Earnings calendar synchronization
         const earningsSyncRule = new events.Rule(this, 'EarningsSyncRule', {
           schedule: events.Schedule.cron({ minute: '0', hour: '5' }),
           description: 'Daily earnings calendar sync at 5:00 AM'
         });
         
         // 6:00 AM - Earnings-triggered pollination
         const earningsPollinationRule = new events.Rule(this, 'EarningsPollinationRule', {
           schedule: events.Schedule.cron({ minute: '0', hour: '6' }),
           description: 'Earnings-triggered pollination at 6:00 AM'
         });
         
         // 7:00 AM - Regular pollination
         const regularPollinationRule = new events.Rule(this, 'RegularPollinationRule', {
           schedule: events.Schedule.cron({ minute: '0', hour: '7' }),
           description: 'Regular pollination at 7:00 AM'
         });
         
         // Hourly - News sentiment synchronization
         const newsSyncRule = new events.Rule(this, 'NewsSyncRule', {
           schedule: events.Schedule.cron({ minute: '0' }),
           description: 'Hourly news sentiment sync'
         });
         
         // Custom events for processing
         const pollenationNeededRule = new events.Rule(this, 'PollenationNeededRule', {
           eventPattern: {
             source: ['signal9.advisor'],
             detailType: ['pollenationNeeded']
           },
           description: 'Trigger financial data ingestion for individual assets'
         });
         
         const analysisNeededRule = new events.Rule(this, 'AnalysisNeededRule', {
           eventPattern: {
             source: ['signal9.advisor'],
             detailType: ['analysisNeeded']
           },
           description: 'Trigger rule-based analysis for processed assets'
         });
       }
     }
     ```

  5. **Configure Lambda Functions with IAM Roles**
     ```typescript
     // lib/lambda-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     import * as iam from 'aws-cdk-lib/aws-iam';
     import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
     
     export class LambdaStack extends cdk.Stack {
       constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
         super(scope, id, props);
         
         // Common Lambda execution role
         const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
           assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
           managedPolicies: [
             iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
             iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
           ]
         });
         
         // DynamoDB permissions
         lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
           effect: iam.Effect.ALLOW,
           actions: [
             'dynamodb:GetItem',
             'dynamodb:PutItem',
             'dynamodb:UpdateItem',
             'dynamodb:DeleteItem',
             'dynamodb:Query',
             'dynamodb:Scan',
             'dynamodb:BatchGetItem',
             'dynamodb:BatchWriteItem'
           ],
           resources: [
             'arn:aws:dynamodb:*:*:table/signal9-*'
           ]
         }));
         
         // Secrets Manager permissions
         lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
           effect: iam.Effect.ALLOW,
           actions: [
             'secretsmanager:GetSecretValue'
           ],
           resources: [
             'arn:aws:secretsmanager:*:*:secret:signal9-*'
           ]
         }));
         
         // EventBridge permissions
         lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
           effect: iam.Effect.ALLOW,
           actions: [
             'events:PutEvents'
           ],
           resources: ['*']
         }));
         
         // Asset sync Lambda
         const assetSyncLambda = new nodejs.NodejsFunction(this, 'AssetSyncFunction', {
           entry: 'lambda/asset-sync.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(5),
           memorySize: 512,
           role: lambdaExecutionRole,
           environment: {
             ASSETS_TABLE_NAME: 'signal9-assets',
             ALPACA_SECRET_NAME: 'signal9-alpaca-credentials'
           }
         });
         
         // Earnings sync Lambda
         const earningsSyncLambda = new nodejs.NodejsFunction(this, 'EarningsSyncFunction', {
           entry: 'lambda/earnings-sync.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(5),
           memorySize: 512,
           role: lambdaExecutionRole,
           environment: {
             EARNINGS_TABLE_NAME: 'signal9-earnings-calendar',
             ALPHAVANTAGE_SECRET_NAME: 'signal9-alphavantage-credentials'
           }
         });
         
         // News sync Lambda
         const newsSyncLambda = new nodejs.NodejsFunction(this, 'NewsSyncFunction', {
           entry: 'lambda/news-sync.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(5),
           memorySize: 512,
           role: lambdaExecutionRole,
           environment: {
             NEWS_TABLE_NAME: 'signal9-news',
             ALPHAVANTAGE_SECRET_NAME: 'signal9-alphavantage-credentials'
           }
         });
         
         // Pollination Lambda
         const pollinationLambda = new nodejs.NodejsFunction(this, 'PollinationFunction', {
           entry: 'lambda/pollination.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(10),
           memorySize: 1024,
           role: lambdaExecutionRole,
           environment: {
             ASSETS_TABLE_NAME: 'signal9-assets',
             FINANCIAL_DATA_TABLES: JSON.stringify({
               incomeStatement: 'signal9-income-statement',
               balanceSheet: 'signal9-balance-sheet',
               cashFlow: 'signal9-cash-flow',
               companyOverview: 'signal9-company-overview',
               earnings: 'signal9-earnings'
             }),
             ALPHAVANTAGE_SECRET_NAME: 'signal9-alphavantage-credentials'
           }
         });
         
         // Analysis Lambda
         const analysisLambda = new nodejs.NodejsFunction(this, 'AnalysisFunction', {
           entry: 'lambda/analysis.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(15),
           memorySize: 2048,
           role: lambdaExecutionRole,
           environment: {
             ASSET_ANALYSIS_TABLE_NAME: 'signal9-asset-analysis',
             FINANCIAL_DATA_TABLES: JSON.stringify({
               incomeStatement: 'signal9-income-statement',
               balanceSheet: 'signal9-balance-sheet',
               cashFlow: 'signal9-cash-flow',
               companyOverview: 'signal9-company-overview',
               earnings: 'signal9-earnings'
             })
           }
         });
       }
     }
     ```

  6. **Set up API Gateway**
     ```typescript
     // lib/api-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as apigateway from 'aws-cdk-lib/aws-apigateway';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
     
     export class ApiStack extends cdk.Stack {
       constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
         super(scope, id, props);
         
         // API Gateway
         const api = new apigateway.RestApi(this, 'Signal9Api', {
           restApiName: 'Signal9 Advisor API',
           description: 'API for Signal9 Advisor financial analysis platform',
           defaultCorsPreflightOptions: {
             allowOrigins: apigateway.Cors.ALL_ORIGINS,
             allowMethods: apigateway.Cors.ALL_METHODS,
             allowHeaders: ['Content-Type', 'Authorization']
           }
         });
         
         // Health check Lambda
         const healthCheckLambda = new nodejs.NodejsFunction(this, 'HealthCheckFunction', {
           entry: 'lambda/health-check.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.seconds(30),
           memorySize: 128
         });
         
         // Assets Lambda
         const assetsLambda = new nodejs.NodejsFunction(this, 'AssetsFunction', {
           entry: 'lambda/api/assets.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.seconds(30),
           memorySize: 512,
           environment: {
             ASSETS_TABLE_NAME: 'signal9-assets',
             ASSET_ANALYSIS_TABLE_NAME: 'signal9-asset-analysis'
           }
         });
         
         // Users Lambda
         const usersLambda = new nodejs.NodejsFunction(this, 'UsersFunction', {
           entry: 'lambda/api/users.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.seconds(30),
           memorySize: 512,
           environment: {
             USERS_TABLE_NAME: 'signal9-users',
             USER_PREFERENCES_TABLE_NAME: 'signal9-user-preferences'
           }
         });
         
         // Watchlists Lambda
         const watchlistsLambda = new nodejs.NodejsFunction(this, 'WatchlistsFunction', {
           entry: 'lambda/api/watchlists.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.seconds(30),
           memorySize: 512,
           environment: {
             WATCHLISTS_TABLE_NAME: 'signal9-watchlists',
             WATCHLIST_ITEMS_TABLE_NAME: 'signal9-watchlist-items'
           }
         });
         
         // API Resources and Methods
         const healthResource = api.root.addResource('health');
         healthResource.addMethod('GET', new apigateway.LambdaIntegration(healthCheckLambda));
         
         const assetsResource = api.root.addResource('assets');
         assetsResource.addMethod('GET', new apigateway.LambdaIntegration(assetsLambda));
         
         const assetResource = assetsResource.addResource('{assetId}');
         assetResource.addMethod('GET', new apigateway.LambdaIntegration(assetsLambda));
         
         const usersResource = api.root.addResource('users');
         usersResource.addMethod('POST', new apigateway.LambdaIntegration(usersLambda));
         
         const userResource = usersResource.addResource('{userId}');
         userResource.addMethod('GET', new apigateway.LambdaIntegration(usersLambda));
         userResource.addMethod('PUT', new apigateway.LambdaIntegration(usersLambda));
         userResource.addMethod('DELETE', new apigateway.LambdaIntegration(usersLambda));
         
         const watchlistsResource = api.root.addResource('watchlists');
         watchlistsResource.addMethod('GET', new apigateway.LambdaIntegration(watchlistsLambda));
         watchlistsResource.addMethod('POST', new apigateway.LambdaIntegration(watchlistsLambda));
         
         const watchlistResource = watchlistsResource.addResource('{watchlistId}');
         watchlistResource.addMethod('GET', new apigateway.LambdaIntegration(watchlistsLambda));
         watchlistResource.addMethod('PUT', new apigateway.LambdaIntegration(watchlistsLambda));
         watchlistResource.addMethod('DELETE', new apigateway.LambdaIntegration(watchlistsLambda));
         
         // Export API URL
         new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
       }
     }
     ```

  7. **Configure S3 and CloudFront**
     ```typescript
     // lib/storage-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as s3 from 'aws-cdk-lib/aws-s3';
     import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
     import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
     import * as iam from 'aws-cdk-lib/aws-iam';
     
     export class StorageStack extends cdk.Stack {
       constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
         super(scope, id, props);
         
         // Static assets bucket
         const staticAssetsBucket = new s3.Bucket(this, 'StaticAssetsBucket', {
           bucketName: 'signal9-static-assets',
           versioned: true,
           encryption: s3.BucketEncryption.S3_MANAGED,
           blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           lifecycleRules: [
             {
               id: 'DeleteOldVersions',
               noncurrentVersionExpiration: cdk.Duration.days(30)
             }
           ]
         });
         
         // File storage bucket
         const fileStorageBucket = new s3.Bucket(this, 'FileStorageBucket', {
           bucketName: 'signal9-file-storage',
           versioned: true,
           encryption: s3.BucketEncryption.S3_MANAGED,
           blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           lifecycleRules: [
             {
               id: 'DeleteOldVersions',
               noncurrentVersionExpiration: cdk.Duration.days(30)
             },
             {
               id: 'DeleteOldFiles',
               expiration: cdk.Duration.days(365)
             }
           ]
         });
         
         // CloudFront distribution for static assets
         const distribution = new cloudfront.Distribution(this, 'StaticAssetsDistribution', {
           defaultBehavior: {
             origin: new origins.S3Origin(staticAssetsBucket),
             viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
             cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
             originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN
           },
           additionalBehaviors: {
             '/api/*': {
               origin: new origins.HttpOrigin('api.signal9-advisor.com'),
               viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
               cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED
             }
           },
           errorResponses: [
             {
               httpStatus: 404,
               responseHttpStatus: 200,
               responsePagePath: '/index.html'
             }
           ]
         });
         
         // Export CloudFront URL
         new cdk.CfnOutput(this, 'CloudFrontUrl', { value: distribution.distributionDomainName });
       }
     }
     ```

  8. **Configure AWS Secrets Manager**
     ```typescript
     // lib/secrets-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
     
     export class SecretsStack extends cdk.Stack {
       constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
         super(scope, id, props);
         
         // AlphaVantage API credentials
         const alphaVantageSecret = new secretsmanager.Secret(this, 'AlphaVantageSecret', {
           secretName: 'signal9-alphavantage-credentials',
           description: 'AlphaVantage API credentials for Signal9 Advisor',
           generateSecretString: {
             secretStringTemplate: JSON.stringify({
               apiKey: 'REPLACE_WITH_ACTUAL_API_KEY'
             }),
             generateStringKey: 'password'
           }
         });
         
         // Alpaca API credentials
         const alpacaSecret = new secretsmanager.Secret(this, 'AlpacaSecret', {
           secretName: 'signal9-alpaca-credentials',
           description: 'Alpaca API credentials for Signal9 Advisor',
           generateSecretString: {
             secretStringTemplate: JSON.stringify({
               apiKey: 'REPLACE_WITH_ACTUAL_API_KEY',
               secretKey: 'REPLACE_WITH_ACTUAL_SECRET_KEY'
             }),
             generateStringKey: 'password'
           }
         });
         
         // Export secret ARNs
         new cdk.CfnOutput(this, 'AlphaVantageSecretArn', { value: alphaVantageSecret.secretArn });
         new cdk.CfnOutput(this, 'AlpacaSecretArn', { value: alpacaSecret.secretArn });
       }
     }
     ```

  9. **Implement CloudWatch Monitoring**
     ```typescript
     // lib/monitoring-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
     import * as logs from 'aws-cdk-lib/aws-logs';
     
     export class MonitoringStack extends cdk.Stack {
       constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
         super(scope, id, props);
         
         // CloudWatch Dashboard
         const dashboard = new cloudwatch.Dashboard(this, 'Signal9Dashboard', {
           dashboardName: 'Signal9-Advisor-Monitoring'
         });
         
         // Lambda metrics
         const lambdaMetrics = new cloudwatch.Metric({
           namespace: 'AWS/Lambda',
           metricName: 'Duration',
           statistic: 'Average',
           period: cdk.Duration.minutes(5)
         });
         
         const lambdaErrors = new cloudwatch.Metric({
           namespace: 'AWS/Lambda',
           metricName: 'Errors',
           statistic: 'Sum',
           period: cdk.Duration.minutes(5)
         });
         
         const lambdaInvocations = new cloudwatch.Metric({
           namespace: 'AWS/Lambda',
           metricName: 'Invocations',
           statistic: 'Sum',
           period: cdk.Duration.minutes(5)
         });
         
         // DynamoDB metrics
         const dynamoDBReadCapacity = new cloudwatch.Metric({
           namespace: 'AWS/DynamoDB',
           metricName: 'ConsumedReadCapacityUnits',
           statistic: 'Sum',
           period: cdk.Duration.minutes(5)
         });
         
         const dynamoDBWriteCapacity = new cloudwatch.Metric({
           namespace: 'AWS/DynamoDB',
           metricName: 'ConsumedWriteCapacityUnits',
           statistic: 'Sum',
           period: cdk.Duration.minutes(5)
         });
         
         // API Gateway metrics
         const apiGatewayRequests = new cloudwatch.Metric({
           namespace: 'AWS/ApiGateway',
           metricName: 'Count',
           statistic: 'Sum',
           period: cdk.Duration.minutes(5)
         });
         
         const apiGatewayLatency = new cloudwatch.Metric({
           namespace: 'AWS/ApiGateway',
           metricName: 'Latency',
           statistic: 'Average',
           period: cdk.Duration.minutes(5)
         });
         
         // Add widgets to dashboard
         dashboard.addWidgets(
           new cloudwatch.GraphWidget({
             title: 'Lambda Performance',
             left: [lambdaMetrics],
             right: [lambdaInvocations]
           }),
           new cloudwatch.GraphWidget({
             title: 'Lambda Errors',
             left: [lambdaErrors]
           }),
           new cloudwatch.GraphWidget({
             title: 'DynamoDB Performance',
             left: [dynamoDBReadCapacity],
             right: [dynamoDBWriteCapacity]
           }),
           new cloudwatch.GraphWidget({
             title: 'API Gateway Performance',
             left: [apiGatewayRequests],
             right: [apiGatewayLatency]
           })
         );
         
         // CloudWatch Log Groups
         const logGroups = [
           new logs.LogGroup(this, 'AssetSyncLogGroup', {
             logGroupName: '/aws/lambda/signal9-asset-sync',
             retention: logs.RetentionDays.ONE_MONTH,
             removalPolicy: cdk.RemovalPolicy.DESTROY
           }),
           new logs.LogGroup(this, 'EarningsSyncLogGroup', {
             logGroupName: '/aws/lambda/signal9-earnings-sync',
             retention: logs.RetentionDays.ONE_MONTH,
             removalPolicy: cdk.RemovalPolicy.DESTROY
           }),
           new logs.LogGroup(this, 'NewsSyncLogGroup', {
             logGroupName: '/aws/lambda/signal9-news-sync',
             retention: logs.RetentionDays.ONE_MONTH,
             removalPolicy: cdk.RemovalPolicy.DESTROY
           }),
           new logs.LogGroup(this, 'PollinationLogGroup', {
             logGroupName: '/aws/lambda/signal9-pollination',
             retention: logs.RetentionDays.ONE_MONTH,
             removalPolicy: cdk.RemovalPolicy.DESTROY
           }),
           new logs.LogGroup(this, 'AnalysisLogGroup', {
             logGroupName: '/aws/lambda/signal9-analysis',
             retention: logs.RetentionDays.ONE_MONTH,
             removalPolicy: cdk.RemovalPolicy.DESTROY
           })
         ];
       }
     }
     ```

  10. **Main CDK App Configuration**
      ```typescript
      // bin/signal9-advisor.ts
      #!/usr/bin/env node
      import 'source-map-support/register';
      import * as cdk from 'aws-cdk-lib';
      import { DatabaseStack } from '../lib/database-stack';
      import { EventBridgeStack } from '../lib/eventbridge-stack';
      import { LambdaStack } from '../lib/lambda-stack';
      import { ApiStack } from '../lib/api-stack';
      import { StorageStack } from '../lib/storage-stack';
      import { SecretsStack } from '../lib/secrets-stack';
      import { MonitoringStack } from '../lib/monitoring-stack';
      
      const app = new cdk.App();
      
      // Create stacks
      const databaseStack = new DatabaseStack(app, 'Signal9DatabaseStack', {
        env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
      });
      
      const secretsStack = new SecretsStack(app, 'Signal9SecretsStack', {
        env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
      });
      
      const lambdaStack = new LambdaStack(app, 'Signal9LambdaStack', {
        env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
      });
      
      const eventBridgeStack = new EventBridgeStack(app, 'Signal9EventBridgeStack', {
        env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
      });
      
      const apiStack = new ApiStack(app, 'Signal9ApiStack', {
        env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
      });
      
      const storageStack = new StorageStack(app, 'Signal9StorageStack', {
        env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
      });
      
      const monitoringStack = new MonitoringStack(app, 'Signal9MonitoringStack', {
        env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
      });
      
      // Add dependencies
      lambdaStack.addDependency(databaseStack);
      lambdaStack.addDependency(secretsStack);
      eventBridgeStack.addDependency(lambdaStack);
      apiStack.addDependency(lambdaStack);
      monitoringStack.addDependency(lambdaStack);
      monitoringStack.addDependency(apiStack);
      monitoringStack.addDependency(storageStack);
      
      app.synth();
      ```

  11. **Deploy Infrastructure**
     ```bash
     # Install dependencies
     npm install
     
     # Bootstrap CDK (first time only)
     cdk bootstrap
     
     # Synthesize CloudFormation templates
     cdk synth
     
     # Deploy all stacks
     cdk deploy --all
     
     # Verify deployment
     cdk diff
     ```

- **Architecture Considerations**:
  - Serverless-first approach using Lambda, DynamoDB, and EventBridge
  - Event-driven architecture for scalable data processing
  - Separation of concerns with dedicated stacks for different components
  - Proper IAM roles with least privilege principle
  - Multi-region deployment capability
  - Cost optimization through pay-per-use services

- **Security Requirements**:
  - All DynamoDB tables encrypted with AWS managed keys
  - S3 buckets with encryption and public access blocked
  - API Gateway with CORS configuration
  - Secrets Manager for secure credential storage
  - IAM roles with minimal required permissions
  - CloudWatch logging for audit trails

- **Performance Requirements**:
  - Lambda functions optimized for cold start performance
  - DynamoDB on-demand billing for unpredictable workloads
  - CloudFront for global content delivery
  - EventBridge for reliable event processing
  - API Gateway with caching for improved response times

#### Dependencies
- **Prerequisites**:
  - AWS CLI configured with appropriate permissions
  - Node.js v18+ and npm installed
  - AWS CDK CLI installed globally
  - AlphaVantage and Alpaca API credentials
- **Dependent Tickets**:
  - Phase 1 Task 2: Data Pipeline Architecture
  - Phase 1 Task 3: AlphaVantage API Integration
  - Phase 1 Task 4: Alpaca API Integration

#### Testing Requirements
- **Unit Tests**:
  - CDK construct unit tests for each stack
  - Lambda function unit tests with mocked AWS services
  - IAM policy validation tests
  - DynamoDB table configuration tests
  - EventBridge rule configuration tests

- **Integration Tests**:
  - End-to-end infrastructure deployment tests
  - Cross-stack dependency validation
  - API Gateway endpoint integration tests
  - Secrets Manager integration tests

- **Performance Tests**:
  - Lambda function cold start performance
  - DynamoDB read/write performance
  - API Gateway response time tests
  - CloudFront cache performance

- **Security Tests**:
  - IAM policy security validation
  - Secrets Manager access control tests
  - S3 bucket security configuration tests
  - API Gateway security validation

#### Acceptance Criteria
- [ ] All CDK stacks deploy successfully without errors
- [ ] DynamoDB tables created with proper encryption and backup policies
- [ ] EventBridge rules configured for all scheduled triggers
- [ ] Lambda functions deployed with Node.js v22 runtime
- [ ] API Gateway endpoints accessible and responding
- [ ] S3 buckets configured with encryption and proper access controls
- [ ] CloudFront distribution serving static assets
- [ ] Secrets Manager secrets created for API credentials
- [ ] CloudWatch dashboard displaying monitoring metrics
- [ ] All IAM roles follow least privilege principle
- [ ] CDK Nag security checks pass with no critical violations
- [ ] Infrastructure costs within budget constraints
- [ ] All unit tests pass with >90% coverage
- [ ] Integration tests pass successfully
- [ ] Performance benchmarks met
- [ ] Security requirements validated
- [ ] Code review completed
- [ ] Documentation updated

#### Error Handling
- **CDK Deployment Failures**: Rollback to previous stable state
- **Lambda Function Errors**: CloudWatch logging and dead letter queues
- **DynamoDB Errors**: Retry logic with exponential backoff
- **API Gateway Errors**: Proper HTTP status codes and error messages
- **Secrets Manager Errors**: Fallback to environment variables for development
- **EventBridge Failures**: Dead letter queues for failed event processing

#### Monitoring and Observability
- **Metrics to Track**:
  - Lambda function duration, errors, and invocations
  - DynamoDB consumed read/write capacity units
  - API Gateway request count and latency
  - EventBridge rule invocations and failures
  - S3 bucket access patterns
  - CloudFront cache hit rates

- **Logging Requirements**:
  - Structured logging for all Lambda functions
  - CloudWatch log groups with appropriate retention
  - API Gateway access logs
  - DynamoDB stream logs for data changes

- **Alerting Criteria**:
  - Lambda function error rate >5%
  - API Gateway 5xx error rate >1%
  - DynamoDB throttling events
  - EventBridge rule failures
  - Secrets Manager access failures

#### Open Questions
- None - all technical decisions have been made and documented

#### Notes
- Use CDK Nag for security validation during deployment
- Consider implementing AWS X-Ray for distributed tracing
- Monitor costs closely during initial deployment
- Plan for future scaling with auto-scaling configurations
- Document all environment variables and configuration parameters
- Implement proper tagging strategy for cost allocation 
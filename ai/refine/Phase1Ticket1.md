# Ticket 1.1: AWS Infrastructure Setup

**Status**: Refinement Complete

#### Description
Establish the foundational AWS infrastructure for Signal9 Advisor using AWS CDK with TypeScript. This includes setting up the complete serverless architecture with Lambda functions, DynamoDB tables, EventBridge rules, API Gateway, S3 buckets, CloudFront, Secrets Manager, and comprehensive monitoring with CloudWatch. The infrastructure must follow AWS Well-Architected Framework principles and implement proper security configurations.

#### Technical Details
- **Implementation Steps**:
  
  **CRITICAL: Complete these steps in exact order - each step builds on the previous**

  1. **Initialize Project Structure and Dependencies**
     ```bash
     # Create main project directory
     mkdir -p signal9-advisor
     cd signal9-advisor
     
     # Create infrastructure subdirectory
     mkdir infrastructure
     cd infrastructure
     
     # Initialize CDK project with TypeScript
     cdk init app --language typescript
     
     # Install ALL required dependencies
     npm install aws-cdk-lib@2.110.0 constructs@10.3.0
     npm install --save-dev @types/node@20.10.0 typescript@5.3.0 ts-node@10.9.0
     npm install --save-dev jest@29.7.0 @types/jest@29.5.0 ts-jest@29.1.0
     npm install --save-dev aws-cdk@2.110.0 @aws-cdk/assert@2.110.0
     
     # Create lambda source directory
     mkdir -p lambda/{api,event-handlers,scheduled}
     mkdir -p test/{unit,integration}
     ```

  2. **Configure Essential Project Files**
     ```typescript
     // tsconfig.json - EXACT configuration required
     {
       "compilerOptions": {
         "target": "ES2022",
         "module": "commonjs",
         "lib": ["es2022"],
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
         "typeRoots": ["./node_modules/@types"],
         "skipLibCheck": true,
         "forceConsistentCasingInFileNames": true,
         "resolveJsonModule": true,
         "isolatedModules": true,
         "noEmit": false,
         "outDir": "./dist"
       },
       "include": ["lib/**/*", "bin/**/*", "lambda/**/*"],
       "exclude": ["node_modules", "cdk.out", "dist", "test"]
     }
     ```

     ```json
     // package.json - Add these scripts
     {
       "scripts": {
         "build": "tsc",
         "watch": "tsc -w",
         "test": "jest",
         "cdk": "cdk",
         "synth": "cdk synth",
         "deploy": "cdk deploy --all --require-approval never",
         "destroy": "cdk destroy --all --force"
       }
     }
     ```

     ```typescript
     // cdk.json - EXACT configuration
     {
       "app": "npx ts-node --prefer-ts-exts bin/signal9-advisor.ts",
       "watch": {
         "include": ["**"],
         "exclude": ["README.md", "cdk*.json", "**/*.d.ts", "**/*.js", "tsconfig.json", "package*.json", "yarn.lock", "node_modules", "test"]
       },
       "context": {
         "@aws-cdk/aws-apigateway:usagePlanKeyOrderInsensitiveId": true,
         "@aws-cdk/core:stackRelativeExports": true,
         "@aws-cdk/aws-rds:lowercaseDbIdentifier": true,
         "@aws-cdk/aws-lambda:recognizeVersionProps": true,
         "@aws-cdk/aws-cloudfront:defaultSecurityPolicyTLSv1.2_2021": true
       }
     }
     ```

  3. **Create DynamoDB Tables Stack with Global Secondary Indexes**
     ```typescript
     // lib/database-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
     import { Construct } from 'constructs';
     
     export interface DatabaseStackProps extends cdk.StackProps {
       environmentName: string;
     }
     
     export class DatabaseStack extends cdk.Stack {
       public readonly tables: { [key: string]: dynamodb.Table };
       
       constructor(scope: Construct, id: string, props: DatabaseStackProps) {
         super(scope, id, props);
         
         const { environmentName } = props;
         
         // Users Table with GSI for email lookup
         const usersTable = new dynamodb.Table(this, 'UsersTable', {
           tableName: `signal9-users-${environmentName}`,
           partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
           billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           pointInTimeRecovery: true,
           encryption: dynamodb.TableEncryption.AWS_MANAGED,
           timeToLiveAttribute: 'ttl'
         });
         
         usersTable.addGlobalSecondaryIndex({
           indexName: 'EmailIndex',
           partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING }
         });
         
         // Assets Table with GSI for symbol lookup
         const assetsTable = new dynamodb.Table(this, 'AssetsTable', {
           tableName: `signal9-assets-${environmentName}`,
           partitionKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
           billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           pointInTimeRecovery: true,
           encryption: dynamodb.TableEncryption.AWS_MANAGED
         });
         
         assetsTable.addGlobalSecondaryIndex({
           indexName: 'SymbolIndex',
           partitionKey: { name: 'symbol', type: dynamodb.AttributeType.STRING }
         });
         
         assetsTable.addGlobalSecondaryIndex({
           indexName: 'SectorIndex',
           partitionKey: { name: 'sector', type: dynamodb.AttributeType.STRING },
           sortKey: { name: 'market_cap', type: dynamodb.AttributeType.NUMBER }
         });
         
         // Asset Analysis Table with asset_id as partition key
         const assetAnalysisTable = new dynamodb.Table(this, 'AssetAnalysisTable', {
           tableName: `signal9-asset-analysis-${environmentName}`,
           partitionKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
           sortKey: { name: 'analysis_date', type: dynamodb.AttributeType.STRING },
           billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           pointInTimeRecovery: true,
           encryption: dynamodb.TableEncryption.AWS_MANAGED
         });
         
         assetAnalysisTable.addGlobalSecondaryIndex({
           indexName: 'RatingIndex',
           partitionKey: { name: 'investment_rating', type: dynamodb.AttributeType.NUMBER },
           sortKey: { name: 'analysis_date', type: dynamodb.AttributeType.STRING }
         });
         
         // Watchlists Table with user_id as partition key
         const watchlistsTable = new dynamodb.Table(this, 'WatchlistsTable', {
           tableName: `signal9-watchlists-${environmentName}`,
           partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
           sortKey: { name: 'watchlist_id', type: dynamodb.AttributeType.STRING },
           billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           pointInTimeRecovery: true,
           encryption: dynamodb.TableEncryption.AWS_MANAGED
         });
         
         // Watchlist Items Table
         const watchlistItemsTable = new dynamodb.Table(this, 'WatchlistItemsTable', {
           tableName: `signal9-watchlist-items-${environmentName}`,
           partitionKey: { name: 'watchlist_id', type: dynamodb.AttributeType.STRING },
           sortKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
           billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           pointInTimeRecovery: true,
           encryption: dynamodb.TableEncryption.AWS_MANAGED
         });
         
         // User Preferences Table
         const userPreferencesTable = new dynamodb.Table(this, 'UserPreferencesTable', {
           tableName: `signal9-user-preferences-${environmentName}`,
           partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
           sortKey: { name: 'preference_key', type: dynamodb.AttributeType.STRING },
           billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           pointInTimeRecovery: true,
           encryption: dynamodb.TableEncryption.AWS_MANAGED
         });
         
         // News Table with time-based partitioning
         const newsTable = new dynamodb.Table(this, 'NewsTable', {
           tableName: `signal9-news-${environmentName}`,
           partitionKey: { name: 'news_date', type: dynamodb.AttributeType.STRING }, // YYYY-MM-DD format
           sortKey: { name: 'news_id', type: dynamodb.AttributeType.STRING },
           billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           pointInTimeRecovery: true,
           encryption: dynamodb.TableEncryption.AWS_MANAGED,
           timeToLiveAttribute: 'ttl' // Auto-delete old news after 90 days
         });
         
         newsTable.addGlobalSecondaryIndex({
           indexName: 'AssetNewsIndex',
           partitionKey: { name: 'asset_symbol', type: dynamodb.AttributeType.STRING },
           sortKey: { name: 'time_published', type: dynamodb.AttributeType.STRING }
         });
         
         // Earnings Calendar Table
         const earningsCalendarTable = new dynamodb.Table(this, 'EarningsCalendarTable', {
           tableName: `signal9-earnings-calendar-${environmentName}`,
           partitionKey: { name: 'earnings_date', type: dynamodb.AttributeType.STRING }, // YYYY-MM-DD format
           sortKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
           billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
           removalPolicy: cdk.RemovalPolicy.RETAIN,
           pointInTimeRecovery: true,
           encryption: dynamodb.TableEncryption.AWS_MANAGED
         });
         
         earningsCalendarTable.addGlobalSecondaryIndex({
           indexName: 'AssetEarningsIndex',
           partitionKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
           sortKey: { name: 'earnings_date', type: dynamodb.AttributeType.STRING }
         });
         
         // Financial Data Tables
         const financialDataTables = {
           incomeStatement: new dynamodb.Table(this, 'IncomeStatementTable', {
             tableName: `signal9-income-statement-${environmentName}`,
             partitionKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
             sortKey: { name: 'fiscal_date_ending', type: dynamodb.AttributeType.STRING },
             billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
             removalPolicy: cdk.RemovalPolicy.RETAIN,
             pointInTimeRecovery: true,
             encryption: dynamodb.TableEncryption.AWS_MANAGED
           }),
           
           balanceSheet: new dynamodb.Table(this, 'BalanceSheetTable', {
             tableName: `signal9-balance-sheet-${environmentName}`,
             partitionKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
             sortKey: { name: 'fiscal_date_ending', type: dynamodb.AttributeType.STRING },
             billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
             removalPolicy: cdk.RemovalPolicy.RETAIN,
             pointInTimeRecovery: true,
             encryption: dynamodb.TableEncryption.AWS_MANAGED
           }),
           
           cashFlow: new dynamodb.Table(this, 'CashFlowTable', {
             tableName: `signal9-cash-flow-${environmentName}`,
             partitionKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
             sortKey: { name: 'fiscal_date_ending', type: dynamodb.AttributeType.STRING },
             billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
             removalPolicy: cdk.RemovalPolicy.RETAIN,
             pointInTimeRecovery: true,
             encryption: dynamodb.TableEncryption.AWS_MANAGED
           }),
           
           companyOverview: new dynamodb.Table(this, 'CompanyOverviewTable', {
             tableName: `signal9-company-overview-${environmentName}`,
             partitionKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
             billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
             removalPolicy: cdk.RemovalPolicy.RETAIN,
             pointInTimeRecovery: true,
             encryption: dynamodb.TableEncryption.AWS_MANAGED
           }),
           
           earnings: new dynamodb.Table(this, 'EarningsTable', {
             tableName: `signal9-earnings-${environmentName}`,
             partitionKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
             sortKey: { name: 'fiscal_date_ending', type: dynamodb.AttributeType.STRING },
             billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
             removalPolicy: cdk.RemovalPolicy.RETAIN,
             pointInTimeRecovery: true,
             encryption: dynamodb.TableEncryption.AWS_MANAGED
           })
         };
         
         // Store tables for cross-stack reference
         this.tables = {
           users: usersTable,
           assets: assetsTable,
           assetAnalysis: assetAnalysisTable,
           watchlists: watchlistsTable,
           watchlistItems: watchlistItemsTable,
           userPreferences: userPreferencesTable,
           news: newsTable,
           earningsCalendar: earningsCalendarTable,
           ...financialDataTables
         };
         
         // Export table names and ARNs for other stacks
         Object.entries(this.tables).forEach(([key, table]) => {
           new cdk.CfnOutput(this, `${key}TableName`, { 
             value: table.tableName,
             exportName: `Signal9-${environmentName}-${key}-TableName`
           });
           new cdk.CfnOutput(this, `${key}TableArn`, { 
             value: table.tableArn,
             exportName: `Signal9-${environmentName}-${key}-TableArn`
           });
         });
       }
     }
     ```

  4. **Create Secrets Manager Stack with Proper Structure**
     ```typescript
     // lib/secrets-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
     import { Construct } from 'constructs';
     
     export interface SecretsStackProps extends cdk.StackProps {
       environmentName: string;
     }
     
     export class SecretsStack extends cdk.Stack {
       public readonly alphaVantageSecret: secretsmanager.Secret;
       public readonly alpacaSecret: secretsmanager.Secret;
       
       constructor(scope: Construct, id: string, props: SecretsStackProps) {
         super(scope, id, props);
         
         const { environmentName } = props;
         
         // AlphaVantage API credentials with proper JSON structure
         this.alphaVantageSecret = new secretsmanager.Secret(this, 'AlphaVantageSecret', {
           secretName: `signal9-alphavantage-credentials-${environmentName}`,
           description: 'AlphaVantage API credentials for Signal9 Advisor',
           secretStringValue: cdk.SecretValue.unsafePlainText(JSON.stringify({
             apiKey: 'REPLACE_WITH_ACTUAL_ALPHAVANTAGE_API_KEY'
           }))
         });
         
         // Alpaca API credentials with proper JSON structure  
         this.alpacaSecret = new secretsmanager.Secret(this, 'AlpacaSecret', {
           secretName: `signal9-alpaca-credentials-${environmentName}`,
           description: 'Alpaca API credentials for Signal9 Advisor',
           secretStringValue: cdk.SecretValue.unsafePlainText(JSON.stringify({
             apiKey: 'REPLACE_WITH_ACTUAL_ALPACA_API_KEY',
             secretKey: 'REPLACE_WITH_ACTUAL_ALPACA_SECRET_KEY',
             paper: true
           }))
         });
         
         // Export secret ARNs for Lambda access
         new cdk.CfnOutput(this, 'AlphaVantageSecretArn', { 
           value: this.alphaVantageSecret.secretArn,
           exportName: `Signal9-${environmentName}-AlphaVantageSecret-Arn`
         });
         new cdk.CfnOutput(this, 'AlpacaSecretArn', { 
           value: this.alpacaSecret.secretArn,
           exportName: `Signal9-${environmentName}-AlpacaSecret-Arn`
         });
       }
     }
     ```

  5. **Create Lambda Execution Role with Specific Permissions**
     ```typescript
     // lib/lambda-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     import * as iam from 'aws-cdk-lib/aws-iam';
     import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
     import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
     import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
     import { Construct } from 'constructs';
     
     export interface LambdaStackProps extends cdk.StackProps {
       environmentName: string;
       tables: { [key: string]: dynamodb.Table };
       alphaVantageSecret: secretsmanager.Secret;
       alpacaSecret: secretsmanager.Secret;
     }
     
     export class LambdaStack extends cdk.Stack {
       public readonly functions: { [key: string]: lambda.Function };
       
       constructor(scope: Construct, id: string, props: LambdaStackProps) {
         super(scope, id, props);
         
         const { environmentName, tables, alphaVantageSecret, alpacaSecret } = props;
         
         // Common Lambda execution role with specific permissions
         const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
           assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
           managedPolicies: [
             iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
           ]
         });
         
         // DynamoDB permissions for all tables
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
           resources: Object.values(tables).map(table => table.tableArn).concat(
             Object.values(tables).map(table => `${table.tableArn}/index/*`)
           )
         }));
         
         // Secrets Manager permissions
         [alphaVantageSecret, alpacaSecret].forEach(secret => {
           secret.grantRead(lambdaExecutionRole);
         });
         
         // EventBridge permissions
         lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
           effect: iam.Effect.ALLOW,
           actions: ['events:PutEvents'],
           resources: [`arn:aws:events:${this.region}:${this.account}:event-bus/default`]
         }));
         
         // CloudWatch metrics permissions
         lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
           effect: iam.Effect.ALLOW,
           actions: [
             'cloudwatch:PutMetricData',
             'logs:CreateLogGroup',
             'logs:CreateLogStream',
             'logs:PutLogEvents'
           ],
           resources: ['*']
         }));
         
         // Create placeholder Lambda functions (implementation will be added in later tickets)
         const commonEnvironment = {
           ENVIRONMENT: environmentName,
           ASSETS_TABLE_NAME: tables.assets.tableName,
           USERS_TABLE_NAME: tables.users.tableName,
           ASSET_ANALYSIS_TABLE_NAME: tables.assetAnalysis.tableName,
           WATCHLISTS_TABLE_NAME: tables.watchlists.tableName,
           WATCHLIST_ITEMS_TABLE_NAME: tables.watchlistItems.tableName,
           USER_PREFERENCES_TABLE_NAME: tables.userPreferences.tableName,
           NEWS_TABLE_NAME: tables.news.tableName,
           EARNINGS_CALENDAR_TABLE_NAME: tables.earningsCalendar.tableName,
           INCOME_STATEMENT_TABLE_NAME: tables.incomeStatement.tableName,
           BALANCE_SHEET_TABLE_NAME: tables.balanceSheet.tableName,
           CASH_FLOW_TABLE_NAME: tables.cashFlow.tableName,
           COMPANY_OVERVIEW_TABLE_NAME: tables.companyOverview.tableName,
           EARNINGS_TABLE_NAME: tables.earnings.tableName,
           ALPHAVANTAGE_SECRET_NAME: alphaVantageSecret.secretName,
           ALPACA_SECRET_NAME: alpacaSecret.secretName,
           AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
         };
         
         // Asset Sync Lambda
         const assetSyncLambda = new nodejs.NodejsFunction(this, 'AssetSyncFunction', {
           functionName: `signal9-asset-sync-${environmentName}`,
           entry: 'lambda/scheduled/asset-sync.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(15),
           memorySize: 1024,
           role: lambdaExecutionRole,
           environment: commonEnvironment,
           bundling: {
             externalModules: ['@aws-sdk/*']
           }
         });
         
         // Earnings Sync Lambda
         const earningsSyncLambda = new nodejs.NodejsFunction(this, 'EarningsSyncFunction', {
           functionName: `signal9-earnings-sync-${environmentName}`,
           entry: 'lambda/scheduled/earnings-sync.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(10),
           memorySize: 512,
           role: lambdaExecutionRole,
           environment: commonEnvironment,
           bundling: {
             externalModules: ['@aws-sdk/*']
           }
         });
         
         // News Sync Lambda
         const newsSyncLambda = new nodejs.NodejsFunction(this, 'NewsSyncFunction', {
           functionName: `signal9-news-sync-${environmentName}`,
           entry: 'lambda/scheduled/news-sync.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(10),
           memorySize: 512,
           role: lambdaExecutionRole,
           environment: commonEnvironment,
           bundling: {
             externalModules: ['@aws-sdk/*']
           }
         });
         
         // Pollination Trigger Lambda
         const pollinationTriggerLambda = new nodejs.NodejsFunction(this, 'PollinationTriggerFunction', {
           functionName: `signal9-pollination-trigger-${environmentName}`,
           entry: 'lambda/scheduled/pollination-trigger.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(5),
           memorySize: 512,
           role: lambdaExecutionRole,
           environment: commonEnvironment,
           bundling: {
             externalModules: ['@aws-sdk/*']
           }
         });
         
         // Pollination Handler Lambda
         const pollinationHandlerLambda = new nodejs.NodejsFunction(this, 'PollinationHandlerFunction', {
           functionName: `signal9-pollination-handler-${environmentName}`,
           entry: 'lambda/event-handlers/pollination-handler.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(15),
           memorySize: 1024,
           role: lambdaExecutionRole,
           environment: commonEnvironment,
           bundling: {
             externalModules: ['@aws-sdk/*']
           }
         });
         
         // Analysis Handler Lambda
         const analysisHandlerLambda = new nodejs.NodejsFunction(this, 'AnalysisHandlerFunction', {
           functionName: `signal9-analysis-handler-${environmentName}`,
           entry: 'lambda/event-handlers/analysis-handler.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.minutes(15),
           memorySize: 2048,
           role: lambdaExecutionRole,
           environment: commonEnvironment,
           bundling: {
             externalModules: ['@aws-sdk/*']
           }
         });
         
         // API Lambda Functions
         const healthCheckLambda = new nodejs.NodejsFunction(this, 'HealthCheckFunction', {
           functionName: `signal9-health-check-${environmentName}`,
           entry: 'lambda/api/health-check.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.seconds(30),
           memorySize: 128,
           role: lambdaExecutionRole,
           environment: commonEnvironment,
           bundling: {
             externalModules: ['@aws-sdk/*']
           }
         });
         
         const assetsApiLambda = new nodejs.NodejsFunction(this, 'AssetsApiFunction', {
           functionName: `signal9-assets-api-${environmentName}`,
           entry: 'lambda/api/assets.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.seconds(30),
           memorySize: 512,
           role: lambdaExecutionRole,
           environment: commonEnvironment,
           bundling: {
             externalModules: ['@aws-sdk/*']
           }
         });
         
         const usersApiLambda = new nodejs.NodejsFunction(this, 'UsersApiFunction', {
           functionName: `signal9-users-api-${environmentName}`,
           entry: 'lambda/api/users.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.seconds(30),
           memorySize: 512,
           role: lambdaExecutionRole,
           environment: commonEnvironment,
           bundling: {
             externalModules: ['@aws-sdk/*']
           }
         });
         
         const watchlistsApiLambda = new nodejs.NodejsFunction(this, 'WatchlistsApiFunction', {
           functionName: `signal9-watchlists-api-${environmentName}`,
           entry: 'lambda/api/watchlists.ts',
           handler: 'handler',
           runtime: lambda.Runtime.NODEJS_22_X,
           timeout: cdk.Duration.seconds(30),
           memorySize: 512,
           role: lambdaExecutionRole,
           environment: commonEnvironment,
           bundling: {
             externalModules: ['@aws-sdk/*']
           }
         });
         
         // Store functions for cross-stack reference
         this.functions = {
           assetSync: assetSyncLambda,
           earningsSync: earningsSyncLambda,
           newsSync: newsSyncLambda,
           pollinationTrigger: pollinationTriggerLambda,
           pollinationHandler: pollinationHandlerLambda,
           analysisHandler: analysisHandlerLambda,
           healthCheck: healthCheckLambda,
           assetsApi: assetsApiLambda,
           usersApi: usersApiLambda,
           watchlistsApi: watchlistsApiLambda
         };
         
         // Export function ARNs for EventBridge
         Object.entries(this.functions).forEach(([key, func]) => {
           new cdk.CfnOutput(this, `${key}FunctionArn`, {
             value: func.functionArn,
             exportName: `Signal9-${environmentName}-${key}-FunctionArn`
           });
         });
       }
     }
     ```

  6. **Create EventBridge Stack with Lambda Targets**
     ```typescript
     // lib/eventbridge-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as events from 'aws-cdk-lib/aws-events';
     import * as targets from 'aws-cdk-lib/aws-events-targets';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     import { Construct } from 'constructs';
     
     export interface EventBridgeStackProps extends cdk.StackProps {
       environmentName: string;
       functions: { [key: string]: lambda.Function };
     }
     
     export class EventBridgeStack extends cdk.Stack {
       constructor(scope: Construct, id: string, props: EventBridgeStackProps) {
         super(scope, id, props);
         
         const { environmentName, functions } = props;
         
         // Scheduled Rules (UTC times)
         
         // 4:00 AM UTC - Asset synchronization with Alpaca API  
         const assetSyncRule = new events.Rule(this, 'AssetSyncRule', {
           ruleName: `signal9-asset-sync-${environmentName}`,
           schedule: events.Schedule.cron({ minute: '0', hour: '9' }), // 4:00 AM EST = 9:00 AM UTC
           description: 'Daily asset synchronization at 4:00 AM EST',
           targets: [new targets.LambdaFunction(functions.assetSync)]
         });
         
         // 5:00 AM UTC - Earnings calendar synchronization
         const earningsSyncRule = new events.Rule(this, 'EarningsSyncRule', {
           ruleName: `signal9-earnings-sync-${environmentName}`,
           schedule: events.Schedule.cron({ minute: '0', hour: '10' }), // 5:00 AM EST = 10:00 AM UTC
           description: 'Daily earnings calendar sync at 5:00 AM EST',
           targets: [new targets.LambdaFunction(functions.earningsSync)]
         });
         
         // 6:00 AM UTC - Earnings-triggered pollination
         const earningsPollinationRule = new events.Rule(this, 'EarningsPollinationRule', {
           ruleName: `signal9-earnings-pollination-${environmentName}`,
           schedule: events.Schedule.cron({ minute: '0', hour: '11' }), // 6:00 AM EST = 11:00 AM UTC
           description: 'Earnings-triggered pollination at 6:00 AM EST',
           targets: [new targets.LambdaFunction(functions.pollinationTrigger, {
             event: events.RuleTargetInput.fromObject({
               triggerType: 'earnings',
               source: 'scheduled'
             })
           })]
         });
         
         // 7:00 AM UTC - Regular pollination
         const regularPollinationRule = new events.Rule(this, 'RegularPollinationRule', {
           ruleName: `signal9-regular-pollination-${environmentName}`,
           schedule: events.Schedule.cron({ minute: '0', hour: '12' }), // 7:00 AM EST = 12:00 PM UTC
           description: 'Regular pollination at 7:00 AM EST',
           targets: [new targets.LambdaFunction(functions.pollinationTrigger, {
             event: events.RuleTargetInput.fromObject({
               triggerType: 'regular',
               source: 'scheduled'
             })
           })]
         });
         
         // Hourly - News sentiment synchronization
         const newsSyncRule = new events.Rule(this, 'NewsSyncRule', {
           ruleName: `signal9-news-sync-${environmentName}`,
           schedule: events.Schedule.cron({ minute: '0' }), // Every hour
           description: 'Hourly news sentiment sync',
           targets: [new targets.LambdaFunction(functions.newsSync)]
         });
         
         // Event-driven Rules
         
         // pollenationNeeded Event Rule
         const pollenationNeededRule = new events.Rule(this, 'PollenationNeededRule', {
           ruleName: `signal9-pollination-needed-${environmentName}`,
           eventPattern: {
             source: ['signal9.advisor'],
             detailType: ['pollenationNeeded']
           },
           description: 'Trigger financial data ingestion for individual assets',
           targets: [new targets.LambdaFunction(functions.pollinationHandler)]
         });
         
         // analysisNeeded Event Rule
         const analysisNeededRule = new events.Rule(this, 'AnalysisNeededRule', {
           ruleName: `signal9-analysis-needed-${environmentName}`,
           eventPattern: {
             source: ['signal9.advisor'],
             detailType: ['analysisNeeded']
           },
           description: 'Trigger rule-based analysis for processed assets',
           targets: [new targets.LambdaFunction(functions.analysisHandler)]
         });
         
         // Output rule ARNs
         [assetSyncRule, earningsSyncRule, earningsPollinationRule, regularPollinationRule, 
          newsSyncRule, pollenationNeededRule, analysisNeededRule].forEach((rule, index) => {
           const ruleNames = ['AssetSync', 'EarningsSync', 'EarningsPollination', 'RegularPollination', 
                              'NewsSync', 'PollenationNeeded', 'AnalysisNeeded'];
           new cdk.CfnOutput(this, `${ruleNames[index]}RuleArn`, {
             value: rule.ruleArn,
             exportName: `Signal9-${environmentName}-${ruleNames[index]}Rule-Arn`
           });
         });
       }
     }
     ```

  7. **Create API Gateway Stack**
     ```typescript
     // lib/api-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as apigateway from 'aws-cdk-lib/aws-apigateway';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     import { Construct } from 'constructs';
     
     export interface ApiStackProps extends cdk.StackProps {
       environmentName: string;
       functions: { [key: string]: lambda.Function };
     }
     
     export class ApiStack extends cdk.Stack {
       public readonly api: apigateway.RestApi;
       
       constructor(scope: Construct, id: string, props: ApiStackProps) {
         super(scope, id, props);
         
         const { environmentName, functions } = props;
         
         // API Gateway with CORS
         this.api = new apigateway.RestApi(this, 'Signal9Api', {
           restApiName: `Signal9 Advisor API ${environmentName}`,
           description: `API for Signal9 Advisor financial analysis platform - ${environmentName}`,
           deployOptions: {
             stageName: environmentName,
             throttlingRateLimit: 1000,
             throttlingBurstLimit: 2000
           },
           defaultCorsPreflightOptions: {
             allowOrigins: apigateway.Cors.ALL_ORIGINS,
             allowMethods: apigateway.Cors.ALL_METHODS,
             allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token']
           }
         });
         
         // Health check endpoint
         const healthResource = this.api.root.addResource('health');
         healthResource.addMethod('GET', new apigateway.LambdaIntegration(functions.healthCheck));
         
         // Assets endpoints
         const assetsResource = this.api.root.addResource('assets');
         assetsResource.addMethod('GET', new apigateway.LambdaIntegration(functions.assetsApi));
         
         const assetResource = assetsResource.addResource('{symbol}');
         assetResource.addMethod('GET', new apigateway.LambdaIntegration(functions.assetsApi));
         
         const assetAnalysisResource = assetResource.addResource('analysis');
         assetAnalysisResource.addMethod('GET', new apigateway.LambdaIntegration(functions.assetsApi));
         
         // Users endpoints
         const usersResource = this.api.root.addResource('users');
         usersResource.addMethod('POST', new apigateway.LambdaIntegration(functions.usersApi));
         
         const userResource = usersResource.addResource('{userId}');
         userResource.addMethod('GET', new apigateway.LambdaIntegration(functions.usersApi));
         userResource.addMethod('PUT', new apigateway.LambdaIntegration(functions.usersApi));
         userResource.addMethod('DELETE', new apigateway.LambdaIntegration(functions.usersApi));
         
         const userPreferencesResource = userResource.addResource('preferences');
         userPreferencesResource.addMethod('GET', new apigateway.LambdaIntegration(functions.usersApi));
         userPreferencesResource.addMethod('PUT', new apigateway.LambdaIntegration(functions.usersApi));
         
         // Watchlists endpoints
         const watchlistsResource = this.api.root.addResource('watchlists');
         watchlistsResource.addMethod('GET', new apigateway.LambdaIntegration(functions.watchlistsApi));
         watchlistsResource.addMethod('POST', new apigateway.LambdaIntegration(functions.watchlistsApi));
         
         const watchlistResource = watchlistsResource.addResource('{watchlistId}');
         watchlistResource.addMethod('GET', new apigateway.LambdaIntegration(functions.watchlistsApi));
         watchlistResource.addMethod('PUT', new apigateway.LambdaIntegration(functions.watchlistsApi));
         watchlistResource.addMethod('DELETE', new apigateway.LambdaIntegration(functions.watchlistsApi));
         
         const watchlistAssetsResource = watchlistResource.addResource('assets');
         watchlistAssetsResource.addMethod('POST', new apigateway.LambdaIntegration(functions.watchlistsApi));
         
         const watchlistAssetResource = watchlistAssetsResource.addResource('{assetId}');
         watchlistAssetResource.addMethod('DELETE', new apigateway.LambdaIntegration(functions.watchlistsApi));
         
         // Export API URL and ID
         new cdk.CfnOutput(this, 'ApiUrl', { 
           value: this.api.url,
           exportName: `Signal9-${environmentName}-Api-Url`
         });
         new cdk.CfnOutput(this, 'ApiId', { 
           value: this.api.restApiId,
           exportName: `Signal9-${environmentName}-Api-Id`
         });
       }
     }
     ```

  8. **Create S3 and CloudFront Stack**
     ```typescript
     // lib/storage-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as s3 from 'aws-cdk-lib/aws-s3';
     import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
     import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
     import { Construct } from 'constructs';
     
     export interface StorageStackProps extends cdk.StackProps {
       environmentName: string;
       apiUrl: string;
     }
     
     export class StorageStack extends cdk.Stack {
       public readonly staticAssetsBucket: s3.Bucket;
       public readonly fileStorageBucket: s3.Bucket;
       public readonly distribution: cloudfront.Distribution;
       
       constructor(scope: Construct, id: string, props: StorageStackProps) {
         super(scope, id, props);
         
         const { environmentName, apiUrl } = props;
         
         // Static assets bucket with proper naming
         this.staticAssetsBucket = new s3.Bucket(this, 'StaticAssetsBucket', {
           bucketName: `signal9-static-assets-${environmentName}-${this.account}`,
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
         
         // File storage bucket for analysis results
         this.fileStorageBucket = new s3.Bucket(this, 'FileStorageBucket', {
           bucketName: `signal9-file-storage-${environmentName}-${this.account}`,
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
               id: 'ArchiveOldFiles',
               transitions: [
                 {
                   storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                   transitionAfter: cdk.Duration.days(30)
                 },
                 {
                   storageClass: s3.StorageClass.GLACIER,
                   transitionAfter: cdk.Duration.days(90)
                 }
               ]
             }
           ]
         });
         
         // Origin Access Identity for CloudFront
         const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
           comment: `OAI for Signal9 ${environmentName}`
         });
         
         // Grant CloudFront access to S3 bucket
         this.staticAssetsBucket.grantRead(originAccessIdentity);
         
         // Extract API Gateway domain from URL
         const apiDomain = apiUrl.replace('https://', '').replace(/\/.*$/, '');
         
         // CloudFront distribution
         this.distribution = new cloudfront.Distribution(this, 'StaticAssetsDistribution', {
           comment: `Signal9 Advisor Distribution - ${environmentName}`,
           defaultBehavior: {
             origin: new origins.S3Origin(this.staticAssetsBucket, {
               originAccessIdentity
             }),
             viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
             cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
             compress: true
           },
           additionalBehaviors: {
             '/api/*': {
               origin: new origins.HttpOrigin(apiDomain),
               viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
               cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
               allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
               originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
             }
           },
           errorResponses: [
             {
               httpStatus: 404,
               responseHttpStatus: 200,
               responsePagePath: '/index.html',
               ttl: cdk.Duration.minutes(5)
             },
             {
               httpStatus: 403,
               responseHttpStatus: 200,
               responsePagePath: '/index.html',
               ttl: cdk.Duration.minutes(5)
             }
           ]
         });
         
         // Export resource details
         new cdk.CfnOutput(this, 'StaticAssetsBucketName', { 
           value: this.staticAssetsBucket.bucketName,
           exportName: `Signal9-${environmentName}-StaticAssets-BucketName`
         });
         new cdk.CfnOutput(this, 'FileStorageBucketName', { 
           value: this.fileStorageBucket.bucketName,
           exportName: `Signal9-${environmentName}-FileStorage-BucketName`
         });
         new cdk.CfnOutput(this, 'CloudFrontUrl', { 
           value: `https://${this.distribution.distributionDomainName}`,
           exportName: `Signal9-${environmentName}-CloudFront-Url`
         });
         new cdk.CfnOutput(this, 'CloudFrontDistributionId', { 
           value: this.distribution.distributionId,
           exportName: `Signal9-${environmentName}-CloudFront-DistributionId`
         });
       }
     }
     ```

  9. **Create CloudWatch Monitoring Stack**
     ```typescript
     // lib/monitoring-stack.ts
     import * as cdk from 'aws-cdk-lib';
     import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
     import * as logs from 'aws-cdk-lib/aws-logs';
     import * as sns from 'aws-cdk-lib/aws-sns';
     import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     import { Construct } from 'constructs';
     
     export interface MonitoringStackProps extends cdk.StackProps {
       environmentName: string;
       functions: { [key: string]: lambda.Function };
     }
     
     export class MonitoringStack extends cdk.Stack {
       public readonly dashboard: cloudwatch.Dashboard;
       public readonly alertTopic: sns.Topic;
       
       constructor(scope: Construct, id: string, props: MonitoringStackProps) {
         super(scope, id, props);
         
         const { environmentName, functions } = props;
         
         // SNS Topic for alerts
         this.alertTopic = new sns.Topic(this, 'AlertTopic', {
           topicName: `signal9-alerts-${environmentName}`,
           displayName: `Signal9 Advisor Alerts - ${environmentName}`
         });
         
         // CloudWatch Dashboard
         this.dashboard = new cloudwatch.Dashboard(this, 'Signal9Dashboard', {
           dashboardName: `Signal9-Advisor-${environmentName}`
         });
         
         // Lambda metrics by function
         const functionMetrics: cloudwatch.IWidget[] = [];
         
         Object.entries(functions).forEach(([name, func]) => {
           const duration = new cloudwatch.Metric({
             namespace: 'AWS/Lambda',
             metricName: 'Duration',
             dimensionsMap: { FunctionName: func.functionName },
             statistic: 'Average',
             period: cdk.Duration.minutes(5)
           });
           
           const errors = new cloudwatch.Metric({
             namespace: 'AWS/Lambda',
             metricName: 'Errors',
             dimensionsMap: { FunctionName: func.functionName },
             statistic: 'Sum',
             period: cdk.Duration.minutes(5)
           });
           
           const invocations = new cloudwatch.Metric({
             namespace: 'AWS/Lambda',
             metricName: 'Invocations',
             dimensionsMap: { FunctionName: func.functionName },
             statistic: 'Sum',
             period: cdk.Duration.minutes(5)
           });
           
           // Create alarm for high error rate
           const errorAlarm = new cloudwatch.Alarm(this, `${name}ErrorAlarm`, {
             alarmName: `Signal9-${environmentName}-${name}-Errors`,
             metric: errors,
             threshold: 5,
             evaluationPeriods: 2,
             comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
             treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
           });
           
           errorAlarm.addAlarmAction(new actions.SnsAction(this.alertTopic));
           
           functionMetrics.push(
             new cloudwatch.GraphWidget({
               title: `${name} Function Performance`,
               left: [duration],
               right: [invocations],
               width: 12,
               height: 6
             })
           );
           
           functionMetrics.push(
             new cloudwatch.GraphWidget({
               title: `${name} Function Errors`,
               left: [errors],
               width: 12,
               height: 6
             })
           );
         });
         
         // DynamoDB metrics  
         const dynamoReadCapacity = new cloudwatch.Metric({
           namespace: 'AWS/DynamoDB',
           metricName: 'ConsumedReadCapacityUnits',
           statistic: 'Sum',
           period: cdk.Duration.minutes(5)
         });
         
         const dynamoWriteCapacity = new cloudwatch.Metric({
           namespace: 'AWS/DynamoDB',
           metricName: 'ConsumedWriteCapacityUnits',
           statistic: 'Sum',
           period: cdk.Duration.minutes(5)
         });
         
         // API Gateway metrics
         const apiRequests = new cloudwatch.Metric({
           namespace: 'AWS/ApiGateway',
           metricName: 'Count',
           statistic: 'Sum',
           period: cdk.Duration.minutes(5)
         });
         
         const apiLatency = new cloudwatch.Metric({
           namespace: 'AWS/ApiGateway',
           metricName: 'Latency',
           statistic: 'Average',
           period: cdk.Duration.minutes(5)
         });
         
         const api4xxErrors = new cloudwatch.Metric({
           namespace: 'AWS/ApiGateway',
           metricName: '4XXError',
           statistic: 'Sum',
           period: cdk.Duration.minutes(5)
         });
         
         const api5xxErrors = new cloudwatch.Metric({
           namespace: 'AWS/ApiGateway',
           metricName: '5XXError',
           statistic: 'Sum',
           period: cdk.Duration.minutes(5)
         });
         
         // Add widgets to dashboard
         this.dashboard.addWidgets(
           // System Overview
           new cloudwatch.GraphWidget({
             title: 'API Gateway Overview',
             left: [apiRequests],
             right: [apiLatency],
             width: 12,
             height: 6
           }),
           new cloudwatch.GraphWidget({
             title: 'API Gateway Errors',
             left: [api4xxErrors, api5xxErrors],
             width: 12,
             height: 6
           }),
           new cloudwatch.GraphWidget({
             title: 'DynamoDB Capacity',
             left: [dynamoReadCapacity],
             right: [dynamoWriteCapacity],
             width: 24,
             height: 6
           }),
           // Function-specific metrics
           ...functionMetrics
         );
         
         // CloudWatch Log Groups with proper retention
         Object.entries(functions).forEach(([name, func]) => {
           new logs.LogGroup(this, `${name}LogGroup`, {
             logGroupName: `/aws/lambda/${func.functionName}`,
             retention: logs.RetentionDays.ONE_MONTH,
             removalPolicy: cdk.RemovalPolicy.DESTROY
           });
         });
         
         // Export monitoring resources
         new cdk.CfnOutput(this, 'DashboardUrl', {
           value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.dashboard.dashboardName}`,
           exportName: `Signal9-${environmentName}-Dashboard-Url`
         });
         new cdk.CfnOutput(this, 'AlertTopicArn', {
           value: this.alertTopic.topicArn,
           exportName: `Signal9-${environmentName}-AlertTopic-Arn`
         });
       }
     }
     ```

  10. **Create Main CDK App with Proper Dependencies**
      ```typescript
      // bin/signal9-advisor.ts
      #!/usr/bin/env node
      import 'source-map-support/register';
      import * as cdk from 'aws-cdk-lib';
      import { DatabaseStack } from '../lib/database-stack';
      import { SecretsStack } from '../lib/secrets-stack';
      import { LambdaStack } from '../lib/lambda-stack';
      import { EventBridgeStack } from '../lib/eventbridge-stack';
      import { ApiStack } from '../lib/api-stack';
      import { StorageStack } from '../lib/storage-stack';
      import { MonitoringStack } from '../lib/monitoring-stack';
      
      const app = new cdk.App();
      
      // Get environment from context or default to 'dev'
      const environmentName = app.node.tryGetContext('environment') || 'dev';
      
      // Common stack props
      const commonProps = {
        env: { 
          account: process.env.CDK_DEFAULT_ACCOUNT, 
          region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
        },
        environmentName
      };
      
      // Create stacks in dependency order
      
      // 1. Core infrastructure (no dependencies)
      const databaseStack = new DatabaseStack(app, `Signal9DatabaseStack-${environmentName}`, commonProps);
      const secretsStack = new SecretsStack(app, `Signal9SecretsStack-${environmentName}`, commonProps);
      
      // 2. Lambda functions (depends on database and secrets)
      const lambdaStack = new LambdaStack(app, `Signal9LambdaStack-${environmentName}`, {
        ...commonProps,
        tables: databaseStack.tables,
        alphaVantageSecret: secretsStack.alphaVantageSecret,
        alpacaSecret: secretsStack.alpacaSecret
      });
      lambdaStack.addDependency(databaseStack);
      lambdaStack.addDependency(secretsStack);
      
      // 3. EventBridge (depends on Lambda)
      const eventBridgeStack = new EventBridgeStack(app, `Signal9EventBridgeStack-${environmentName}`, {
        ...commonProps,
        functions: lambdaStack.functions
      });
      eventBridgeStack.addDependency(lambdaStack);
      
      // 4. API Gateway (depends on Lambda)
      const apiStack = new ApiStack(app, `Signal9ApiStack-${environmentName}`, {
        ...commonProps,
        functions: lambdaStack.functions
      });
      apiStack.addDependency(lambdaStack);
      
      // 5. Storage (depends on API for CloudFront configuration)
      const storageStack = new StorageStack(app, `Signal9StorageStack-${environmentName}`, {
        ...commonProps,
        apiUrl: apiStack.api.url
      });
      storageStack.addDependency(apiStack);
      
      // 6. Monitoring (depends on Lambda)
      const monitoringStack = new MonitoringStack(app, `Signal9MonitoringStack-${environmentName}`, {
        ...commonProps,
        functions: lambdaStack.functions
      });
      monitoringStack.addDependency(lambdaStack);
      monitoringStack.addDependency(apiStack);
      
      // Add tags to all stacks
      cdk.Tags.of(app).add('Project', 'Signal9Advisor');
      cdk.Tags.of(app).add('Environment', environmentName);
      cdk.Tags.of(app).add('ManagedBy', 'CDK');
      
      app.synth();
      ```

  11. **Create Placeholder Lambda Function Files**
      ```bash
      # Create the Lambda function directory structure and placeholder files
      mkdir -p lambda/api lambda/scheduled lambda/event-handlers
      
      # Create placeholder Lambda files (these will be implemented in later tickets)
      touch lambda/api/health-check.ts
      touch lambda/api/assets.ts  
      touch lambda/api/users.ts
      touch lambda/api/watchlists.ts
      touch lambda/scheduled/asset-sync.ts
      touch lambda/scheduled/earnings-sync.ts
      touch lambda/scheduled/news-sync.ts
      touch lambda/scheduled/pollination-trigger.ts
      touch lambda/event-handlers/pollination-handler.ts
      touch lambda/event-handlers/analysis-handler.ts
      ```

      Create minimal placeholder content for each file:
      ```typescript
      // lambda/api/health-check.ts
      export const handler = async (event: any) => {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            status: 'OK',
            timestamp: new Date().toISOString(),
            environment: process.env.ENVIRONMENT || 'unknown'
          })
        };
      };
      ```

      ```typescript
      // lambda/api/assets.ts  
      export const handler = async (event: any) => {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            message: 'Assets API - Implementation pending',
            method: event.httpMethod,
            path: event.path
          })
        };
      };
      ```

      Create similar placeholder files for all other Lambda functions.

  12. **Deploy and Verify Infrastructure**
      ```bash
      # Navigate to infrastructure directory
      cd signal9-advisor/infrastructure
      
      # Install dependencies
      npm install
      
      # Compile TypeScript
      npm run build
      
      # Bootstrap CDK (only needed once per account/region)
      npx cdk bootstrap
      
      # Synthesize all stacks to verify no errors
      npx cdk synth
      
      # Deploy all stacks (use --require-approval never for automation)
      npx cdk deploy --all --require-approval never
      
      # Verify deployment by checking outputs
      npx cdk list
      
      # Test health check endpoint
      curl $(aws cloudformation describe-stacks --stack-name Signal9ApiStack-dev --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text)health
      ```

  13. **Update API Credentials in Secrets Manager**
      ```bash
      # Update AlphaVantage credentials
      aws secretsmanager update-secret \
        --secret-id signal9-alphavantage-credentials-dev \
        --secret-string '{"apiKey":"YOUR_ACTUAL_ALPHAVANTAGE_API_KEY"}'
      
      # Update Alpaca credentials  
      aws secretsmanager update-secret \
        --secret-id signal9-alpaca-credentials-dev \
        --secret-string '{"apiKey":"YOUR_ACTUAL_ALPACA_API_KEY","secretKey":"YOUR_ACTUAL_ALPACA_SECRET_KEY","paper":true}'
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
  - AWS CLI configured with appropriate permissions (Administrator or PowerUser recommended for initial setup)
  - Node.js v18+ and npm installed locally
  - AWS CDK CLI v2.110.0+ installed globally (`npm install -g aws-cdk@latest`)
  - AlphaVantage API key (free tier: https://www.alphavantage.co/support/#api-key)
  - Alpaca API credentials (paper trading account: https://app.alpaca.markets/signup)
  - Git repository initialized and connected to remote origin

- **External Dependencies**:
  - AWS Account with sufficient privileges for resource creation
  - AWS Region selected (us-east-1 recommended for initial deployment)
  - Valid email for CloudWatch alerts configuration

- **Dependent Tickets**:
  - Phase 1 Task 2: Data Pipeline Architecture (depends on database and Lambda infrastructure)
  - Phase 1 Task 3: AlphaVantage API Integration (depends on Secrets Manager and Lambda functions)
  - Phase 1 Task 4: Alpaca API Integration (depends on Secrets Manager and Lambda functions)

#### Testing Requirements

**CRITICAL: All tests must pass before ticket completion**

- **Unit Tests**:
  ```bash
  # Create test structure
  mkdir -p test/unit/{stacks,lambda}
  
  # CDK construct unit tests
  npm install --save-dev @aws-cdk/assert aws-cdk-lib
  
  # Create database stack test
  touch test/unit/stacks/database-stack.test.ts
  touch test/unit/stacks/lambda-stack.test.ts
  touch test/unit/stacks/api-stack.test.ts
  
  # Run tests
  npm test
  ```

  Required test coverage:
  - DatabaseStack: Table creation, GSI configuration, encryption settings
  - LambdaStack: Function creation, environment variables, IAM permissions
  - ApiStack: API Gateway resources, CORS configuration, method integration
  - SecretsStack: Secret creation and proper naming
  - EventBridgeStack: Rule creation, schedule configuration, targets
  - StorageStack: S3 bucket configuration, CloudFront distribution
  - MonitoringStack: Dashboard creation, alarm configuration

- **Integration Tests**:
  ```bash
  # Deploy to test environment
  npx cdk deploy --all -c environment=test --require-approval never
  
  # Test API endpoints
  curl -v $API_URL/health
  
  # Test Lambda function execution via AWS CLI
  aws lambda invoke --function-name signal9-health-check-test --payload '{}' response.json
  
  # Verify DynamoDB table creation
  aws dynamodb describe-table --table-name signal9-assets-test
  
  # Test Secrets Manager access
  aws secretsmanager describe-secret --secret-id signal9-alphavantage-credentials-test
  ```

- **Infrastructure Validation Tests**:
  ```typescript
  // test/integration/infrastructure.test.ts
  import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
  
  describe('Infrastructure Integration Tests', () => {
    test('All stacks deployed successfully', async () => {
      const client = new CloudFormationClient({});
      const stacks = ['DatabaseStack', 'SecretsStack', 'LambdaStack', 'EventBridgeStack', 'ApiStack', 'StorageStack', 'MonitoringStack'];
      
      for (const stackName of stacks) {
        const response = await client.send(new DescribeStacksCommand({
          StackName: `Signal9${stackName}-test`
        }));
        expect(response.Stacks[0].StackStatus).toBe('CREATE_COMPLETE');
      }
    });
  });
  ```

#### Acceptance Criteria

**MANDATORY - All criteria must be verified before marking ticket complete**

**Infrastructure Deployment**:
- [ ] **VERIFIED**: All 7 CDK stacks deploy successfully without errors using `npx cdk deploy --all`
- [ ] **VERIFIED**: Stack names include environment suffix (e.g., `Signal9DatabaseStack-dev`)
- [ ] **VERIFIED**: All DynamoDB tables created with encryption enabled and point-in-time recovery
- [ ] **VERIFIED**: Global Secondary Indexes created on all required tables (EmailIndex, SymbolIndex, SectorIndex, RatingIndex, AssetNewsIndex, AssetEarningsIndex)
- [ ] **VERIFIED**: EventBridge rules created for all 5 scheduled triggers with correct UTC timing (9:00, 10:00, 11:00, 12:00 UTC, and hourly)
- [ ] **VERIFIED**: Lambda functions deployed with Node.js v22 runtime and proper environment variables
- [ ] **VERIFIED**: API Gateway endpoints accessible and responding with 200 status

**Security Configuration**:
- [ ] **VERIFIED**: All DynamoDB tables use AWS managed encryption
- [ ] **VERIFIED**: S3 buckets block public access and use server-side encryption
- [ ] **VERIFIED**: IAM roles follow least privilege principle (verified with AWS IAM Policy Simulator)
- [ ] **VERIFIED**: Secrets Manager secrets created with placeholder values
- [ ] **VERIFIED**: Lambda functions can read secrets (test with AWS CLI)
- [ ] **VERIFIED**: CloudFront uses Origin Access Identity for S3 access

**Monitoring and Observability**:
- [ ] **VERIFIED**: CloudWatch dashboard accessible and displaying metrics
- [ ] **VERIFIED**: CloudWatch log groups created for all Lambda functions with 30-day retention
- [ ] **VERIFIED**: SNS topic created for alerts
- [ ] **VERIFIED**: CloudWatch alarms created for Lambda error rates

**API Functionality**:
- [ ] **VERIFIED**: Health check endpoint returns valid JSON response
- [ ] **VERIFIED**: CORS headers properly configured on all endpoints
- [ ] **VERIFIED**: API Gateway throttling configured (1000 requests/minute, 2000 burst)

**Cost and Performance**:
- [ ] **VERIFIED**: Infrastructure costs estimated and within budget (<$50/month for dev environment)
- [ ] **VERIFIED**: Lambda functions cold start time <3 seconds (measured via CloudWatch)
- [ ] **VERIFIED**: API Gateway response time <500ms for health check (measured via CloudWatch)

**Testing and Quality**:
- [ ] **VERIFIED**: Unit tests pass with >90% coverage (`npm test`)
- [ ] **VERIFIED**: Integration tests pass for all deployed stacks
- [ ] **VERIFIED**: CDK Nag security checks pass without critical violations
- [ ] **VERIFIED**: TypeScript compilation succeeds without errors
- [ ] **VERIFIED**: CDK synth generates valid CloudFormation templates

**Documentation and Deployment**:
- [ ] **VERIFIED**: All environment variables documented in README
- [ ] **VERIFIED**: Deployment script runs successfully from clean environment
- [ ] **VERIFIED**: Resource tagging implemented (Project, Environment, ManagedBy tags)
- [ ] **VERIFIED**: Cross-stack dependencies properly configured
- [ ] **VERIFIED**: CloudFormation outputs exported with proper naming convention

**Secrets Management**:
- [ ] **VERIFIED**: AlphaVantage secret format: `{"apiKey":"PLACEHOLDER"}`
- [ ] **VERIFIED**: Alpaca secret format: `{"apiKey":"PLACEHOLDER","secretKey":"PLACEHOLDER","paper":true}`
- [ ] **VERIFIED**: Lambda functions have read permissions to secrets
- [ ] **VERIFIED**: Secret ARNs exported as CloudFormation outputs

**Error Handling and Resilience**:
- [ ] **VERIFIED**: Stack deployment fails gracefully with meaningful error messages
- [ ] **VERIFIED**: Lambda functions include basic error handling
- [ ] **VERIFIED**: Dead letter queues configured for EventBridge rules
- [ ] **VERIFIED**: CloudWatch alarms trigger on error thresholds

#### Error Handling

**Infrastructure Deployment Errors**:
- **CDK Bootstrap Failure**: Ensure AWS credentials have sufficient permissions
- **Stack Name Conflicts**: Use unique environment suffixes
- **Resource Limits**: Check AWS service limits for Lambda functions, DynamoDB tables
- **Region Availability**: Ensure all services available in selected region

**Lambda Function Errors**:
- **Runtime Errors**: All functions include try-catch blocks and CloudWatch logging
- **Environment Variable Errors**: Validate all required environment variables present
- **Permission Errors**: IAM policies grant necessary permissions

**API Gateway Errors**:
- **CORS Errors**: Proper preflight OPTIONS handling configured
- **Integration Errors**: Lambda proxy integration configured correctly
- **Rate Limiting**: Throttling configured to prevent abuse

**DynamoDB Errors**:
- **Provisioning Errors**: Use on-demand billing to avoid capacity planning
- **Permission Errors**: Lambda execution role has required DynamoDB permissions

#### Monitoring and Observability

**Required Metrics to Implement**:
- Lambda function duration, errors, invocations per function
- DynamoDB consumed read/write capacity units
- API Gateway request count, latency, 4xx/5xx errors
- EventBridge rule invocations and failures
- S3 bucket object count and size
- CloudFront cache hit rates and error rates

**Logging Requirements**:
- Structured JSON logging for all Lambda functions
- CloudWatch log groups with 30-day retention
- API Gateway access logs enabled
- EventBridge rule execution logs

**Alerting Configuration**:
- Lambda function error rate >5% (2 evaluation periods)
- API Gateway 5xx error rate >1% (2 evaluation periods)
- DynamoDB throttling events (1 evaluation period)
- EventBridge rule failures (1 evaluation period)

#### Troubleshooting Guide

**Common Issues and Solutions**:

1. **CDK Bootstrap Issues**:
   ```bash
   # Solution: Re-bootstrap with explicit region
   npx cdk bootstrap aws://ACCOUNT-ID/us-east-1
   ```

2. **Lambda Function Memory/Timeout Issues**:
   ```bash
   # Monitor and adjust in CloudWatch
   aws logs filter-log-events --log-group-name /aws/lambda/signal9-health-check-dev --filter-pattern "REPORT"
   ```

3. **API Gateway CORS Issues**:
   ```bash
   # Test CORS headers
   curl -H "Origin: https://example.com" -H "Access-Control-Request-Method: GET" -X OPTIONS $API_URL/health
   ```

4. **Secrets Manager Access Issues**:
   ```bash
   # Test secret access from Lambda
   aws lambda invoke --function-name signal9-health-check-dev --log-type Tail response.json
   ```

#### Post-Deployment Verification Checklist

**MANDATORY - Complete within 24 hours of deployment**:

1. **Test API Endpoints**:
   ```bash
   # Health check
   curl -v $API_URL/health
   
   # Assets endpoint (should return placeholder response)
   curl -v $API_URL/assets
   ```

2. **Verify CloudWatch Dashboards**:
   - Access dashboard URL from CloudFormation outputs
   - Confirm all widgets display data
   - Verify no error alarms triggered

3. **Test EventBridge Rules**:
   ```bash
   # Manually trigger a rule to test
   aws events put-events --entries Source=signal9.test,DetailType=test,Detail='{}'
   ```

4. **Update Secrets with Real Credentials**:
   ```bash
   # Update with actual API keys before other tickets
   aws secretsmanager update-secret --secret-id signal9-alphavantage-credentials-dev --secret-string '{"apiKey":"REAL_KEY"}'
   ```

#### Open Questions
- **RESOLVED**: All technical decisions documented and dependencies identified
- **RESOLVED**: Environment naming strategy defined (using environment suffix)
- **RESOLVED**: Resource tagging strategy implemented
- **RESOLVED**: Cost optimization strategies documented

#### Notes
- **Environment Management**: Use `--context environment=prod` for production deployment
- **Security**: Placeholder secrets must be updated with real credentials before integration testing
- **Performance**: Monitor cold start times in CloudWatch and optimize if >3 seconds
- **Cost Monitoring**: Set up billing alerts for unexpected charges
- **Scaling**: Infrastructure designed for horizontal scaling from day one
- **Maintenance**: CloudWatch log retention prevents indefinite storage costs
- **Version Control**: Tag deployment with git commit hash for traceability 
# Ticket 1.4: Alpaca API Integration

**Status**: Refinement Complete

#### Description
Implement comprehensive Alpaca API integration for Signal9 Advisor using the official Alpaca TypeScript SDK. This includes implementing asset synchronization logic for active assets, market data (OHLC) integration, rate limiting (200 requests per minute), data validation, and robust error handling. The integration must support daily asset sync at 4:00 AM and provide efficient market data retrieval for analysis.

#### Technical Details
- **Implementation Steps**:
  1. **Install Alpaca TypeScript SDK and Dependencies**
     ```bash
     # Install Alpaca SDK and dependencies
     npm install @alpacahq/alpaca-trade-api
     npm install @aws-sdk/client-secrets-manager
     npm install @aws-sdk/client-dynamodb
     npm install @aws-sdk/lib-dynamodb
     npm install ioredis
     npm install --save-dev @types/node
     ```

  2. **Implement Alpaca API Client with Rate Limiting**
     ```typescript
     // lib/alpaca-client.ts
     import { AlpacaClient, Asset, Bar, GetBarsParams } from '@alpacahq/alpaca-trade-api';
     import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
     import { Redis } from 'ioredis';
     
     interface AlpacaCredentials {
       apiKey: string;
       secretKey: string;
       paper: boolean;
     }
     
     interface RateLimitState {
       requestsThisMinute: number;
       lastResetTime: number;
     }
     
     export class AlpacaApiClient {
       private client: AlpacaClient;
       private readonly redisClient: Redis;
       private readonly secretsClient: SecretsManagerClient;
       private readonly maxRequestsPerMinute = 200;
       private readonly rateLimitKey = 'alpaca:rate_limit';
       
       constructor() {
         this.redisClient = new Redis({
           host: process.env.REDIS_ENDPOINT,
           port: parseInt(process.env.REDIS_PORT || '6379'),
           retryDelayOnFailover: 100,
           maxRetriesPerRequest: 3
         });
         
         this.secretsClient = new SecretsManagerClient({});
       }
       
       private async initializeClient(): Promise<void> {
         if (this.client) return;
         
         const credentials = await this.getCredentials();
         
         this.client = new AlpacaClient({
           credentials: {
             key: credentials.apiKey,
             secret: credentials.secretKey,
           },
           paper: credentials.paper,
           usePolygon: false
         });
       }
       
       private async getCredentials(): Promise<AlpacaCredentials> {
         const command = new GetSecretValueCommand({
           SecretId: process.env.ALPACA_SECRET_NAME || 'signal9-alpaca-credentials'
         });
         
         const response = await this.secretsClient.send(command);
         const credentials: AlpacaCredentials = JSON.parse(response.SecretString || '{}');
         
         if (!credentials.apiKey || !credentials.secretKey) {
           throw new Error('Invalid Alpaca credentials');
         }
         
         return credentials;
       }
       
       private async checkRateLimit(): Promise<void> {
         const now = Date.now();
         const minuteAgo = now - 60000;
         
         const rateLimitState: RateLimitState = JSON.parse(
           await this.redisClient.get(this.rateLimitKey) || 
           '{"requestsThisMinute":0,"lastResetTime":0}'
         );
         
         // Reset counter if a minute has passed
         if (rateLimitState.lastResetTime < minuteAgo) {
           rateLimitState.requestsThisMinute = 0;
           rateLimitState.lastResetTime = now;
         }
         
         // Check if we've exceeded the rate limit
         if (rateLimitState.requestsThisMinute >= this.maxRequestsPerMinute) {
           const waitTime = 60000 - (now - rateLimitState.lastResetTime);
           throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)} seconds.`);
         }
         
         // Update rate limit counter
         rateLimitState.requestsThisMinute++;
         await this.redisClient.setex(this.rateLimitKey, 60, JSON.stringify(rateLimitState));
       }
       
       private async executeWithRateLimit<T>(operation: () => Promise<T>): Promise<T> {
         await this.initializeClient();
         await this.checkRateLimit();
         
         try {
           return await operation();
         } catch (error) {
           if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
             // Wait and retry once
             await new Promise(resolve => setTimeout(resolve, 1000));
             await this.checkRateLimit();
             return await operation();
           }
           throw error;
         }
       }
       
       async getActiveAssets(): Promise<Asset[]> {
         return this.executeWithRateLimit(async () => {
           const assets = await this.client.getAssets({
             status: 'active'
           });
           
           return assets.filter(asset => 
             asset.status === 'active' && 
             asset.tradable === true
           );
         });
       }
       
       async getBars(symbol: string, params: GetBarsParams): Promise<Bar[]> {
         return this.executeWithRateLimit(async () => {
           const bars = await this.client.getBars({
             symbol,
             ...params
           });
           
           return bars[symbol] || [];
         });
       }
       
       async getAsset(symbol: string): Promise<Asset | null> {
         return this.executeWithRateLimit(async () => {
           try {
             return await this.client.getAsset(symbol);
           } catch (error) {
             if (error instanceof Error && error.message.includes('not found')) {
               return null;
             }
             throw error;
           }
         });
       }
       
       async getAssetsByStatus(status: 'active' | 'inactive'): Promise<Asset[]> {
         return this.executeWithRateLimit(async () => {
           return await this.client.getAssets({ status });
         });
       }
     }
     ```

  3. **Create Asset Synchronization Logic**
     ```typescript
     // lambda/alpaca/asset-sync.ts
     import { AlpacaApiClient } from '../../lib/alpaca-client';
     import { AssetValidator } from '../../lib/validators/asset-validator';
     import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
     import { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
     import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
     
     const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
     const alpacaClient = new AlpacaApiClient();
     const validator = new AssetValidator();
     const eventBridgeClient = new EventBridgeClient({});
     
     interface AssetSyncResult {
       totalAssets: number;
       newAssets: number;
       updatedAssets: number;
       deletedAssets: number;
       errors: string[];
     }
     
     export const handler = async (event: any): Promise<AssetSyncResult> => {
       const result: AssetSyncResult = {
         totalAssets: 0,
         newAssets: 0,
         updatedAssets: 0,
         deletedAssets: 0,
         errors: []
       };
       
       try {
         console.log('Starting asset synchronization...');
         
         // Get all active assets from Alpaca
         const activeAssets = await alpacaClient.getActiveAssets();
         console.log(`Retrieved ${activeAssets.length} active assets from Alpaca`);
         
         // Get existing assets from DynamoDB
         const existingAssets = await getExistingAssets();
         console.log(`Found ${existingAssets.length} existing assets in DynamoDB`);
         
         // Process each active asset
         for (const asset of activeAssets) {
           try {
             // Validate asset data
             const validatedAsset = validator.validate(asset);
             
             // Check if asset exists
             const existingAsset = existingAssets.find(ea => ea.symbol === asset.symbol);
             
             if (existingAsset) {
               // Update existing asset
               await updateAsset(validatedAsset);
               result.updatedAssets++;
             } else {
               // Create new asset
               await createAsset(validatedAsset);
               result.newAssets++;
               
               // Trigger pollenation event for new asset
               await triggerPollenationEvent(asset.symbol);
             }
             
             result.totalAssets++;
             
           } catch (error) {
             console.error(`Error processing asset ${asset.symbol}:`, error);
             result.errors.push(`${asset.symbol}: ${error}`);
           }
         }
         
         // Handle deleted assets (assets that exist in DB but not in Alpaca)
         const deletedAssets = existingAssets.filter(ea => 
           !activeAssets.find(aa => aa.symbol === ea.symbol)
         );
         
         for (const deletedAsset of deletedAssets) {
           await deleteAsset(deletedAsset.symbol);
           result.deletedAssets++;
         }
         
         console.log('Asset synchronization completed:', result);
         
         // Send completion event
         await sendSyncCompletionEvent(result);
         
         return result;
         
       } catch (error) {
         console.error('Asset synchronization failed:', error);
         throw error;
       }
     };
     
     async function getExistingAssets(): Promise<any[]> {
       const assets: any[] = [];
       let lastEvaluatedKey: any = undefined;
       
       do {
         const response = await dynamoClient.send(new QueryCommand({
           TableName: process.env.ASSETS_TABLE_NAME,
           KeyConditionExpression: 'begins_with(asset_id, :prefix)',
           ExpressionAttributeValues: {
             ':prefix': 'ASSET#'
           },
           ExclusiveStartKey: lastEvaluatedKey
         }));
         
         if (response.Items) {
           assets.push(...response.Items);
         }
         
         lastEvaluatedKey = response.LastEvaluatedKey;
       } while (lastEvaluatedKey);
       
       return assets;
     }
     
     async function createAsset(asset: any): Promise<void> {
       const item = {
         asset_id: `ASSET#${asset.symbol}`,
         symbol: asset.symbol,
         name: asset.name,
         exchange: asset.exchange,
         asset_class: asset.asset_class,
         status: asset.status,
         tradable: asset.tradable,
         marginable: asset.marginable,
         shortable: asset.shortable,
         easy_to_borrow: asset.easy_to_borrow,
         fractionable: asset.fractionable,
         min_order_size: asset.min_order_size,
         min_trade_increment: asset.min_trade_increment,
         price_increment: asset.price_increment,
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString(),
         data_source: 'alpaca'
       };
       
       await dynamoClient.send(new PutCommand({
         TableName: process.env.ASSETS_TABLE_NAME,
         Item: item
       }));
       
       console.log(`Created asset: ${asset.symbol}`);
     }
     
     async function updateAsset(asset: any): Promise<void> {
       const item = {
         asset_id: `ASSET#${asset.symbol}`,
         symbol: asset.symbol,
         name: asset.name,
         exchange: asset.exchange,
         asset_class: asset.asset_class,
         status: asset.status,
         tradable: asset.tradable,
         marginable: asset.marginable,
         shortable: asset.shortable,
         easy_to_borrow: asset.easy_to_borrow,
         fractionable: asset.fractionable,
         min_order_size: asset.min_order_size,
         min_trade_increment: asset.min_trade_increment,
         price_increment: asset.price_increment,
         updated_at: new Date().toISOString(),
         data_source: 'alpaca'
       };
       
       await dynamoClient.send(new PutCommand({
         TableName: process.env.ASSETS_TABLE_NAME,
         Item: item
       }));
       
       console.log(`Updated asset: ${asset.symbol}`);
     }
     
     async function deleteAsset(symbol: string): Promise<void> {
       await dynamoClient.send(new DeleteCommand({
         TableName: process.env.ASSETS_TABLE_NAME,
         Key: {
           asset_id: `ASSET#${symbol}`
         }
       }));
       
       console.log(`Deleted asset: ${symbol}`);
     }
     
     async function triggerPollenationEvent(symbol: string): Promise<void> {
       await eventBridgeClient.send(new PutEventsCommand({
         Entries: [{
           Source: 'signal9.advisor',
           DetailType: 'pollenationNeeded',
           Detail: JSON.stringify({
             assetId: symbol,
             dataTypes: ['company_overview', 'earnings', 'cash_flow', 'balance_sheet', 'income_statement'],
             priority: 'high',
             source: 'new_asset'
           })
         }]
       }));
     }
     
     async function sendSyncCompletionEvent(result: AssetSyncResult): Promise<void> {
       await eventBridgeClient.send(new PutEventsCommand({
         Entries: [{
           Source: 'signal9.advisor',
           DetailType: 'assetSyncComplete',
           Detail: JSON.stringify({
             timestamp: new Date().toISOString(),
             result: result
           })
         }]
       }));
     }
     ```

  4. **Implement Asset Data Validation**
     ```typescript
     // lib/validators/asset-validator.ts
     import { Asset } from '@alpacahq/alpaca-trade-api';
     
     export class AssetValidator {
       validate(asset: Asset): Asset {
         // Required fields validation
         const requiredFields = ['id', 'symbol', 'name', 'exchange', 'asset_class', 'status'];
         for (const field of requiredFields) {
           if (!asset[field as keyof Asset]) {
             throw new Error(`Missing required field: ${field}`);
           }
         }
         
         // Symbol validation
         if (!this.isValidSymbol(asset.symbol)) {
           throw new Error(`Invalid symbol format: ${asset.symbol}`);
         }
         
         // Exchange validation
         const validExchanges = ['NYSE', 'NASDAQ', 'ARCA', 'BATS', 'IEX', 'EDGX'];
         if (!validExchanges.includes(asset.exchange)) {
           throw new Error(`Invalid exchange: ${asset.exchange}`);
         }
         
         // Asset class validation
         const validAssetClasses = ['us_equity', 'crypto', 'fx'];
         if (!validAssetClasses.includes(asset.asset_class)) {
           throw new Error(`Invalid asset class: ${asset.asset_class}`);
         }
         
         // Status validation
         const validStatuses = ['active', 'inactive'];
         if (!validStatuses.includes(asset.status)) {
           throw new Error(`Invalid status: ${asset.status}`);
         }
         
         // Boolean field validation
         const booleanFields = ['tradable', 'marginable', 'shortable', 'easy_to_borrow', 'fractionable'];
         for (const field of booleanFields) {
           if (asset[field as keyof Asset] !== undefined && 
               typeof asset[field as keyof Asset] !== 'boolean') {
             throw new Error(`Invalid boolean value for field ${field}: ${asset[field as keyof Asset]}`);
           }
         }
         
         // Numeric field validation
         const numericFields = ['min_order_size', 'min_trade_increment', 'price_increment'];
         for (const field of numericFields) {
           const value = asset[field as keyof Asset];
           if (value !== undefined && value !== null && isNaN(Number(value))) {
             throw new Error(`Invalid numeric value for field ${field}: ${value}`);
           }
         }
         
         return asset;
       }
       
       private isValidSymbol(symbol: string): boolean {
         // Basic symbol validation
         const symbolRegex = /^[A-Z]{1,5}$/;
         return symbolRegex.test(symbol);
       }
       
       validateBars(bars: any[]): any[] {
         return bars.map(bar => {
           // Required fields for bars
           const requiredFields = ['t', 'o', 'h', 'l', 'c', 'v'];
           for (const field of requiredFields) {
             if (!bar[field]) {
               throw new Error(`Missing required field in bar: ${field}`);
             }
           }
           
           // Validate timestamp
           if (typeof bar.t !== 'number' || bar.t <= 0) {
             throw new Error(`Invalid timestamp in bar: ${bar.t}`);
           }
           
           // Validate OHLC values
           const ohlcFields = ['o', 'h', 'l', 'c'];
           for (const field of ohlcFields) {
             if (typeof bar[field] !== 'number' || bar[field] < 0) {
               throw new Error(`Invalid OHLC value for ${field}: ${bar[field]}`);
             }
           }
           
           // Validate volume
           if (typeof bar.v !== 'number' || bar.v < 0) {
             throw new Error(`Invalid volume: ${bar.v}`);
           }
           
           return bar;
         });
       }
     }
     ```

  5. **Set up Daily Asset Sync at 4:00 AM**
     ```typescript
     // lib/scheduled-asset-sync.ts
     import * as cdk from 'aws-cdk-lib';
     import * as events from 'aws-cdk-lib/aws-events';
     import * as targets from 'aws-cdk-lib/aws-events-targets';
     import * as lambda from 'aws-cdk-lib/aws-lambda';
     import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
     
     export class ScheduledAssetSync {
       constructor(private scope: cdk.Stack) {}
       
       public createAssetSyncRule(assetSyncLambda: nodejs.NodejsFunction): events.Rule {
         // Create EventBridge rule for daily asset sync at 4:00 AM UTC
         const assetSyncRule = new events.Rule(this.scope, 'DailyAssetSyncRule', {
           schedule: events.Schedule.cron({
             minute: '0',
             hour: '4',
             timeZone: 'UTC'
           }),
           description: 'Daily asset synchronization with Alpaca API at 4:00 AM UTC',
           targets: [
             new targets.LambdaFunction(assetSyncLambda, {
               event: events.RuleTargetInput.fromObject({
                 syncType: 'daily',
                 timestamp: '${time}',
                 source: 'scheduled'
               })
             })
           ]
         });
         
         // Add CloudWatch alarm for sync failures
         const syncFailureAlarm = new cdk.aws_cloudwatch.Alarm(this.scope, 'AssetSyncFailureAlarm', {
           metric: assetSyncLambda.metricErrors({
             period: cdk.Duration.minutes(5)
           }),
           threshold: 1,
           evaluationPeriods: 1,
           alarmDescription: 'Alert when asset sync fails'
         });
         
         return assetSyncRule;
       }
     }
     ```

  6. **Create Asset Status Tracking and Updates**
     ```typescript
     // lambda/alpaca/asset-status-tracker.ts
     import { AlpacaApiClient } from '../../lib/alpaca-client';
     import { DynamoDBDocumentClient, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
     import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
     
     const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
     const alpacaClient = new AlpacaApiClient();
     
     interface AssetStatusUpdate {
       symbol: string;
       oldStatus: string;
       newStatus: string;
       timestamp: string;
     }
     
     export const handler = async (event: any): Promise<AssetStatusUpdate[]> => {
       const updates: AssetStatusUpdate[] = [];
       
       try {
         // Get all assets from DynamoDB
         const assets = await getAllAssets();
         
         // Check status for each asset
         for (const asset of assets) {
           try {
             const currentAsset = await alpacaClient.getAsset(asset.symbol);
             
             if (currentAsset && currentAsset.status !== asset.status) {
               // Status has changed
               await updateAssetStatus(asset.symbol, currentAsset.status);
               
               updates.push({
                 symbol: asset.symbol,
                 oldStatus: asset.status,
                 newStatus: currentAsset.status,
                 timestamp: new Date().toISOString()
               });
               
               console.log(`Asset status updated: ${asset.symbol} ${asset.status} -> ${currentAsset.status}`);
             }
             
           } catch (error) {
             console.error(`Error checking status for asset ${asset.symbol}:`, error);
           }
         }
         
         // Log summary
         console.log(`Asset status tracking completed. ${updates.length} status updates found.`);
         
         return updates;
         
       } catch (error) {
         console.error('Asset status tracking failed:', error);
         throw error;
       }
     };
     
     async function getAllAssets(): Promise<any[]> {
       const assets: any[] = [];
       let lastEvaluatedKey: any = undefined;
       
       do {
         const response = await dynamoClient.send(new QueryCommand({
           TableName: process.env.ASSETS_TABLE_NAME,
           KeyConditionExpression: 'begins_with(asset_id, :prefix)',
           ExpressionAttributeValues: {
             ':prefix': 'ASSET#'
           },
           ExclusiveStartKey: lastEvaluatedKey
         }));
         
         if (response.Items) {
           assets.push(...response.Items);
         }
         
         lastEvaluatedKey = response.LastEvaluatedKey;
       } while (lastEvaluatedKey);
       
       return assets;
     }
     
     async function updateAssetStatus(symbol: string, newStatus: string): Promise<void> {
       await dynamoClient.send(new UpdateCommand({
         TableName: process.env.ASSETS_TABLE_NAME,
         Key: {
           asset_id: `ASSET#${symbol}`
         },
         UpdateExpression: 'SET #status = :status, updated_at = :updated_at',
         ExpressionAttributeNames: {
           '#status': 'status'
         },
         ExpressionAttributeValues: {
           ':status': newStatus,
           ':updated_at': new Date().toISOString()
         }
       }));
     }
     ```

  7. **Set up Market Data (OHLC) Integration**
     ```typescript
     // lambda/alpaca/market-data.ts
     import { AlpacaApiClient } from '../../lib/alpaca-client';
     import { AssetValidator } from '../../lib/validators/asset-validator';
     import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
     import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
     
     const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
     const alpacaClient = new AlpacaApiClient();
     const validator = new AssetValidator();
     
     interface MarketDataRequest {
       symbol: string;
       timeframe: '1Min' | '5Min' | '15Min' | '30Min' | '1Hour' | '1Day';
       start?: string;
       end?: string;
       limit?: number;
     }
     
     export const handler = async (event: MarketDataRequest): Promise<any> => {
       try {
         console.log(`Fetching market data for ${event.symbol} with timeframe ${event.timeframe}`);
         
         // Get bars from Alpaca
         const bars = await alpacaClient.getBars(event.symbol, {
           timeframe: event.timeframe,
           start: event.start,
           end: event.end,
           limit: event.limit || 100
         });
         
         // Validate bars
         const validatedBars = validator.validateBars(bars);
         
         // Store bars in DynamoDB
         const storedBars = [];
         for (const bar of validatedBars) {
           const item = {
             asset_id: `ASSET#${event.symbol}`,
             timestamp: bar.t,
             timeframe: event.timeframe,
             open: bar.o,
             high: bar.h,
             low: bar.l,
             close: bar.c,
             volume: bar.v,
             created_at: new Date().toISOString(),
             data_source: 'alpaca'
           };
           
           await dynamoClient.send(new PutCommand({
             TableName: process.env.MARKET_DATA_TABLE_NAME,
             Item: item
           }));
           
           storedBars.push(item);
         }
         
         console.log(`Stored ${storedBars.length} bars for ${event.symbol}`);
         
         return {
           symbol: event.symbol,
           timeframe: event.timeframe,
           barCount: storedBars.length,
           bars: storedBars
         };
         
       } catch (error) {
         console.error(`Error fetching market data for ${event.symbol}:`, error);
         throw error;
       }
     };
     
     // Lambda function for batch market data retrieval
     export const batchMarketDataHandler = async (event: any): Promise<any> => {
       const { symbols, timeframe, start, end } = event;
       const results = [];
       
       for (const symbol of symbols) {
         try {
           const result = await handler({
             symbol,
             timeframe,
             start,
             end
           });
           
           results.push(result);
           
           // Add delay to respect rate limits
           await new Promise(resolve => setTimeout(resolve, 100));
           
         } catch (error) {
           console.error(`Error processing ${symbol}:`, error);
           results.push({
             symbol,
             error: error.message
           });
         }
       }
       
       return {
         processed: results.length,
         successful: results.filter(r => !r.error).length,
         failed: results.filter(r => r.error).length,
         results
       };
     };
     ```

  8. **Configure API Credential Retrieval from Secrets Manager**
     ```typescript
     // lib/secrets/alpaca-secrets.ts
     import { SecretsManagerClient, GetSecretValueCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';
     
     interface AlpacaCredentials {
       apiKey: string;
       secretKey: string;
       paper: boolean;
     }
     
     export class AlpacaSecrets {
       private readonly secretsClient: SecretsManagerClient;
       private readonly secretName: string;
       
       constructor() {
         this.secretsClient = new SecretsManagerClient({});
         this.secretName = process.env.ALPACA_SECRET_NAME || 'signal9-alpaca-credentials';
       }
       
       async getCredentials(): Promise<AlpacaCredentials> {
         try {
           const command = new GetSecretValueCommand({
             SecretId: this.secretName
           });
           
           const response = await this.secretsClient.send(command);
           
           if (!response.SecretString) {
             throw new Error('No secret string found in Alpaca credentials');
           }
           
           const credentials: AlpacaCredentials = JSON.parse(response.SecretString);
           
           if (!credentials.apiKey || !credentials.secretKey) {
             throw new Error('API key or secret key not found in Alpaca credentials');
           }
           
           return credentials;
           
         } catch (error) {
           console.error('Error retrieving Alpaca credentials:', error);
           throw new Error(`Failed to retrieve Alpaca credentials: ${error}`);
         }
       }
       
       async updateCredentials(newCredentials: AlpacaCredentials): Promise<void> {
         try {
           const command = new UpdateSecretCommand({
             SecretId: this.secretName,
             SecretString: JSON.stringify(newCredentials)
           });
           
           await this.secretsClient.send(command);
           
         } catch (error) {
           console.error('Error updating Alpaca credentials:', error);
           throw new Error(`Failed to update Alpaca credentials: ${error}`);
         }
       }
       
       async validateCredentials(credentials: AlpacaCredentials): Promise<boolean> {
         try {
           // Test credentials by making a simple API call
           const { AlpacaClient } = await import('@alpacahq/alpaca-trade-api');
           
           const client = new AlpacaClient({
             credentials: {
               key: credentials.apiKey,
               secret: credentials.secretKey,
             },
             paper: credentials.paper,
             usePolygon: false
           });
           
           // Try to get account information
           await client.getAccount();
           
           return true;
           
         } catch (error) {
           console.error('Error validating Alpaca credentials:', error);
           return false;
         }
       }
     }
     ```

- **Architecture Considerations**:
  - Use official Alpaca TypeScript SDK for reliable API integration
  - Implement rate limiting to stay within 200 requests per minute
  - Daily asset sync at 4:00 AM UTC for consistency
  - Comprehensive data validation for all asset and market data
  - Event-driven integration with existing data pipeline
  - Efficient market data storage and retrieval

- **Security Requirements**:
  - API credentials stored securely in AWS Secrets Manager
  - All API calls use HTTPS
  - Rate limiting to prevent API abuse
  - Input validation and sanitization
  - Error logging without exposing sensitive data

- **Performance Requirements**:
  - Rate limiting compliance (200 requests per minute)
  - Efficient asset synchronization with batch processing
  - Market data retrieval with configurable timeframes
  - Sub-second response times for cached data
  - Optimized DynamoDB storage patterns

#### Dependencies
- **Prerequisites**:
  - Phase 1 Task 1: AWS Infrastructure Setup (completed)
  - Phase 1 Task 2: Data Pipeline Architecture (completed)
  - Alpaca API credentials in AWS Secrets Manager
  - DynamoDB tables for asset and market data storage
  - ElastiCache Redis for rate limiting
- **Dependent Tickets**:
  - Phase 1 Task 5: Event-Driven Processing Implementation
  - Phase 1 Task 6: Data Quality and Validation

#### Testing Requirements
- **Unit Tests**:
  - Alpaca API client unit tests
  - Asset validation tests
  - Rate limiting logic tests
  - Market data validation tests
  - Error handling and retry logic tests

- **Integration Tests**:
  - End-to-end API integration tests
  - Secrets Manager integration tests
  - DynamoDB storage integration tests
  - EventBridge integration tests
  - Market data retrieval integration tests

- **Performance Tests**:
  - API response time tests
  - Rate limiting compliance tests
  - Asset sync performance tests
  - Market data retrieval performance tests
  - Batch processing performance tests

- **Security Tests**:
  - API credential security tests
  - Input validation security tests
  - Error message security tests
  - Rate limiting security tests

#### Acceptance Criteria
- [ ] Alpaca TypeScript SDK integration implemented
- [ ] Asset synchronization logic for active assets implemented
- [ ] Asset data validation using comprehensive validation rules
- [ ] Daily asset sync at 4:00 AM UTC configured
- [ ] Asset status tracking and updates implemented
- [ ] Market data (OHLC) integration with multiple timeframes
- [ ] Rate limiting strictly enforced (200 requests per minute)
- [ ] API credentials retrieved securely from Secrets Manager
- [ ] All data properly stored in DynamoDB tables
- [ ] CloudWatch logging and monitoring configured
- [ ] All unit tests pass with >90% coverage
- [ ] Integration tests pass successfully
- [ ] Performance benchmarks met
- [ ] Security requirements validated
- [ ] Code review completed
- [ ] Documentation updated

#### Error Handling
- **API Rate Limiting**: Automatic retry with exponential backoff
- **API Failures**: Comprehensive error logging and notification
- **Data Validation Errors**: Detailed error reporting and logging
- **Network Failures**: Retry logic with circuit breaker pattern
- **Secrets Manager Errors**: Fallback mechanisms and alerting
- **Asset Sync Failures**: Partial sync with error reporting

#### Monitoring and Observability
- **Metrics to Track**:
  - API call success/failure rates
  - Rate limiting compliance
  - Asset sync success rates
  - Market data retrieval performance
  - Asset status change frequency
  - Daily API call count

- **Logging Requirements**:
  - Structured logging for all API calls
  - Error logging with context
  - Rate limiting event logging
  - Asset sync result logging
  - Market data retrieval logging

- **Alerting Criteria**:
  - API failure rate >10%
  - Rate limit exceeded
  - Asset sync failure rate >5%
  - Market data retrieval failure rate >10%
  - API response time >5 seconds

#### Open Questions
- None - all technical decisions have been made and documented

#### Notes
- Use Alpaca paper trading environment for development and testing
- Implement efficient batch processing for market data retrieval
- Monitor API usage closely to stay within rate limits
- Consider implementing data compression for market data storage
- Plan for potential upgrade to Alpaca Pro for higher rate limits
- Implement proper error recovery for partial sync failures
- Consider implementing market data caching for frequently accessed symbols 
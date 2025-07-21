# Ticket 1.3: AlphaVantage API Integration

**Status**: Refinement Complete

#### Description
Implement comprehensive AlphaVantage API integration for Signal9 Advisor with strict rate limiting (25 calls/day free tier), data validation using AlphaVantage models, caching strategies, and robust error handling. This includes implementing all required endpoints (Company Overview, Earnings, Cash Flow, Balance Sheet, Income Statement, News Sentiment) with proper data ingestion, validation, and storage mechanisms.

#### Technical Details
- **Implementation Steps**:
  1. **Implement AlphaVantage API Client with Rate Limiting**
     ```typescript
     // lib/alphavantage-client.ts
     import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
     import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
     import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
     import { Redis } from 'ioredis';
     
     interface AlphaVantageCredentials {
       apiKey: string;
     }
     
     interface RateLimitState {
       callsToday: number;
       lastResetDate: string;
       lastCallTime: number;
     }
     
     export class AlphaVantageClient {
       private readonly baseUrl = 'https://www.alphavantage.co/query';
       private readonly maxCallsPerDay = 25;
       private readonly redisClient: Redis;
       private readonly dynamoClient: DynamoDBDocumentClient;
       private readonly secretsClient: SecretsManagerClient;
       
       constructor() {
         this.redisClient = new Redis({
           host: process.env.REDIS_ENDPOINT,
           port: parseInt(process.env.REDIS_PORT || '6379'),
           retryDelayOnFailover: 100,
           maxRetriesPerRequest: 3
         });
         
         this.dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
         this.secretsClient = new SecretsManagerClient({});
       }
       
       private async getApiKey(): Promise<string> {
         const command = new GetSecretValueCommand({
           SecretId: process.env.ALPHAVANTAGE_SECRET_NAME
         });
         
         const response = await this.secretsClient.send(command);
         const credentials: AlphaVantageCredentials = JSON.parse(response.SecretString || '{}');
         return credentials.apiKey;
       }
       
       private async checkRateLimit(): Promise<boolean> {
         const rateLimitKey = 'alphavantage:rate_limit';
         const today = new Date().toISOString().split('T')[0];
         
         const rateLimitState: RateLimitState = JSON.parse(
           await this.redisClient.get(rateLimitKey) || '{"callsToday":0,"lastResetDate":"","lastCallTime":0}'
         );
         
         // Reset counter if it's a new day
         if (rateLimitState.lastResetDate !== today) {
           rateLimitState.callsToday = 0;
           rateLimitState.lastResetDate = today;
         }
         
         // Check if we've exceeded daily limit
         if (rateLimitState.callsToday >= this.maxCallsPerDay) {
           throw new Error(`AlphaVantage daily limit exceeded (${this.maxCallsPerDay} calls)`);
         }
         
         // Enforce minimum delay between calls (1 second)
         const now = Date.now();
         const timeSinceLastCall = now - rateLimitState.lastCallTime;
         if (timeSinceLastCall < 1000) {
           await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastCall));
         }
         
         return true;
       }
       
       private async updateRateLimit(): Promise<void> {
         const rateLimitKey = 'alphavantage:rate_limit';
         const today = new Date().toISOString().split('T')[0];
         
         const rateLimitState: RateLimitState = JSON.parse(
           await this.redisClient.get(rateLimitKey) || '{"callsToday":0,"lastResetDate":"","lastCallTime":0}'
         );
         
         if (rateLimitState.lastResetDate !== today) {
           rateLimitState.callsToday = 0;
           rateLimitState.lastResetDate = today;
         }
         
         rateLimitState.callsToday++;
         rateLimitState.lastCallTime = Date.now();
         
         await this.redisClient.setex(rateLimitKey, 86400, JSON.stringify(rateLimitState));
       }
       
       private async makeApiCall(functionName: string, symbol: string, additionalParams: Record<string, string> = {}): Promise<any> {
         await this.checkRateLimit();
         
         const apiKey = await this.getApiKey();
         const params = new URLSearchParams({
           function: functionName,
           symbol: symbol,
           apikey: apiKey,
           ...additionalParams
         });
         
         const response = await fetch(`${this.baseUrl}?${params.toString()}`);
         
         if (!response.ok) {
           throw new Error(`AlphaVantage API error: ${response.status} ${response.statusText}`);
         }
         
         const data = await response.json();
         
         if (data['Error Message']) {
           throw new Error(`AlphaVantage API error: ${data['Error Message']}`);
         }
         
         if (data['Note']) {
           throw new Error(`AlphaVantage API rate limit: ${data['Note']}`);
         }
         
         await this.updateRateLimit();
         return data;
       }
       
       async getCompanyOverview(symbol: string): Promise<any> {
         return this.makeApiCall('OVERVIEW', symbol);
       }
       
       async getEarnings(symbol: string): Promise<any> {
         return this.makeApiCall('EARNINGS', symbol);
       }
       
       async getCashFlow(symbol: string): Promise<any> {
         return this.makeApiCall('CASH_FLOW', symbol);
       }
       
       async getBalanceSheet(symbol: string): Promise<any> {
         return this.makeApiCall('BALANCE_SHEET', symbol);
       }
       
       async getIncomeStatement(symbol: string): Promise<any> {
         return this.makeApiCall('INCOME_STATEMENT', symbol);
       }
       
       async getNewsSentiment(symbol: string): Promise<any> {
         return this.makeApiCall('NEWS_SENTIMENT', symbol);
       }
     }
     ```

  2. **Create Data Ingestion for Company Overview Endpoint**
     ```typescript
     // lambda/alphavantage/company-overview.ts
     import { AlphaVantageClient } from '../../lib/alphavantage-client';
     import { CompanyOverviewValidator } from '../../lib/validators/company-overview-validator';
     import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
     import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
     
     const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
     const alphaVantageClient = new AlphaVantageClient();
     const validator = new CompanyOverviewValidator();
     
     export const handler = async (event: any): Promise<any> => {
       const { symbol } = event;
       
       try {
         // Get company overview data
         const overviewData = await alphaVantageClient.getCompanyOverview(symbol);
         
         // Validate data using AlphaVantage model
         const validatedData = validator.validate(overviewData);
         
         // Store in DynamoDB
         const item = {
           asset_id: symbol,
           overview_data: validatedData,
           last_updated: new Date().toISOString(),
           data_source: 'alphavantage',
           version: '1.0'
         };
         
         await dynamoClient.send(new PutCommand({
           TableName: process.env.COMPANY_OVERVIEW_TABLE_NAME,
           Item: item
         }));
         
         // Cache in Redis for 24 hours
         await alphaVantageClient['redisClient'].setex(
           `overview:${symbol}`,
           86400,
           JSON.stringify(validatedData)
         );
         
         return {
           statusCode: 200,
           body: JSON.stringify({
             message: 'Company overview data ingested successfully',
             symbol,
             timestamp: new Date().toISOString()
           })
         };
         
       } catch (error) {
         console.error('Error ingesting company overview:', error);
         throw error;
       }
     };
     ```

  3. **Create Data Ingestion for Earnings Endpoint**
     ```typescript
     // lambda/alphavantage/earnings.ts
     import { AlphaVantageClient } from '../../lib/alphavantage-client';
     import { EarningsValidator } from '../../lib/validators/earnings-validator';
     import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
     
     const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
     const alphaVantageClient = new AlphaVantageClient();
     const validator = new EarningsValidator();
     
     export const handler = async (event: any): Promise<any> => {
       const { symbol } = event;
       
       try {
         // Get earnings data
         const earningsData = await alphaVantageClient.getEarnings(symbol);
         
         // Validate data using AlphaVantage model
         const validatedData = validator.validate(earningsData);
         
         // Process quarterly earnings
         for (const earning of validatedData.quarterlyEarnings) {
           const item = {
             asset_id: symbol,
             fiscal_date: earning.fiscalDateEnding,
             reported_eps: earning.reportedEPS,
             estimated_eps: earning.estimatedEPS,
             surprise: earning.surprise,
             surprise_percentage: earning.surprisePercentage,
             last_updated: new Date().toISOString(),
             data_source: 'alphavantage'
           };
           
           await dynamoClient.send(new PutCommand({
             TableName: process.env.EARNINGS_TABLE_NAME,
             Item: item
           }));
         }
         
         // Process annual earnings
         for (const earning of validatedData.annualEarnings) {
           const item = {
             asset_id: symbol,
             fiscal_date: earning.fiscalDateEnding,
             reported_eps: earning.reportedEPS,
             estimated_eps: earning.estimatedEPS,
             surprise: earning.surprise,
             surprise_percentage: earning.surprisePercentage,
             last_updated: new Date().toISOString(),
             data_source: 'alphavantage',
             period_type: 'annual'
           };
           
           await dynamoClient.send(new PutCommand({
             TableName: process.env.EARNINGS_TABLE_NAME,
             Item: item
           }));
         }
         
         return {
           statusCode: 200,
           body: JSON.stringify({
             message: 'Earnings data ingested successfully',
             symbol,
             quarterlyCount: validatedData.quarterlyEarnings.length,
             annualCount: validatedData.annualEarnings.length,
             timestamp: new Date().toISOString()
           })
         };
         
       } catch (error) {
         console.error('Error ingesting earnings:', error);
         throw error;
       }
     };
     ```

  4. **Create Data Ingestion for Cash Flow Endpoint**
     ```typescript
     // lambda/alphavantage/cash-flow.ts
     import { AlphaVantageClient } from '../../lib/alphavantage-client';
     import { CashFlowValidator } from '../../lib/validators/cash-flow-validator';
     import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
     
     const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
     const alphaVantageClient = new AlphaVantageClient();
     const validator = new CashFlowValidator();
     
     export const handler = async (event: any): Promise<any> => {
       const { symbol } = event;
       
       try {
         // Get cash flow data
         const cashFlowData = await alphaVantageClient.getCashFlow(symbol);
         
         // Validate data using AlphaVantage model
         const validatedData = validator.validate(cashFlowData);
         
         // Process quarterly cash flow
         for (const cashFlow of validatedData.quarterlyReports) {
           const item = {
             asset_id: symbol,
             fiscal_date: cashFlow.fiscalDateEnding,
             operating_cash_flow: cashFlow.operatingCashflow,
             capital_expenditures: cashFlow.capitalExpenditures,
             cash_flow_from_investment: cashFlow.cashflowFromInvestment,
             cash_flow_from_financing: cashFlow.cashflowFromFinancing,
             net_income: cashFlow.netIncome,
             change_in_cash: cashFlow.changeInCash,
             change_in_receivables: cashFlow.changeInReceivables,
             change_in_inventory: cashFlow.changeInInventory,
             change_in_net_income: cashFlow.changeInNetIncome,
             last_updated: new Date().toISOString(),
             data_source: 'alphavantage'
           };
           
           await dynamoClient.send(new PutCommand({
             TableName: process.env.CASH_FLOW_TABLE_NAME,
             Item: item
           }));
         }
         
         return {
           statusCode: 200,
           body: JSON.stringify({
             message: 'Cash flow data ingested successfully',
             symbol,
             quarterlyCount: validatedData.quarterlyReports.length,
             timestamp: new Date().toISOString()
           })
         };
         
       } catch (error) {
         console.error('Error ingesting cash flow:', error);
         throw error;
       }
     };
     ```

  5. **Create Data Ingestion for Balance Sheet Endpoint**
     ```typescript
     // lambda/alphavantage/balance-sheet.ts
     import { AlphaVantageClient } from '../../lib/alphavantage-client';
     import { BalanceSheetValidator } from '../../lib/validators/balance-sheet-validator';
     import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
     
     const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
     const alphaVantageClient = new AlphaVantageClient();
     const validator = new BalanceSheetValidator();
     
     export const handler = async (event: any): Promise<any> => {
       const { symbol } = event;
       
       try {
         // Get balance sheet data
         const balanceSheetData = await alphaVantageClient.getBalanceSheet(symbol);
         
         // Validate data using AlphaVantage model
         const validatedData = validator.validate(balanceSheetData);
         
         // Process quarterly balance sheet
         for (const balanceSheet of validatedData.quarterlyReports) {
           const item = {
             asset_id: symbol,
             fiscal_date: balanceSheet.fiscalDateEnding,
             total_assets: balanceSheet.totalAssets,
             total_current_assets: balanceSheet.totalCurrentAssets,
             cash_and_equivalents: balanceSheet.cashAndCashEquivalentsAtCarryingValue,
             cash_and_short_term_investments: balanceSheet.cashAndShortTermInvestments,
             inventory: balanceSheet.inventory,
             current_net_receivables: balanceSheet.currentNetReceivables,
             total_liabilities: balanceSheet.totalLiabilities,
             total_current_liabilities: balanceSheet.totalCurrentLiabilities,
             current_accounts_payable: balanceSheet.currentAccountsPayable,
             deferred_revenue: balanceSheet.deferredRevenue,
             current_debt: balanceSheet.currentDebt,
             short_term_debt: balanceSheet.shortTermDebt,
             total_shareholder_equity: balanceSheet.totalShareholderEquity,
             treasury_stock: balanceSheet.treasuryStock,
             retained_earnings: balanceSheet.retainedEarnings,
             common_stock: balanceSheet.commonStock,
             last_updated: new Date().toISOString(),
             data_source: 'alphavantage'
           };
           
           await dynamoClient.send(new PutCommand({
             TableName: process.env.BALANCE_SHEET_TABLE_NAME,
             Item: item
           }));
         }
         
         return {
           statusCode: 200,
           body: JSON.stringify({
             message: 'Balance sheet data ingested successfully',
             symbol,
             quarterlyCount: validatedData.quarterlyReports.length,
             timestamp: new Date().toISOString()
           })
         };
         
       } catch (error) {
         console.error('Error ingesting balance sheet:', error);
         throw error;
       }
     };
     ```

  6. **Create Data Ingestion for Income Statement Endpoint**
     ```typescript
     // lambda/alphavantage/income-statement.ts
     import { AlphaVantageClient } from '../../lib/alphavantage-client';
     import { IncomeStatementValidator } from '../../lib/validators/income-statement-validator';
     import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
     
     const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
     const alphaVantageClient = new AlphaVantageClient();
     const validator = new IncomeStatementValidator();
     
     export const handler = async (event: any): Promise<any> => {
       const { symbol } = event;
       
       try {
         // Get income statement data
         const incomeStatementData = await alphaVantageClient.getIncomeStatement(symbol);
         
         // Validate data using AlphaVantage model
         const validatedData = validator.validate(incomeStatementData);
         
         // Process quarterly income statement
         for (const incomeStatement of validatedData.quarterlyReports) {
           const item = {
             asset_id: symbol,
             fiscal_date: incomeStatement.fiscalDateEnding,
             total_revenue: incomeStatement.totalRevenue,
             gross_profit: incomeStatement.grossProfit,
             operating_income: incomeStatement.operatingIncome,
             net_income: incomeStatement.netIncome,
             research_and_development: incomeStatement.researchAndDevelopment,
             operating_expense: incomeStatement.operatingExpense,
             selling_general_and_administrative: incomeStatement.sellingGeneralAndAdministrative,
             other_operating_expenses: incomeStatement.otherOperatingExpenses,
             interest_expense: incomeStatement.interestExpense,
             income_before_tax: incomeStatement.incomeBeforeTax,
             income_tax_expense: incomeStatement.incomeTaxExpense,
             net_income_from_continuing_ops: incomeStatement.netIncomeFromContinuingOps,
             comprehensive_income_net_of_tax: incomeStatement.comprehensiveIncomeNetOfTax,
             ebit: incomeStatement.ebit,
             ebitda: incomeStatement.ebitda,
             last_updated: new Date().toISOString(),
             data_source: 'alphavantage'
           };
           
           await dynamoClient.send(new PutCommand({
             TableName: process.env.INCOME_STATEMENT_TABLE_NAME,
             Item: item
           }));
         }
         
         return {
           statusCode: 200,
           body: JSON.stringify({
             message: 'Income statement data ingested successfully',
             symbol,
             quarterlyCount: validatedData.quarterlyReports.length,
             timestamp: new Date().toISOString()
           })
         };
         
       } catch (error) {
         console.error('Error ingesting income statement:', error);
         throw error;
       }
     };
     ```

  7. **Create Data Ingestion for News Sentiment Endpoint**
     ```typescript
     // lambda/alphavantage/news-sentiment.ts
     import { AlphaVantageClient } from '../../lib/alphavantage-client';
     import { NewsSentimentValidator } from '../../lib/validators/news-sentiment-validator';
     import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
     
     const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
     const alphaVantageClient = new AlphaVantageClient();
     const validator = new NewsSentimentValidator();
     
     export const handler = async (event: any): Promise<any> => {
       const { symbol } = event;
       
       try {
         // Get news sentiment data
         const newsSentimentData = await alphaVantageClient.getNewsSentiment(symbol);
         
         // Validate data using AlphaVantage model
         const validatedData = validator.validate(newsSentimentData);
         
         // Process news items
         for (const newsItem of validatedData.feed) {
           const item = {
             news_id: newsItem.url, // Use URL as unique identifier
             asset_symbol: symbol,
             title: newsItem.title,
             url: newsItem.url,
             time_published: newsItem.timePublished,
             authors: newsItem.authors,
             summary: newsItem.summary,
             banner_image: newsItem.bannerImage,
             source: newsItem.source,
             category_within_source: newsItem.categoryWithinSource,
             source_domain: newsItem.sourceDomain,
             topics: newsItem.topics,
             overall_sentiment_score: newsItem.overallSentimentScore,
             overall_sentiment_label: newsItem.overallSentimentLabel,
             ticker_sentiment: newsItem.tickerSentiment,
             relevance_score: newsItem.relevanceScore,
             last_updated: new Date().toISOString(),
             data_source: 'alphavantage'
           };
           
           await dynamoClient.send(new PutCommand({
             TableName: process.env.NEWS_TABLE_NAME,
             Item: item
           }));
         }
         
         return {
           statusCode: 200,
           body: JSON.stringify({
             message: 'News sentiment data ingested successfully',
             symbol,
             newsCount: validatedData.feed.length,
             timestamp: new Date().toISOString()
           })
         };
         
       } catch (error) {
         console.error('Error ingesting news sentiment:', error);
         throw error;
       }
     };
     ```

  8. **Implement Data Validation Using AlphaVantage Models**
     ```typescript
     // lib/validators/base-validator.ts
     export abstract class BaseValidator {
       protected validateRequiredFields(data: any, requiredFields: string[]): void {
         for (const field of requiredFields) {
           if (!data[field]) {
             throw new Error(`Missing required field: ${field}`);
           }
         }
       }
       
       protected validateNumericField(value: any, fieldName: string): number | null {
         if (value === null || value === undefined || value === '') {
           return null;
         }
         
         const numValue = parseFloat(value);
         if (isNaN(numValue)) {
           throw new Error(`Invalid numeric value for field ${fieldName}: ${value}`);
         }
         
         return numValue;
       }
       
       protected validateDateField(value: any, fieldName: string): string | null {
         if (value === null || value === undefined || value === '') {
           return null;
         }
         
         const date = new Date(value);
         if (isNaN(date.getTime())) {
           throw new Error(`Invalid date value for field ${fieldName}: ${value}`);
         }
         
         return value;
       }
       
       abstract validate(data: any): any;
     }
     
     // lib/validators/company-overview-validator.ts
     import { BaseValidator } from './base-validator';
     
     export class CompanyOverviewValidator extends BaseValidator {
       validate(data: any): any {
         const requiredFields = [
           'Symbol', 'AssetType', 'Name', 'Description', 'CIK', 'Exchange',
           'Currency', 'Country', 'Sector', 'Industry', 'Address', 'FiscalYearEnd',
           'LatestQuarter', 'MarketCapitalization', 'EBITDA', 'PERatio', 'PEGRatio',
           'BookValue', 'DividendPerShare', 'DividendYield', 'EPS', 'RevenuePerShareTTM',
           'ProfitMargin', 'OperatingMarginTTM', 'ReturnOnAssetsTTM', 'ReturnOnEquityTTM',
           'RevenueTTM', 'GrossProfitTTM', 'DilutedEPSTTM', 'QuarterlyEarningsGrowthYOY',
           'QuarterlyRevenueGrowthYOY', 'AnalystTargetPrice', 'TrailingPE', 'ForwardPE',
           'PriceToSalesRatioTTM', 'PriceToBookRatio', 'EVToRevenue', 'EVToEBITDA',
           'Beta', '52WeekHigh', '52WeekLow', '50DayMovingAverage', '200DayMovingAverage',
           'SharesOutstanding', 'DividendDate', 'ExDividendDate'
         ];
         
         this.validateRequiredFields(data, requiredFields);
         
         return {
           symbol: data.Symbol,
           assetType: data.AssetType,
           name: data.Name,
           description: data.Description,
           cik: data.CIK,
           exchange: data.Exchange,
           currency: data.Currency,
           country: data.Country,
           sector: data.Sector,
           industry: data.Industry,
           address: data.Address,
           fiscalYearEnd: data.FiscalYearEnd,
           latestQuarter: this.validateDateField(data.LatestQuarter, 'LatestQuarter'),
           marketCapitalization: this.validateNumericField(data.MarketCapitalization, 'MarketCapitalization'),
           ebitda: this.validateNumericField(data.EBITDA, 'EBITDA'),
           peRatio: this.validateNumericField(data.PERatio, 'PERatio'),
           pegRatio: this.validateNumericField(data.PEGRatio, 'PEGRatio'),
           bookValue: this.validateNumericField(data.BookValue, 'BookValue'),
           dividendPerShare: this.validateNumericField(data.DividendPerShare, 'DividendPerShare'),
           dividendYield: this.validateNumericField(data.DividendYield, 'DividendYield'),
           eps: this.validateNumericField(data.EPS, 'EPS'),
           revenuePerShareTTM: this.validateNumericField(data.RevenuePerShareTTM, 'RevenuePerShareTTM'),
           profitMargin: this.validateNumericField(data.ProfitMargin, 'ProfitMargin'),
           operatingMarginTTM: this.validateNumericField(data.OperatingMarginTTM, 'OperatingMarginTTM'),
           returnOnAssetsTTM: this.validateNumericField(data.ReturnOnAssetsTTM, 'ReturnOnAssetsTTM'),
           returnOnEquityTTM: this.validateNumericField(data.ReturnOnEquityTTM, 'ReturnOnEquityTTM'),
           revenueTTM: this.validateNumericField(data.RevenueTTM, 'RevenueTTM'),
           grossProfitTTM: this.validateNumericField(data.GrossProfitTTM, 'GrossProfitTTM'),
           dilutedEPSTTM: this.validateNumericField(data.DilutedEPSTTM, 'DilutedEPSTTM'),
           quarterlyEarningsGrowthYOY: this.validateNumericField(data.QuarterlyEarningsGrowthYOY, 'QuarterlyEarningsGrowthYOY'),
           quarterlyRevenueGrowthYOY: this.validateNumericField(data.QuarterlyRevenueGrowthYOY, 'QuarterlyRevenueGrowthYOY'),
           analystTargetPrice: this.validateNumericField(data.AnalystTargetPrice, 'AnalystTargetPrice'),
           trailingPE: this.validateNumericField(data.TrailingPE, 'TrailingPE'),
           forwardPE: this.validateNumericField(data.ForwardPE, 'ForwardPE'),
           priceToSalesRatioTTM: this.validateNumericField(data.PriceToSalesRatioTTM, 'PriceToSalesRatioTTM'),
           priceToBookRatio: this.validateNumericField(data.PriceToBookRatio, 'PriceToBookRatio'),
           evToRevenue: this.validateNumericField(data.EVToRevenue, 'EVToRevenue'),
           evToEbitda: this.validateNumericField(data.EVToEBITDA, 'EVToEBITDA'),
           beta: this.validateNumericField(data.Beta, 'Beta'),
           weekHigh52: this.validateNumericField(data['52WeekHigh'], '52WeekHigh'),
           weekLow52: this.validateNumericField(data['52WeekLow'], '52WeekLow'),
           dayMovingAverage50: this.validateNumericField(data['50DayMovingAverage'], '50DayMovingAverage'),
           dayMovingAverage200: this.validateNumericField(data['200DayMovingAverage'], '200DayMovingAverage'),
           sharesOutstanding: this.validateNumericField(data.SharesOutstanding, 'SharesOutstanding'),
           dividendDate: this.validateDateField(data.DividendDate, 'DividendDate'),
           exDividendDate: this.validateDateField(data.ExDividendDate, 'ExDividendDate')
         };
       }
     }
     ```

  9. **Set up Caching for API Responses**
     ```typescript
     // lib/caching/alphavantage-cache.ts
     import { Redis } from 'ioredis';
     
     export class AlphaVantageCache {
       private readonly redisClient: Redis;
       private readonly defaultTTL = 86400; // 24 hours
       
       constructor() {
         this.redisClient = new Redis({
           host: process.env.REDIS_ENDPOINT,
           port: parseInt(process.env.REDIS_PORT || '6379'),
           retryDelayOnFailover: 100,
           maxRetriesPerRequest: 3
         });
       }
       
       async getCachedData(key: string): Promise<any | null> {
         try {
           const cachedData = await this.redisClient.get(key);
           return cachedData ? JSON.parse(cachedData) : null;
         } catch (error) {
           console.error('Error retrieving cached data:', error);
           return null;
         }
       }
       
       async setCachedData(key: string, data: any, ttl: number = this.defaultTTL): Promise<void> {
         try {
           await this.redisClient.setex(key, ttl, JSON.stringify(data));
         } catch (error) {
           console.error('Error setting cached data:', error);
         }
       }
       
       async invalidateCache(pattern: string): Promise<void> {
         try {
           const keys = await this.redisClient.keys(pattern);
           if (keys.length > 0) {
             await this.redisClient.del(...keys);
           }
         } catch (error) {
           console.error('Error invalidating cache:', error);
         }
       }
       
       generateCacheKey(endpoint: string, symbol: string, additionalParams: Record<string, string> = {}): string {
         const params = Object.keys(additionalParams)
           .sort()
           .map(key => `${key}:${additionalParams[key]}`)
           .join(':');
         
         return `alphavantage:${endpoint}:${symbol}:${params}`;
       }
     }
     ```

  10. **Implement Error Handling and Retry Logic**
      ```typescript
      // lib/error-handling/alphavantage-error-handler.ts
      import { CloudWatchLogsClient, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
      
      export class AlphaVantageErrorHandler {
        private readonly cloudWatchClient: CloudWatchLogsClient;
        private readonly logGroupName: string;
        private readonly logStreamName: string;
        
        constructor() {
          this.cloudWatchClient = new CloudWatchLogsClient({});
          this.logGroupName = '/aws/lambda/alphavantage-integration';
          this.logStreamName = `errors-${new Date().toISOString().split('T')[0]}`;
        }
        
        async handleApiError(error: Error, context: any): Promise<void> {
          const errorLog = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            context: {
              symbol: context.symbol,
              endpoint: context.endpoint,
              attempt: context.attempt || 1
            }
          };
          
          // Log to CloudWatch
          await this.logError(errorLog);
          
          // Determine if retry is appropriate
          if (this.shouldRetry(error, context.attempt || 1)) {
            throw new Error(`Retryable error: ${error.message}`);
          }
          
          // Non-retryable error
          throw new Error(`Non-retryable error: ${error.message}`);
        }
        
        private shouldRetry(error: Error, attempt: number): boolean {
          const maxRetries = 3;
          
          if (attempt >= maxRetries) {
            return false;
          }
          
          // Retry on rate limiting and temporary errors
          const retryableErrors = [
            'rate limit',
            'too many requests',
            'service unavailable',
            'internal server error',
            'gateway timeout'
          ];
          
          return retryableErrors.some(retryableError => 
            error.message.toLowerCase().includes(retryableError)
          );
        }
        
        private async logError(errorLog: any): Promise<void> {
          try {
            await this.cloudWatchClient.send(new PutLogEventsCommand({
              logGroupName: this.logGroupName,
              logStreamName: this.logStreamName,
              logEvents: [{
                timestamp: Date.now(),
                message: JSON.stringify(errorLog)
              }]
            }));
          } catch (logError) {
            console.error('Failed to log error to CloudWatch:', logError);
          }
        }
      }
      
      // lib/retry/alphavantage-retry.ts
      export class AlphaVantageRetry {
        private readonly maxRetries: number;
        private readonly baseDelay: number;
        
        constructor(maxRetries: number = 3, baseDelay: number = 1000) {
          this.maxRetries = maxRetries;
          this.baseDelay = baseDelay;
        }
        
        async executeWithRetry<T>(
          operation: () => Promise<T>,
          context: any = {}
        ): Promise<T> {
          let lastError: Error;
          
          for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
              return await operation();
            } catch (error) {
              lastError = error as Error;
              
              if (attempt === this.maxRetries) {
                break;
              }
              
              // Exponential backoff with jitter
              const delay = this.calculateDelay(attempt);
              await this.sleep(delay);
            }
          }
          
          throw lastError!;
        }
        
        private calculateDelay(attempt: number): number {
          const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
          const jitter = Math.random() * 0.1 * exponentialDelay;
          return exponentialDelay + jitter;
        }
        
        private sleep(ms: number): Promise<void> {
          return new Promise(resolve => setTimeout(resolve, ms));
        }
      }
      ```

  11. **Configure API Credential Retrieval from Secrets Manager**
      ```typescript
      // lib/secrets/alphavantage-secrets.ts
      import { SecretsManagerClient, GetSecretValueCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';
      
      export class AlphaVantageSecrets {
        private readonly secretsClient: SecretsManagerClient;
        private readonly secretName: string;
        
        constructor() {
          this.secretsClient = new SecretsManagerClient({});
          this.secretName = process.env.ALPHAVANTAGE_SECRET_NAME || 'signal9-alphavantage-credentials';
        }
        
        async getApiKey(): Promise<string> {
          try {
            const command = new GetSecretValueCommand({
              SecretId: this.secretName
            });
            
            const response = await this.secretsClient.send(command);
            
            if (!response.SecretString) {
              throw new Error('No secret string found in AlphaVantage credentials');
            }
            
            const credentials = JSON.parse(response.SecretString);
            
            if (!credentials.apiKey) {
              throw new Error('API key not found in AlphaVantage credentials');
            }
            
            return credentials.apiKey;
            
          } catch (error) {
            console.error('Error retrieving AlphaVantage API key:', error);
            throw new Error(`Failed to retrieve AlphaVantage API key: ${error}`);
          }
        }
        
        async updateApiKey(newApiKey: string): Promise<void> {
          try {
            const command = new UpdateSecretCommand({
              SecretId: this.secretName,
              SecretString: JSON.stringify({ apiKey: newApiKey })
            });
            
            await this.secretsClient.send(command);
            
          } catch (error) {
            console.error('Error updating AlphaVantage API key:', error);
            throw new Error(`Failed to update AlphaVantage API key: ${error}`);
          }
        }
        
        async validateApiKey(apiKey: string): Promise<boolean> {
          try {
            const response = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=${apiKey}`);
            const data = await response.json();
            
            // Check for API key validation errors
            if (data['Error Message'] || data['Note']) {
              return false;
            }
            
            return true;
            
          } catch (error) {
            console.error('Error validating AlphaVantage API key:', error);
            return false;
          }
        }
      }
      ```

- **Architecture Considerations**:
  - Strict rate limiting to stay within AlphaVantage free tier (25 calls/day)
  - Comprehensive data validation using AlphaVantage models
  - Redis caching for API responses to minimize API calls
  - Robust error handling with exponential backoff retry logic
  - Secure credential management via AWS Secrets Manager
  - Event-driven integration with existing data pipeline

- **Security Requirements**:
  - API credentials stored securely in AWS Secrets Manager
  - All API calls use HTTPS
  - Rate limiting to prevent API abuse
  - Input validation and sanitization
  - Error logging without exposing sensitive data

- **Performance Requirements**:
  - API response caching with 24-hour TTL
  - Batch processing for efficient data ingestion
  - Retry logic with exponential backoff
  - Sub-second response times for cached data
  - Efficient DynamoDB storage patterns

#### Dependencies
- **Prerequisites**:
  - Phase 1 Task 1: AWS Infrastructure Setup (completed)
  - Phase 1 Task 2: Data Pipeline Architecture (completed)
  - AlphaVantage API credentials in AWS Secrets Manager
  - DynamoDB tables for financial data storage
  - ElastiCache Redis for caching
- **Dependent Tickets**:
  - Phase 1 Task 5: Event-Driven Processing Implementation
  - Phase 1 Task 6: Data Quality and Validation

#### Testing Requirements
- **Unit Tests**:
  - AlphaVantage API client unit tests
  - Data validation tests for all endpoints
  - Rate limiting logic tests
  - Caching mechanism tests
  - Error handling and retry logic tests

- **Integration Tests**:
  - End-to-end API integration tests
  - Secrets Manager integration tests
  - DynamoDB storage integration tests
  - Redis caching integration tests
  - EventBridge integration tests

- **Performance Tests**:
  - API response time tests
  - Rate limiting compliance tests
  - Caching performance tests
  - Batch processing performance tests
  - Error recovery performance tests

- **Security Tests**:
  - API credential security tests
  - Input validation security tests
  - Error message security tests
  - Rate limiting security tests

#### Acceptance Criteria
- [ ] AlphaVantage API client implemented with rate limiting
- [ ] All 6 endpoints (Company Overview, Earnings, Cash Flow, Balance Sheet, Income Statement, News Sentiment) implemented
- [ ] Data validation using AlphaVantage models for all endpoints
- [ ] Redis caching implemented with 24-hour TTL
- [ ] Error handling and retry logic with exponential backoff
- [ ] API credentials retrieved securely from Secrets Manager
- [ ] Rate limiting strictly enforced (25 calls/day limit)
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
- **Cache Failures**: Graceful degradation to direct API calls

#### Monitoring and Observability
- **Metrics to Track**:
  - API call success/failure rates
  - Rate limiting compliance
  - Cache hit/miss ratios
  - Data validation success rates
  - API response times
  - Daily API call count

- **Logging Requirements**:
  - Structured logging for all API calls
  - Error logging with context
  - Rate limiting event logging
  - Data validation result logging
  - Performance metrics logging

- **Alerting Criteria**:
  - API failure rate >10%
  - Rate limit exceeded
  - Data validation failure rate >5%
  - Cache miss rate >20%
  - API response time >5 seconds

#### Open Questions
- None - all technical decisions have been made and documented

#### Notes
- Strict adherence to AlphaVantage free tier limits (25 calls/day)
- Comprehensive caching strategy to minimize API calls
- Robust error handling for production reliability
- Data validation ensures data quality and consistency
- Event-driven integration supports scalable processing
- Monitor API usage closely to stay within free tier limits
- Consider implementing API call batching for efficiency
- Plan for potential upgrade to paid tier if needed 
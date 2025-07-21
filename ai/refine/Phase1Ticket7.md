# Ticket 1.7: Monitoring and Observability

**Status**: Refinement Complete

#### Description
Implement comprehensive monitoring and observability framework for Signal9 Advisor using AWS CloudWatch, including custom metrics for data processing, operational dashboards, alerting for critical failures, API performance monitoring, data quality monitoring, cost monitoring, log aggregation, X-Ray tracing, and Step Functions monitoring. This ensures >99.5% system uptime, <30 second data processing latency, and complete operational visibility.

#### Technical Details
- **Implementation Steps**:
  1. **Set up CloudWatch Custom Metrics Infrastructure**
     ```typescript
     // lib/monitoring/metrics-manager.ts
     import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
     import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
     import { DynamoDBClient } from '@aws-cdk-lib/aws-dynamodb';
     
     export class MetricsManager {
       private readonly cloudWatchClient: CloudWatchClient;
       private readonly dynamoClient: DynamoDBDocumentClient;
       private readonly namespace: string = 'Signal9/Advisor';
       
       constructor() {
         this.cloudWatchClient = new CloudWatchClient({});
         this.dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
       }
       
       async recordDataProcessingMetric(
         operation: string,
         assetId: string,
         duration: number,
         success: boolean,
         errorCount: number = 0
       ): Promise<void> {
         const timestamp = new Date();
         const dimensions = [
           { Name: 'Operation', Value: operation },
           { Name: 'AssetId', Value: assetId }
         ];
         
         await this.cloudWatchClient.send(new PutMetricDataCommand({
           Namespace: this.namespace,
           MetricData: [
             {
               MetricName: 'ProcessingDuration',
               Dimensions,
               Value: duration,
               Unit: 'Milliseconds',
               Timestamp: timestamp
             },
             {
               MetricName: 'ProcessingSuccess',
               Dimensions,
               Value: success ? 1 : 0,
               Unit: 'Count',
               Timestamp: timestamp
             },
             {
               MetricName: 'ProcessingErrors',
               Dimensions,
               Value: errorCount,
               Unit: 'Count',
               Timestamp: timestamp
             }
           ]
         }));
       }
       
       async recordAPIMetric(
         apiName: string,
         endpoint: string,
         responseTime: number,
         success: boolean,
         rateLimitRemaining?: number
       ): Promise<void> {
         const timestamp = new Date();
         const dimensions = [
           { Name: 'APIName', Value: apiName },
           { Name: 'Endpoint', Value: endpoint }
         ];
         
         const metricData = [
           {
             MetricName: 'APIResponseTime',
             Dimensions,
             Value: responseTime,
             Unit: 'Milliseconds',
             Timestamp: timestamp
           },
           {
             MetricName: 'APISuccess',
             Dimensions,
             Value: success ? 1 : 0,
             Unit: 'Count',
             Timestamp: timestamp
           }
         ];
         
         if (rateLimitRemaining !== undefined) {
           metricData.push({
             MetricName: 'APIRateLimitRemaining',
             Dimensions,
             Value: rateLimitRemaining,
             Unit: 'Count',
             Timestamp: timestamp
           });
         }
         
         await this.cloudWatchClient.send(new PutMetricDataCommand({
           Namespace: this.namespace,
           MetricData
         }));
       }
       
       async recordBatchProcessingMetric(
         batchSize: number,
         successCount: number,
         failureCount: number,
         totalDuration: number
       ): Promise<void> {
         const timestamp = new Date();
         const successRate = batchSize > 0 ? successCount / batchSize : 0;
         
         await this.cloudWatchClient.send(new PutMetricDataCommand({
           Namespace: this.namespace,
           MetricData: [
             {
               MetricName: 'BatchSize',
               Value: batchSize,
               Unit: 'Count',
               Timestamp: timestamp
             },
             {
               MetricName: 'BatchSuccessRate',
               Value: successRate,
               Unit: 'Percent',
               Timestamp: timestamp
             },
             {
               MetricName: 'BatchDuration',
               Value: totalDuration,
               Unit: 'Milliseconds',
               Timestamp: timestamp
             },
             {
               MetricName: 'BatchFailures',
               Value: failureCount,
               Unit: 'Count',
               Timestamp: timestamp
             }
           ]
         }));
       }
       
       async recordDataQualityMetric(
         dataType: string,
         validationSuccess: boolean,
         completenessScore: number,
         consistencyScore: number
       ): Promise<void> {
         const timestamp = new Date();
         
         await this.cloudWatchClient.send(new PutMetricDataCommand({
           Namespace: this.namespace,
           MetricData: [
             {
               MetricName: 'DataQualityValidation',
               Dimensions: [{ Name: 'DataType', Value: dataType }],
               Value: validationSuccess ? 1 : 0,
               Unit: 'Count',
               Timestamp: timestamp
             },
             {
               MetricName: 'DataCompleteness',
               Dimensions: [{ Name: 'DataType', Value: dataType }],
               Value: completenessScore,
               Unit: 'Percent',
               Timestamp: timestamp
             },
             {
               MetricName: 'DataConsistency',
               Dimensions: [{ Name: 'DataType', Value: dataType }],
               Value: consistencyScore,
               Unit: 'Percent',
               Timestamp: timestamp
             }
           ]
         }));
       }
       
       async recordCostMetric(
         service: string,
         cost: number,
         operation: string
       ): Promise<void> {
         const timestamp = new Date();
         
         await this.cloudWatchClient.send(new PutMetricDataCommand({
           Namespace: this.namespace,
           MetricData: [{
             MetricName: 'ServiceCost',
             Dimensions: [
               { Name: 'Service', Value: service },
               { Name: 'Operation', Value: operation }
             ],
             Value: cost,
             Unit: 'None',
             Timestamp: timestamp
           }]
         }));
       }
     }
     ```

  2. **Create Comprehensive Monitoring Dashboards**
     ```typescript
     // lib/monitoring/dashboard-manager.ts
     import { CloudWatchClient, PutDashboardCommand } from '@aws-sdk/client-cloudwatch';
     
     export class DashboardManager {
       private readonly cloudWatchClient: CloudWatchClient;
       
       constructor() {
         this.cloudWatchClient = new CloudWatchClient({});
       }
       
       async createOperationalDashboard(): Promise<void> {
         const dashboardBody = {
           widgets: [
             // System Health Overview
             {
               type: 'metric',
               x: 0,
               y: 0,
               width: 12,
               height: 6,
               properties: {
                 metrics: [
                   ['Signal9/Advisor', 'ProcessingSuccess', { stat: 'Sum', period: 300 }],
                   ['.', 'ProcessingErrors', { stat: 'Sum', period: 300 }]
                 ],
                 view: 'timeSeries',
                 stacked: false,
                 region: process.env.AWS_REGION,
                 title: 'Data Processing Success Rate',
                 period: 300
               }
             },
             // API Performance
             {
               type: 'metric',
               x: 12,
               y: 0,
               width: 12,
               height: 6,
               properties: {
                 metrics: [
                   ['Signal9/Advisor', 'APIResponseTime', { stat: 'Average', period: 300 }],
                   ['.', 'APISuccess', { stat: 'Sum', period: 300 }]
                 ],
                 view: 'timeSeries',
                 stacked: false,
                 region: process.env.AWS_REGION,
                 title: 'API Performance',
                 period: 300
               }
             },
             // Batch Processing
             {
               type: 'metric',
               x: 0,
               y: 6,
               width: 12,
               height: 6,
               properties: {
                 metrics: [
                   ['Signal9/Advisor', 'BatchSuccessRate', { stat: 'Average', period: 300 }],
                   ['.', 'BatchDuration', { stat: 'Average', period: 300 }]
                 ],
                 view: 'timeSeries',
                 stacked: false,
                 region: process.env.AWS_REGION,
                 title: 'Batch Processing Performance',
                 period: 300
               }
             },
             // Data Quality
             {
               type: 'metric',
               x: 12,
               y: 6,
               width: 12,
               height: 6,
               properties: {
                 metrics: [
                   ['Signal9/Advisor', 'DataCompleteness', { stat: 'Average', period: 300 }],
                   ['.', 'DataConsistency', { stat: 'Average', period: 300 }]
                 ],
                 view: 'timeSeries',
                 stacked: false,
                 region: process.env.AWS_REGION,
                 title: 'Data Quality Metrics',
                 period: 300
               }
             },
             // Cost Monitoring
             {
               type: 'metric',
               x: 0,
               y: 12,
               width: 24,
               height: 6,
               properties: {
                 metrics: [
                   ['Signal9/Advisor', 'ServiceCost', { stat: 'Sum', period: 3600 }]
                 ],
                 view: 'timeSeries',
                 stacked: false,
                 region: process.env.AWS_REGION,
                 title: 'Service Costs',
                 period: 3600
               }
             }
           ]
         };
         
         await this.cloudWatchClient.send(new PutDashboardCommand({
           DashboardName: 'Signal9-Advisor-Operational',
           DashboardBody: JSON.stringify(dashboardBody)
         }));
       }
       
       async createAPIDashboard(): Promise<void> {
         const dashboardBody = {
           widgets: [
             // AlphaVantage API Metrics
             {
               type: 'metric',
               x: 0,
               y: 0,
               width: 12,
               height: 6,
               properties: {
                 metrics: [
                   ['Signal9/Advisor', 'APIResponseTime', 'APIName', 'AlphaVantage', { stat: 'Average', period: 300 }],
                   ['.', 'APIRateLimitRemaining', 'APIName', 'AlphaVantage', { stat: 'Minimum', period: 300 }]
                 ],
                 view: 'timeSeries',
                 stacked: false,
                 region: process.env.AWS_REGION,
                 title: 'AlphaVantage API Performance',
                 period: 300
               }
             },
             // Alpaca API Metrics
             {
               type: 'metric',
               x: 12,
               y: 0,
               width: 12,
               height: 6,
               properties: {
                 metrics: [
                   ['Signal9/Advisor', 'APIResponseTime', 'APIName', 'Alpaca', { stat: 'Average', period: 300 }],
                   ['.', 'APIRateLimitRemaining', 'APIName', 'Alpaca', { stat: 'Minimum', period: 300 }]
                 ],
                 view: 'timeSeries',
                 stacked: false,
                 region: process.env.AWS_REGION,
                 title: 'Alpaca API Performance',
                 period: 300
               }
             }
           ]
         };
         
         await this.cloudWatchClient.send(new PutDashboardCommand({
           DashboardName: 'Signal9-Advisor-API',
           DashboardBody: JSON.stringify(dashboardBody)
         }));
       }
       
       async createDataQualityDashboard(): Promise<void> {
         const dashboardBody = {
           widgets: [
             // Data Quality Overview
             {
               type: 'metric',
               x: 0,
               y: 0,
               width: 24,
               height: 6,
               properties: {
                 metrics: [
                   ['Signal9/Advisor', 'DataQualityValidation', { stat: 'Sum', period: 300 }],
                   ['.', 'DataCompleteness', { stat: 'Average', period: 300 }],
                   ['.', 'DataConsistency', { stat: 'Average', period: 300 }]
                 ],
                 view: 'timeSeries',
                 stacked: false,
                 region: process.env.AWS_REGION,
                 title: 'Data Quality Overview',
                 period: 300
               }
             }
           ]
         };
         
         await this.cloudWatchClient.send(new PutDashboardCommand({
           DashboardName: 'Signal9-Advisor-DataQuality',
           DashboardBody: JSON.stringify(dashboardBody)
         }));
       }
     }
     ```

  3. **Implement Alerting for Critical Failures**
     ```typescript
     // lib/monitoring/alert-manager.ts
     import { CloudWatchClient, PutMetricAlarmCommand, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';
     import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
     
     export class AlertManager {
       private readonly cloudWatchClient: CloudWatchClient;
       private readonly snsClient: SNSClient;
       
       constructor() {
         this.cloudWatchClient = new CloudWatchClient({});
         this.snsClient = new SNSClient({});
       }
       
       async createCriticalAlarms(): Promise<void> {
         const alarms = [
           // System Health Alarms
           {
             AlarmName: 'Signal9-ProcessingFailureRate',
             MetricName: 'ProcessingSuccess',
             Namespace: 'Signal9/Advisor',
             Statistic: 'Sum',
             Period: 300,
             EvaluationPeriods: 2,
             Threshold: 0.9, // 90% success rate
             ComparisonOperator: 'LessThanThreshold',
             AlarmDescription: 'Data processing success rate below 90%',
             AlarmActions: [process.env.CRITICAL_ALERT_TOPIC_ARN!]
           },
           {
             AlarmName: 'Signal9-ProcessingLatency',
             MetricName: 'ProcessingDuration',
             Namespace: 'Signal9/Advisor',
             Statistic: 'Average',
             Period: 300,
             EvaluationPeriods: 2,
             Threshold: 30000, // 30 seconds
             ComparisonOperator: 'GreaterThanThreshold',
             AlarmDescription: 'Data processing latency exceeds 30 seconds',
             AlarmActions: [process.env.CRITICAL_ALERT_TOPIC_ARN!]
           },
           // API Alarms
           {
             AlarmName: 'Signal9-APIFailureRate',
             MetricName: 'APISuccess',
             Namespace: 'Signal9/Advisor',
             Statistic: 'Sum',
             Period: 300,
             EvaluationPeriods: 2,
             Threshold: 0.95, // 95% success rate
             ComparisonOperator: 'LessThanThreshold',
             AlarmDescription: 'API success rate below 95%',
             AlarmActions: [process.env.CRITICAL_ALERT_TOPIC_ARN!]
           },
           {
             AlarmName: 'Signal9-APIRateLimit',
             MetricName: 'APIRateLimitRemaining',
             Namespace: 'Signal9/Advisor',
             Statistic: 'Minimum',
             Period: 300,
             EvaluationPeriods: 1,
             Threshold: 5, // 5 calls remaining
             ComparisonOperator: 'LessThanThreshold',
             AlarmDescription: 'API rate limit nearly exceeded',
             AlarmActions: [process.env.WARNING_ALERT_TOPIC_ARN!]
           },
           // Data Quality Alarms
           {
             AlarmName: 'Signal9-DataQualityFailure',
             MetricName: 'DataQualityValidation',
             Namespace: 'Signal9/Advisor',
             Statistic: 'Sum',
             Period: 300,
             EvaluationPeriods: 2,
             Threshold: 0.95, // 95% validation success
             ComparisonOperator: 'LessThanThreshold',
             AlarmDescription: 'Data quality validation below 95%',
             AlarmActions: [process.env.CRITICAL_ALERT_TOPIC_ARN!]
           },
           // Cost Alarms
           {
             AlarmName: 'Signal9-DailyCostExceeded',
             MetricName: 'ServiceCost',
             Namespace: 'Signal9/Advisor',
             Statistic: 'Sum',
             Period: 86400, // 24 hours
             EvaluationPeriods: 1,
             Threshold: 50, // $50 daily limit
             ComparisonOperator: 'GreaterThanThreshold',
             AlarmDescription: 'Daily cost exceeded $50',
             AlarmActions: [process.env.COST_ALERT_TOPIC_ARN!]
           }
         ];
         
         for (const alarm of alarms) {
           await this.cloudWatchClient.send(new PutMetricAlarmCommand(alarm));
         }
       }
       
       async sendAlert(
         severity: 'critical' | 'warning' | 'info',
         title: string,
         message: string,
         context?: Record<string, any>
       ): Promise<void> {
         const topicArn = this.getTopicArn(severity);
         
         const alertMessage = {
           severity,
           title,
           message,
           context,
           timestamp: new Date().toISOString(),
           environment: process.env.ENVIRONMENT || 'development'
         };
         
         await this.snsClient.send(new PublishCommand({
           TopicArn: topicArn,
           Subject: `[${severity.toUpperCase()}] ${title}`,
           Message: JSON.stringify(alertMessage, null, 2)
         }));
       }
       
       private getTopicArn(severity: string): string {
         switch (severity) {
           case 'critical':
             return process.env.CRITICAL_ALERT_TOPIC_ARN!;
           case 'warning':
             return process.env.WARNING_ALERT_TOPIC_ARN!;
           case 'info':
             return process.env.INFO_ALERT_TOPIC_ARN!;
           default:
             return process.env.WARNING_ALERT_TOPIC_ARN!;
         }
       }
     }
     ```

  4. **Set up API Performance Monitoring**
     ```typescript
     // lib/monitoring/api-monitor.ts
     import { MetricsManager } from './metrics-manager';
     import { AlertManager } from './alert-manager';
     
     export class APIMonitor {
       private readonly metricsManager: MetricsManager;
       private readonly alertManager: AlertManager;
       
       constructor() {
         this.metricsManager = new MetricsManager();
         this.alertManager = new AlertManager();
       }
       
       async monitorAPIRequest(
         apiName: string,
         endpoint: string,
         requestFn: () => Promise<any>
       ): Promise<any> {
         const startTime = Date.now();
         let success = false;
         let rateLimitRemaining: number | undefined;
         
         try {
           const result = await requestFn();
           success = true;
           
           // Extract rate limit info if available
           if (result.headers && result.headers['x-ratelimit-remaining']) {
             rateLimitRemaining = parseInt(result.headers['x-ratelimit-remaining']);
           }
           
           return result;
         } catch (error) {
           success = false;
           
           // Handle rate limiting specifically
           if (error.status === 429) {
             await this.alertManager.sendAlert('warning', 'API Rate Limit Exceeded', 
               `${apiName} rate limit exceeded for endpoint: ${endpoint}`);
           }
           
           throw error;
         } finally {
           const duration = Date.now() - startTime;
           
           await this.metricsManager.recordAPIMetric(
             apiName,
             endpoint,
             duration,
             success,
             rateLimitRemaining
           );
           
           // Alert on slow responses
           if (duration > 5000) { // 5 seconds
             await this.alertManager.sendAlert('warning', 'Slow API Response',
               `${apiName} endpoint ${endpoint} took ${duration}ms to respond`);
           }
         }
       }
       
       async monitorAlphaVantageRequest(endpoint: string, requestFn: () => Promise<any>): Promise<any> {
         return this.monitorAPIRequest('AlphaVantage', endpoint, requestFn);
       }
       
       async monitorAlpacaRequest(endpoint: string, requestFn: () => Promise<any>): Promise<any> {
         return this.monitorAPIRequest('Alpaca', endpoint, requestFn);
       }
     }
     ```

  5. **Create Data Quality Monitoring**
     ```typescript
     // lib/monitoring/data-quality-monitor.ts
     import { MetricsManager } from './metrics-manager';
     import { AlertManager } from './alert-manager';
     import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
     import { DynamoDBClient } from '@aws-cdk-lib/aws-dynamodb';
     
     export class DataQualityMonitor {
       private readonly metricsManager: MetricsManager;
       private readonly alertManager: AlertManager;
       private readonly dynamoClient: DynamoDBDocumentClient;
       
       constructor() {
         this.metricsManager = new MetricsManager();
         this.alertManager = new AlertManager();
         this.dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
       }
       
       async monitorDataQuality(dataType: string, validationResult: any): Promise<void> {
         const { isValid, completenessScore, consistencyScore } = validationResult;
         
         await this.metricsManager.recordDataQualityMetric(
           dataType,
           isValid,
           completenessScore || 0,
           consistencyScore || 0
         );
         
         // Alert on quality issues
         if (!isValid) {
           await this.alertManager.sendAlert('critical', 'Data Quality Issue',
             `Data quality validation failed for ${dataType}`, { validationResult });
         }
         
         if (completenessScore < 0.8) {
           await this.alertManager.sendAlert('warning', 'Data Completeness Issue',
             `Data completeness below 80% for ${dataType}`, { completenessScore });
         }
         
         if (consistencyScore < 0.9) {
           await this.alertManager.sendAlert('warning', 'Data Consistency Issue',
             `Data consistency below 90% for ${dataType}`, { consistencyScore });
         }
       }
       
       async checkDataFreshness(): Promise<void> {
         const dataTypes = ['company_overview', 'earnings', 'cash_flow', 'balance_sheet', 'income_statement'];
         
         for (const dataType of dataTypes) {
           const freshness = await this.getDataFreshness(dataType);
           
           if (freshness > 24 * 60 * 60 * 1000) { // 24 hours
             await this.alertManager.sendAlert('warning', 'Data Freshness Issue',
               `${dataType} data is older than 24 hours`, { freshness });
           }
         }
       }
       
       private async getDataFreshness(dataType: string): Promise<number> {
         // Implementation to check data freshness
         return 0; // Placeholder
       }
     }
     ```

  6. **Implement Cost Monitoring and Alerting**
     ```typescript
     // lib/monitoring/cost-monitor.ts
     import { MetricsManager } from './metrics-manager';
     import { AlertManager } from './alert-manager';
     import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
     
     export class CostMonitor {
       private readonly metricsManager: MetricsManager;
       private readonly alertManager: AlertManager;
       private readonly costExplorerClient: CostExplorerClient;
       
       constructor() {
         this.metricsManager = new MetricsManager();
         this.alertManager = new AlertManager();
         this.costExplorerClient = new CostExplorerClient({});
       }
       
       async monitorDailyCosts(): Promise<void> {
         const today = new Date();
         const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
         const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
         
         const response = await this.costExplorerClient.send(new GetCostAndUsageCommand({
           TimePeriod: {
             Start: startDate.toISOString().split('T')[0],
             End: endDate.toISOString().split('T')[0]
           },
           Granularity: 'DAILY',
           Metrics: ['UnblendedCost'],
           GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }]
         }));
         
         let totalCost = 0;
         
         for (const result of response.ResultsByTime || []) {
           for (const group of result.Groups || []) {
             const service = group.Keys?.[0] || 'Unknown';
             const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
             
             totalCost += cost;
             
             await this.metricsManager.recordCostMetric(service, cost, 'daily');
           }
         }
         
         // Alert if daily cost exceeds threshold
         if (totalCost > 50) { // $50 daily limit
           await this.alertManager.sendAlert('critical', 'Daily Cost Exceeded',
             `Daily cost of $${totalCost.toFixed(2)} exceeds $50 limit`, { totalCost });
         }
       }
       
       async monitorAPICosts(): Promise<void> {
         // Monitor AlphaVantage API costs (free tier)
         // Monitor Alpaca API costs
         // Implementation for API-specific cost monitoring
       }
     }
     ```

  7. **Set up Log Aggregation and Analysis**
     ```typescript
     // lib/monitoring/log-manager.ts
     import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogGroupCommand } from '@aws-sdk/client-cloudwatch-logs';
     import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
     import { DynamoDBClient } from '@aws-cdk-lib/aws-dynamodb';
     
     export class LogManager {
       private readonly cloudWatchLogsClient: CloudWatchLogsClient;
       private readonly dynamoClient: DynamoDBDocumentClient;
       private readonly logGroupName: string = '/aws/lambda/signal9-advisor';
       
       constructor() {
         this.cloudWatchLogsClient = new CloudWatchLogsClient({});
         this.dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
       }
       
       async logStructuredEvent(
         level: 'info' | 'warn' | 'error' | 'debug',
         message: string,
         context: Record<string, any> = {}
       ): Promise<void> {
         const logEvent = {
           timestamp: new Date().toISOString(),
           level,
           message,
           context,
           requestId: context.requestId || 'unknown',
           functionName: context.functionName || 'unknown'
         };
         
         // Send to CloudWatch Logs
         await this.cloudWatchLogsClient.send(new PutLogEventsCommand({
           logGroupName: this.logGroupName,
           logStreamName: `${new Date().toISOString().split('T')[0]}`,
           logEvents: [{
             timestamp: Date.now(),
             message: JSON.stringify(logEvent)
           }]
         }));
         
         // Store in DynamoDB for analysis
         await this.dynamoClient.send(new PutCommand({
           TableName: process.env.LOGS_TABLE_NAME,
           Item: {
             log_id: `LOG#${Date.now()}#${Math.random().toString(36).substr(2, 9)}`,
             level,
             message,
             context: JSON.stringify(context),
             timestamp: logEvent.timestamp,
             request_id: logEvent.requestId,
             function_name: logEvent.functionName
           }
         }));
       }
       
       async analyzeErrorPatterns(): Promise<void> {
         // Implementation for error pattern analysis
         // Query logs for common error patterns
         // Generate reports for error trends
       }
     }
     ```

  8. **Configure CloudWatch X-Ray for Tracing**
     ```typescript
     // lib/monitoring/tracing-manager.ts
     import { captureAWSv3Client } from 'aws-xray-sdk-core';
     import { DynamoDBClient } from '@aws-cdk-lib/aws-dynamodb';
     import { SQSClient } from '@aws-sdk/client-sqs';
     import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
     
     export class TracingManager {
       static setupTracing(): void {
         // Capture AWS SDK v3 clients
         captureAWSv3Client(new DynamoDBClient({}));
         captureAWSv3Client(new SQSClient({}));
         captureAWSv3Client(new EventBridgeClient({}));
       }
       
       static createSubsegment(name: string, fn: () => Promise<any>): Promise<any> {
         return new Promise((resolve, reject) => {
           const segment = process.env._X_AMZN_TRACE_ID ? 
             require('aws-xray-sdk-core').getSegment() : null;
           
           if (segment) {
             const subsegment = segment.addNewSubsegment(name);
             
             fn()
               .then(result => {
                 subsegment.close();
                 resolve(result);
               })
               .catch(error => {
                 subsegment.addError(error);
                 subsegment.close();
                 reject(error);
               });
           } else {
             fn().then(resolve).catch(reject);
           }
         });
       }
     }
     ```

  9. **Monitor Step Functions Execution and Performance**
     ```typescript
     // lib/monitoring/step-functions-monitor.ts
     import { SFNClient, ListExecutionsCommand, DescribeExecutionCommand } from '@aws-sdk/client-sfn';
     import { MetricsManager } from './metrics-manager';
     import { AlertManager } from './alert-manager';
     
     export class StepFunctionsMonitor {
       private readonly sfnClient: SFNClient;
       private readonly metricsManager: MetricsManager;
       private readonly alertManager: AlertManager;
       
       constructor() {
         this.sfnClient = new SFNClient({});
         this.metricsManager = new MetricsManager();
         this.alertManager = new AlertManager();
       }
       
       async monitorWorkflowExecution(
         stateMachineArn: string,
         executionArn: string
       ): Promise<void> {
         const execution = await this.sfnClient.send(new DescribeExecutionCommand({
           executionArn
         }));
         
         const duration = execution.startDate && execution.stopDate ?
           execution.stopDate.getTime() - execution.startDate.getTime() : 0;
         
         const success = execution.status === 'SUCCEEDED';
         
         await this.metricsManager.recordDataProcessingMetric(
           'step_functions',
           execution.name || 'unknown',
           duration,
           success
         );
         
         if (!success && execution.status === 'FAILED') {
           await this.alertManager.sendAlert('critical', 'Step Functions Execution Failed',
             `Workflow execution failed: ${execution.name}`, {
               executionArn,
               status: execution.status,
               error: execution.cause
             });
         }
         
         if (duration > 300000) { // 5 minutes
           await this.alertManager.sendAlert('warning', 'Slow Step Functions Execution',
             `Workflow execution took ${duration}ms`, {
               executionArn,
               duration
             });
         }
       }
       
       async getWorkflowMetrics(stateMachineArn: string): Promise<any> {
         const executions = await this.sfnClient.send(new ListExecutionsCommand({
           stateMachineArn,
           maxResults: 100
         }));
         
         let successCount = 0;
         let failureCount = 0;
         let totalDuration = 0;
         
         for (const execution of executions.executions || []) {
           if (execution.status === 'SUCCEEDED') {
             successCount++;
           } else if (execution.status === 'FAILED') {
             failureCount++;
           }
           
           if (execution.startDate && execution.stopDate) {
             totalDuration += execution.stopDate.getTime() - execution.startDate.getTime();
           }
         }
         
         return {
           total: executions.executions?.length || 0,
           success: successCount,
           failure: failureCount,
           averageDuration: totalDuration / (executions.executions?.length || 1)
         };
       }
     }
     ```

- **Architecture Considerations**:
  - Comprehensive CloudWatch integration for all metrics
  - Real-time alerting with SNS notifications
  - X-Ray tracing for distributed tracing
  - Structured logging for analysis
  - Cost monitoring and optimization
  - Performance monitoring and optimization

- **Security Requirements**:
  - Secure metric collection and storage
  - Encrypted log storage and transmission
  - Proper IAM roles for monitoring services
  - Secure alerting without sensitive data exposure
  - Access controls for monitoring dashboards

- **Performance Requirements**:
  - Sub-second metric collection
  - Real-time alerting (<1 minute)
  - Efficient log aggregation and analysis
  - Minimal impact on application performance
  - Scalable monitoring architecture

#### Dependencies
- **Prerequisites**:
  - Phase 1 Task 1: AWS Infrastructure Setup (completed)
  - Phase 1 Task 2: Data Pipeline Architecture (completed)
  - Phase 1 Task 3: AlphaVantage API Integration (completed)
  - Phase 1 Task 4: Alpaca API Integration (completed)
  - Phase 1 Task 5: Event-Driven Processing Implementation (completed)
  - Phase 1 Task 6: Data Quality and Validation (completed)
  - CloudWatch, SNS, and X-Ray services configured
- **Dependent Tickets**:
  - Phase 1 Task 8: Testing and Validation Framework

#### Testing Requirements
- **Unit Tests**:
  - Metrics collection tests
  - Dashboard creation tests
  - Alerting logic tests
  - API monitoring tests
  - Data quality monitoring tests
  - Cost monitoring tests
  - Log aggregation tests
  - X-Ray tracing tests
  - Step Functions monitoring tests

- **Integration Tests**:
  - End-to-end monitoring pipeline tests
  - Alert delivery tests
  - Dashboard functionality tests
  - Metric aggregation tests
  - Log analysis tests
  - Cost tracking tests

- **Performance Tests**:
  - Monitoring overhead tests
  - Alert response time tests
  - Dashboard load time tests
  - Metric collection performance tests

- **Security Tests**:
  - Metric data security tests
  - Log data protection tests
  - Alert message security tests
  - Access control validation tests

#### Acceptance Criteria
- [ ] CloudWatch custom metrics infrastructure implemented
- [ ] Comprehensive monitoring dashboards created
- [ ] Critical failure alerting implemented
- [ ] API performance monitoring configured
- [ ] Data quality monitoring implemented
- [ ] Cost monitoring and alerting configured
- [ ] Log aggregation and analysis set up
- [ ] CloudWatch X-Ray tracing configured
- [ ] Step Functions execution monitoring implemented
- [ ] All monitoring components integrated
- [ ] Alerting thresholds configured and tested
- [ ] Dashboard access controls configured
- [ ] All unit tests pass with >90% coverage
- [ ] Integration tests pass successfully
- [ ] Performance benchmarks met
- [ ] Security requirements validated
- [ ] Code review completed
- [ ] Documentation updated

#### Error Handling
- **Monitoring Failures**: Graceful degradation and fallback mechanisms
- **Alert Delivery Failures**: Retry logic and alternative notification methods
- **Metric Collection Failures**: Buffering and retry mechanisms
- **Dashboard Failures**: Alternative monitoring views
- **Log Aggregation Failures**: Local logging with sync mechanisms
- **Tracing Failures**: Fallback to basic logging

#### Monitoring and Observability
- **Metrics to Track**:
  - System uptime and availability
  - Data processing success rates and latency
  - API performance and rate limiting
  - Data quality validation results
  - Cost tracking and optimization
  - Error rates and patterns
  - Step Functions execution performance

- **Logging Requirements**:
  - Structured application logs
  - Error logs with context
  - Performance logs for optimization
  - Security logs for compliance
  - Audit logs for data access

- **Alerting Criteria**:
  - System uptime <99.5%
  - Data processing latency >30 seconds
  - API success rate <95%
  - Data quality validation <95%
  - Daily cost >$50
  - Error rate >5%
  - Step Functions failure rate >10%

#### Open Questions
- None - all technical decisions have been made and documented

#### Notes
- Implement monitoring data retention policies
- Consider implementing custom CloudWatch insights queries
- Plan for monitoring data archival and cleanup
- Monitor monitoring system performance impact
- Implement monitoring dashboard access controls
- Consider implementing monitoring data export for external analysis 
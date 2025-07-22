import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DatabaseConstruct extends Construct {
  public readonly assetsTable: dynamodb.Table;
  public readonly earningsCalendarTable: dynamodb.Table;
  public readonly analysisQueueTable: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Assets table with GSI for symbol lookups
    this.assetsTable = new dynamodb.Table(this, 'AssetsTable', {
      tableName: `${cdk.Stack.of(this).node.tryGetContext('environment') || 'dev'}-signal9-assets`,
      partitionKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl'
    });
    
    // Add GSI for symbol lookups
    this.assetsTable.addGlobalSecondaryIndex({
      indexName: 'SymbolIndex',
      partitionKey: { name: 'symbol', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING }
    });

    // Earnings Calendar table with date-based access patterns
    this.earningsCalendarTable = new dynamodb.Table(this, 'EarningsCalendarTable', {
      tableName: `${cdk.Stack.of(this).node.tryGetContext('environment') || 'dev'}-signal9-earnings-calendar`,
      partitionKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'symbol', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl'
    });

    // Add GSI for symbol-based queries
    this.earningsCalendarTable.addGlobalSecondaryIndex({
      indexName: 'SymbolDateIndex',
      partitionKey: { name: 'symbol', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING }
    });

    // Analysis Queue table with status tracking capabilities
    this.analysisQueueTable = new dynamodb.Table(this, 'AnalysisQueueTable', {
      tableName: `${cdk.Stack.of(this).node.tryGetContext('environment') || 'dev'}-signal9-analysis-queue`,
      partitionKey: { name: 'queue_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl'
    });

    // Add GSI for status-based queries
    this.analysisQueueTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING }
    });

    // Add GSI for symbol-based queries
    this.analysisQueueTable.addGlobalSecondaryIndex({
      indexName: 'SymbolIndex',
      partitionKey: { name: 'symbol', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING }
    });

    // Configure auto-scaling for all tables (for on-demand billing, this is handled automatically)
    // But we can still configure read/write capacity if needed for provisioned billing
    this.configureAutoScaling();
  }

  private configureAutoScaling(): void {
    // For on-demand billing, DynamoDB automatically scales
    // This method is included for future reference if switching to provisioned billing
    
    // Example auto-scaling configuration for provisioned billing:
    /*
    this.assetsTable.autoScaleReadCapacity({
      minCapacity: 1,
      maxCapacity: 10
    }).scaleOnUtilization({
      targetUtilizationPercent: 70
    });

    this.assetsTable.autoScaleWriteCapacity({
      minCapacity: 1,
      maxCapacity: 10
    }).scaleOnUtilization({
      targetUtilizationPercent: 70
    });
    */
  }
} 
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface DynamoDbConstructProps {
  config: EnvironmentConfig;
}

export class DynamoDbConstruct extends Construct {
  public readonly usersTable: dynamodb.Table;
  public readonly assetsTable: dynamodb.Table;
  public readonly financialsTable: dynamodb.Table;
  public readonly newsTable: dynamodb.Table;
  public readonly timeSeriesTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamoDbConstructProps) {
    super(scope, id);

    const { config } = props;

    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `Signal9-Users-${config.stage}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    this.assetsTable = new dynamodb.Table(this, 'AssetsTable', {
      tableName: `Signal9-Assets-${config.stage}`,
      partitionKey: { name: 'symbol', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    this.assetsTable.addGlobalSecondaryIndex({
      indexName: 'NameIndex',
      partitionKey: { name: 'name', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    this.assetsTable.addGlobalSecondaryIndex({
      indexName: 'IdIndex',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    this.assetsTable.addGlobalSecondaryIndex({
      indexName: 'ClassIndex',
      partitionKey: { name: 'class', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    this.assetsTable.addGlobalSecondaryIndex({
      indexName: 'ExchangeIndex',
      partitionKey: { name: 'exchange', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    this.financialsTable = new dynamodb.Table(this, 'FinancialsTable', {
      tableName: `Signal9-Financials-${config.stage}`,
      partitionKey: { name: 'ticker', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'reportTypeDate', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    this.financialsTable.addGlobalSecondaryIndex({
      indexName: 'ReportTypeIndex',
      partitionKey: { name: 'reportType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'reportDate', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    this.newsTable = new dynamodb.Table(this, 'NewsTable', {
      tableName: `Signal9-News-${config.stage}`,
      partitionKey: { name: 'ticker', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    this.newsTable.addGlobalSecondaryIndex({
      indexName: 'TimestampIndex',
      partitionKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    this.newsTable.addGlobalSecondaryIndex({
      indexName: 'SentimentIndex',
      partitionKey: { name: 'sentiment', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    this.timeSeriesTable = new dynamodb.Table(this, 'TimeSeriesTable', {
      tableName: `Signal9-TimeSeries-${config.stage}`,
      partitionKey: { name: 'tickerDataType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    this.timeSeriesTable.addGlobalSecondaryIndex({
      indexName: 'DataTypeIndex',
      partitionKey: { name: 'dataType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    cdk.Tags.of(this.usersTable).add('Name', `Signal9-Users-${config.stage}`);
    cdk.Tags.of(this.usersTable).add('Project', 'Signal9');
    cdk.Tags.of(this.usersTable).add('Environment', config.stage);

    cdk.Tags.of(this.assetsTable).add('Name', `Signal9-Assets-${config.stage}`);
    cdk.Tags.of(this.assetsTable).add('Project', 'Signal9');
    cdk.Tags.of(this.assetsTable).add('Environment', config.stage);

    cdk.Tags.of(this.financialsTable).add('Name', `Signal9-Financials-${config.stage}`);
    cdk.Tags.of(this.financialsTable).add('Project', 'Signal9');
    cdk.Tags.of(this.financialsTable).add('Environment', config.stage);

    cdk.Tags.of(this.newsTable).add('Name', `Signal9-News-${config.stage}`);
    cdk.Tags.of(this.newsTable).add('Project', 'Signal9');
    cdk.Tags.of(this.newsTable).add('Environment', config.stage);

    cdk.Tags.of(this.timeSeriesTable).add('Name', `Signal9-TimeSeries-${config.stage}`);
    cdk.Tags.of(this.timeSeriesTable).add('Project', 'Signal9');
    cdk.Tags.of(this.timeSeriesTable).add('Environment', config.stage);
  }
}

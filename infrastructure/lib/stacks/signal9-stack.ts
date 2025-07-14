import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';
import { VpcConstruct } from '../constructs/vpc';
import { DynamoDbConstruct } from '../constructs/dynamodb';
import { S3Construct } from '../constructs/s3';
import { ApiGatewayConstruct } from '../constructs/apigateway';
import { LambdaConstruct } from '../constructs/lambda';

export interface Signal9StackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class Signal9Stack extends cdk.Stack {
  public readonly vpc: VpcConstruct;
  public readonly dynamodb: DynamoDbConstruct;
  public readonly s3: S3Construct;
  public readonly apiGateway: ApiGatewayConstruct;
  public readonly lambda: LambdaConstruct;

  constructor(scope: Construct, id: string, props: Signal9StackProps) {
    super(scope, id, props);

    const { config } = props;

    this.vpc = new VpcConstruct(this, 'Vpc', {
      config
    });

    this.dynamodb = new DynamoDbConstruct(this, 'DynamoDb', {
      config
    });

    this.s3 = new S3Construct(this, 'S3', {
      config
    });

    this.apiGateway = new ApiGatewayConstruct(this, 'ApiGateway', {
      config
    });

    this.lambda = new LambdaConstruct(this, 'Lambda', {
      config,
      vpc: this.vpc.vpc,
      privateSubnets: this.vpc.privateSubnets,
      usersTableName: this.dynamodb.usersTable.tableName,
      assetsTableName: this.dynamodb.assetsTable.tableName,
      financialsTableName: this.dynamodb.financialsTable.tableName,
      newsTableName: this.dynamodb.newsTable.tableName,
      timeSeriesTableName: this.dynamodb.timeSeriesTable.tableName
    });

    cdk.Tags.of(this).add('Project', 'Signal9');
    cdk.Tags.of(this).add('Environment', config.stage);
  }
}

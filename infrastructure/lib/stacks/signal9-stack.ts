import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';
import { VpcConstruct } from '../constructs/vpc';
import { DynamoDbConstruct } from '../constructs/dynamodb';
import { S3Construct } from '../constructs/s3';

export interface Signal9StackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class Signal9Stack extends cdk.Stack {
  public readonly vpc: VpcConstruct;
  public readonly dynamodb: DynamoDbConstruct;
  public readonly s3: S3Construct;

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

    cdk.Tags.of(this).add('Project', 'Signal9');
    cdk.Tags.of(this).add('Environment', config.stage);
  }
}

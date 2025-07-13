import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface Signal9StackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class Signal9Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Signal9StackProps) {
    super(scope, id, props);

    const { config } = props;

    cdk.Tags.of(this).add('Project', 'Signal9');
    cdk.Tags.of(this).add('Environment', config.stage);
  }
}

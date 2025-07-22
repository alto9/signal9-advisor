import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DatabaseConstruct } from './constructs/database-construct';
import { LambdaRolesConstruct } from './constructs/lambda-roles-construct';
import { S3Construct } from './constructs/s3-construct';
import { SecretsConstruct } from './constructs/secrets-construct';
import { SecretsAccessConstruct } from './constructs/secrets-access-construct';
import { SecretsMonitoringConstruct } from './constructs/secrets-monitoring-construct';

export class Signal9AdvisorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Apply consistent tags across all resources
    cdk.Tags.of(this).add('Project', 'Signal9Advisor');
    cdk.Tags.of(this).add('Environment', 'development');
    cdk.Tags.of(this).add('Phase', 'Phase1');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    // Create database construct
    const database = new DatabaseConstruct(this, 'Database');

    // Create S3 construct
    const s3 = new S3Construct(this, 'S3');

    // Create secrets construct for API credentials
    const secrets = new SecretsConstruct(this, 'Secrets');

    // Create secrets access construct for IAM policies
    const secretsAccess = new SecretsAccessConstruct(this, 'SecretsAccess', {
      secret: secrets.apiCredentialsSecret
    });

    // Create secrets monitoring construct for CloudTrail and alarms
    const secretsMonitoring = new SecretsMonitoringConstruct(this, 'SecretsMonitoring', {
      secret: secrets.apiCredentialsSecret
    });

    // Create monitoring dashboard
    const monitoringDashboard = secretsMonitoring.createMonitoringDashboard();

    // Create Lambda roles construct with secrets access
    const lambdaRoles = new LambdaRolesConstruct(this, 'LambdaRoles', {
      database,
      s3
    });

    // Grant Lambda roles access to secrets
    secrets.apiCredentialsSecret.grantRead(lambdaRoles.dataProcessingRole);
    lambdaRoles.dataProcessingRole.addManagedPolicy(secretsAccess.secretsReaderPolicy);

    // Output important resource information
    new cdk.CfnOutput(this, 'AssetsTableName', {
      value: database.assetsTable.tableName,
      description: 'Name of the Assets DynamoDB table'
    });

    new cdk.CfnOutput(this, 'EarningsCalendarTableName', {
      value: database.earningsCalendarTable.tableName,
      description: 'Name of the Earnings Calendar DynamoDB table'
    });

    new cdk.CfnOutput(this, 'AnalysisQueueTableName', {
      value: database.analysisQueueTable.tableName,
      description: 'Name of the Analysis Queue DynamoDB table'
    });

    new cdk.CfnOutput(this, 'AnalysisDataBucketName', {
      value: s3.analysisDataBucket.bucketName,
      description: 'Name of the Analysis Data S3 bucket'
    });

    new cdk.CfnOutput(this, 'DataProcessingRoleArn', {
      value: lambdaRoles.dataProcessingRole.roleArn,
      description: 'ARN of the Data Processing Lambda role'
    });

    // Secrets-related outputs
    new cdk.CfnOutput(this, 'ApiCredentialsSecretArn', {
      value: secrets.apiCredentialsSecret.secretArn,
      description: 'ARN of the API credentials secret'
    });

    new cdk.CfnOutput(this, 'ApiCredentialsSecretName', {
      value: secrets.apiCredentialsSecret.secretName!,
      description: 'Name of the API credentials secret'
    });

    new cdk.CfnOutput(this, 'SecretsReaderRoleArn', {
      value: secretsAccess.secretsReaderRole.roleArn,
      description: 'ARN of the Secrets Reader IAM role'
    });

    new cdk.CfnOutput(this, 'SecretsReaderPolicyArn', {
      value: secretsAccess.secretsReaderPolicy.managedPolicyArn,
      description: 'ARN of the Secrets Reader managed policy'
    });

    new cdk.CfnOutput(this, 'SecretRotationLambdaArn', {
      value: secrets.rotationLambda.functionArn,
      description: 'ARN of the secret rotation Lambda function'
    });

    new cdk.CfnOutput(this, 'SecretsCloudTrailArn', {
      value: secretsMonitoring.cloudTrail.trailArn,
      description: 'ARN of the CloudTrail for secrets monitoring'
    });

    new cdk.CfnOutput(this, 'SecretsMonitoringDashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${monitoringDashboard.dashboardName}`,
      description: 'URL to the secrets monitoring CloudWatch dashboard'
    });

    new cdk.CfnOutput(this, 'SecretsTrailBucketName', {
      value: secretsMonitoring.trailBucket.bucketName,
      description: 'Name of the S3 bucket for CloudTrail logs'
    });

    // Output helpful commands for secret population
    new cdk.CfnOutput(this, 'SecretPopulationCommand', {
      value: `cd signal9-advisor && ALPHAVANTAGE_API_KEY='your-key' ALPACA_API_KEY='your-key' ALPACA_API_SECRET='your-secret' ./scripts/populate-secrets.sh`,
      description: 'Command to populate the API credentials secret'
    });

    new cdk.CfnOutput(this, 'SecretTestCommand', {
      value: `aws secretsmanager get-secret-value --secret-id ${secrets.apiCredentialsSecret.secretName!} --region ${this.region}`,
      description: 'Command to test secret retrieval'
    });
  }
} 
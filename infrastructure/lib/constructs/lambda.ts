import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface LambdaConstructProps {
  config: EnvironmentConfig;
  vpc: ec2.IVpc;
  privateSubnets: ec2.ISubnet[];
  usersTableName: string;
  assetsTableName: string;
  financialsTableName: string;
  newsTableName: string;
  timeSeriesTableName: string;
  secretsEnvironment?: { [key: string]: string };
  secretsRole?: iam.Role;
}

export class LambdaConstruct extends Construct {
  public readonly sharedLayer: lambda.LayerVersion;
  public readonly executionRole: iam.Role;
  public readonly lambdaRole: iam.Role; // Alias for consistency
  public readonly deadLetterQueue: sqs.Queue;
  public readonly baseLambdaProps: Partial<lambda.FunctionProps>;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    const { 
      config, 
      vpc, 
      privateSubnets, 
      usersTableName, 
      assetsTableName, 
      financialsTableName, 
      newsTableName, 
      timeSeriesTableName,
      secretsEnvironment = {},
      secretsRole
    } = props;

    this.sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      layerVersionName: `Signal9-SharedLayer-${config.stage}`,
      code: lambda.Code.fromAsset('lambda-layers/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Shared utilities and AWS SDK for Signal9 Lambda functions',
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    this.deadLetterQueue = new sqs.Queue(this, 'DeadLetterQueue', {
      queueName: `Signal9-DLQ-${config.stage}`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Always create our own execution role for Lambda functions
    this.executionRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `Signal9-LambdaExecutionRole-${config.stage}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ]
    });

    // Create alias for consistency
    this.lambdaRole = this.executionRole;

    // If secrets role is provided, merge its permissions into our execution role
    if (secretsRole) {
      // Add the secrets access policy to our execution role
      this.executionRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret'
        ],
        resources: ['*'] // Will be restricted by the secrets role's policy
      }));
    }

    this.executionRole.addToPolicy(new iam.PolicyStatement({
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
      resources: [
        `arn:aws:dynamodb:${config.env.region}:*:table/${usersTableName}`,
        `arn:aws:dynamodb:${config.env.region}:*:table/${usersTableName}/index/*`,
        `arn:aws:dynamodb:${config.env.region}:*:table/${assetsTableName}`,
        `arn:aws:dynamodb:${config.env.region}:*:table/${assetsTableName}/index/*`,
        `arn:aws:dynamodb:${config.env.region}:*:table/${financialsTableName}`,
        `arn:aws:dynamodb:${config.env.region}:*:table/${financialsTableName}/index/*`,
        `arn:aws:dynamodb:${config.env.region}:*:table/${newsTableName}`,
        `arn:aws:dynamodb:${config.env.region}:*:table/${newsTableName}/index/*`,
        `arn:aws:dynamodb:${config.env.region}:*:table/${timeSeriesTableName}`,
        `arn:aws:dynamodb:${config.env.region}:*:table/${timeSeriesTableName}/index/*`
      ]
    }));

    this.executionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sqs:SendMessage',
        'sqs:ReceiveMessage',
        'sqs:DeleteMessage',
        'sqs:GetQueueAttributes'
      ],
      resources: [this.deadLetterQueue.queueArn]
    }));

    // Merge base environment variables with secrets environment variables
    const baseEnvironment = {
      USERS_TABLE: usersTableName,
      ASSETS_TABLE: assetsTableName,
      FINANCIALS_TABLE: financialsTableName,
      NEWS_TABLE: newsTableName,
      TIMESERIES_TABLE: timeSeriesTableName,
      DLQ_URL: this.deadLetterQueue.queueUrl,
      NODE_ENV: config.stage
    };

    this.baseLambdaProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      layers: [this.sharedLayer],
      vpc: vpc,
      vpcSubnets: {
        subnets: privateSubnets
      },
      role: this.executionRole,
      environment: {
        ...baseEnvironment,
        ...secretsEnvironment
      },
      deadLetterQueue: this.deadLetterQueue,
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      logRetention: 30,
      tracing: lambda.Tracing.ACTIVE
    };


    cdk.Tags.of(this.executionRole).add('Name', `Signal9-LambdaExecutionRole-${config.stage}`);
    cdk.Tags.of(this.executionRole).add('Project', 'Signal9');
    cdk.Tags.of(this.executionRole).add('Environment', config.stage);
    cdk.Tags.of(this.executionRole).add('Purpose', 'LambdaExecution');

    cdk.Tags.of(this.deadLetterQueue).add('Name', `Signal9-DLQ-${config.stage}`);
    cdk.Tags.of(this.deadLetterQueue).add('Project', 'Signal9');
    cdk.Tags.of(this.deadLetterQueue).add('Environment', config.stage);
    cdk.Tags.of(this.deadLetterQueue).add('Purpose', 'DeadLetterQueue');
  }
}

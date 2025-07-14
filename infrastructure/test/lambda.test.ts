import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { Signal9Stack } from '../lib/stacks/signal9-stack';
import { getConfig } from '../lib/config/environment';

describe('Lambda Infrastructure', () => {
  let app: cdk.App;
  let stack: Signal9Stack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    const config = getConfig('dev');
    stack = new Signal9Stack(app, 'TestSignal9Stack', {
      env: config.env,
      config: config
    });
    template = Template.fromStack(stack);
  });

  test('Shared layer is created with correct configuration', () => {
    template.hasResourceProperties('AWS::Lambda::LayerVersion', {
      LayerName: 'Signal9-SharedLayer-dev',
      Description: 'Shared utilities and AWS SDK for Signal9 Lambda functions',
      CompatibleRuntimes: ['nodejs18.x']
    });
  });

  test('Lambda execution role is created with correct permissions', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'Signal9-LambdaExecutionRole-dev',
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          {
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com'
            },
            Action: 'sts:AssumeRole'
          }
        ])
      },
      ManagedPolicyArns: Match.arrayWith([
        {
          'Fn::Join': [
            '',
            [
              'arn:',
              { Ref: 'AWS::Partition' },
              ':iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole'
            ]
          ]
        },
        {
          'Fn::Join': [
            '',
            [
              'arn:',
              { Ref: 'AWS::Partition' },
              ':iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
            ]
          ]
        }
      ])
    });
  });

  test('Lambda execution role has DynamoDB permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          {
            Effect: 'Allow',
            Action: [
              'dynamodb:GetItem',
              'dynamodb:PutItem',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
              'dynamodb:Query',
              'dynamodb:Scan',
              'dynamodb:BatchGetItem',
              'dynamodb:BatchWriteItem'
            ],
            Resource: Match.arrayWith([
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:aws:dynamodb:us-east-1:*:table/',
                    { Ref: Match.anyValue() }
                  ]
                ]
              }
            ])
          }
        ])
      }
    });
  });

  test('Dead letter queue is created with correct configuration', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'Signal9-DLQ-dev',
      MessageRetentionPeriod: 1209600,
      SqsManagedSseEnabled: true
    });
  });

  test('Lambda execution role has SQS permissions for DLQ', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          {
            Effect: 'Allow',
            Action: [
              'sqs:SendMessage',
              'sqs:ReceiveMessage',
              'sqs:DeleteMessage',
              'sqs:GetQueueAttributes'
            ],
            Resource: {
              'Fn::GetAtt': [
                Match.stringLikeRegexp('.*DeadLetterQueue.*'),
                'Arn'
              ]
            }
          }
        ])
      }
    });
  });

  test('Base Lambda properties are configured correctly', () => {
    expect(stack.lambda).toBeDefined();
    expect(stack.lambda.baseLambdaProps).toBeDefined();
    expect(stack.lambda.baseLambdaProps.runtime?.name).toBe('nodejs18.x');
    expect(stack.lambda.baseLambdaProps.layers).toBeDefined();
    expect(stack.lambda.baseLambdaProps.vpc).toBeDefined();
    expect(stack.lambda.baseLambdaProps.role).toBeDefined();
    expect(stack.lambda.baseLambdaProps.environment).toBeDefined();
  });

  test('Environment variables are set correctly', () => {
    const env = stack.lambda.baseLambdaProps.environment;
    expect(env).toBeDefined();
    expect(env!.NODE_ENV).toBe('dev');
    expect(env!.USERS_TABLE).toBeDefined();
    expect(env!.ASSETS_TABLE).toBeDefined();
    expect(env!.FINANCIALS_TABLE).toBeDefined();
    expect(env!.NEWS_TABLE).toBeDefined();
    expect(env!.TIMESERIES_TABLE).toBeDefined();
    expect(env!.DLQ_URL).toBeDefined();
  });

  test('Lambda configuration includes VPC settings', () => {
    expect(stack.lambda.baseLambdaProps.vpc).toBe(stack.vpc.vpc);
    expect(stack.lambda.baseLambdaProps.vpcSubnets).toEqual({
      subnets: stack.vpc.privateSubnets
    });
  });

  test('Lambda configuration includes monitoring and tracing', () => {
    expect(stack.lambda.baseLambdaProps.timeout?.toSeconds()).toBe(300);
    expect(stack.lambda.baseLambdaProps.memorySize).toBe(512);
    expect(stack.lambda.baseLambdaProps.logRetention).toBe(30);
    expect(stack.lambda.baseLambdaProps.tracing).toBe('Active');
  });

  test('All resources are tagged appropriately', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'Signal9-LambdaExecutionRole-dev',
      Tags: Match.arrayWith([
        { Key: 'Project', Value: 'Signal9' }
      ])
    });

    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'Signal9-LambdaExecutionRole-dev',
      Tags: Match.arrayWith([
        { Key: 'Environment', Value: 'dev' }
      ])
    });

    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'Signal9-LambdaExecutionRole-dev',
      Tags: Match.arrayWith([
        { Key: 'Purpose', Value: 'LambdaExecution' }
      ])
    });

    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'Signal9-DLQ-dev',
      Tags: Match.arrayWith([
        { Key: 'Project', Value: 'Signal9' }
      ])
    });

    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'Signal9-DLQ-dev',
      Tags: Match.arrayWith([
        { Key: 'Environment', Value: 'dev' }
      ])
    });

    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'Signal9-DLQ-dev',
      Tags: Match.arrayWith([
        { Key: 'Purpose', Value: 'DeadLetterQueue' }
      ])
    });

    template.hasResourceProperties('AWS::Lambda::LayerVersion', {
      LayerName: 'Signal9-SharedLayer-dev',
      Description: 'Shared utilities and AWS SDK for Signal9 Lambda functions'
    });
  });

  test('Lambda works across different environments', () => {
    const testApp = new cdk.App();
    const testConfig = getConfig('test');
    const testStack = new Signal9Stack(testApp, 'TestSignal9StackTest', {
      env: testConfig.env,
      config: testConfig
    });
    const testTemplate = Template.fromStack(testStack);

    testTemplate.hasResourceProperties('AWS::Lambda::LayerVersion', {
      LayerName: 'Signal9-SharedLayer-test'
    });

    testTemplate.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'Signal9-LambdaExecutionRole-test'
    });

    testTemplate.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'Signal9-DLQ-test'
    });
  });

  test('Resource count matches expected', () => {
    template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
    template.resourceCountIs('AWS::SQS::Queue', 1);
    
    const roles = template.findResources('AWS::IAM::Role');
    const lambdaRole = Object.values(roles).find(role => 
      role.Properties?.RoleName?.includes('LambdaExecutionRole')
    );
    expect(lambdaRole).toBeDefined();
  });

  test('Shared layer asset path is configured', () => {
    template.hasResourceProperties('AWS::Lambda::LayerVersion', {
      Content: {
        S3Bucket: Match.anyValue(),
        S3Key: Match.anyValue()
      }
    });
  });
});

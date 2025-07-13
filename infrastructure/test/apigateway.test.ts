import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { Signal9Stack } from '../lib/stacks/signal9-stack';
import { getConfig } from '../lib/config/environment';

describe('API Gateway Infrastructure', () => {
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

  test('REST API is created with correct configuration', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'Signal9-API-dev',
      Description: 'Signal9 Advisor API'
    });
  });

  test('API has proper CORS configuration', () => {
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'OPTIONS',
      Integration: {
        IntegrationResponses: Match.arrayWith([
          {
            StatusCode: '204',
            ResponseParameters: {
              'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'"
            }
          }
        ])
      }
    });
  });

  test('API deployment has correct logging configuration', () => {
    template.hasResourceProperties('AWS::ApiGateway::Stage', {
      StageName: 'dev',
      MethodSettings: Match.arrayWith([
        {
          ResourcePath: '/*',
          HttpMethod: '*',
          LoggingLevel: 'INFO',
          DataTraceEnabled: true,
          MetricsEnabled: true
        }
      ])
    });
  });

  test('Resource hierarchy is created correctly', () => {
    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'api'
    });

    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'v1'
    });

    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'users'
    });

    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'assets'
    });

    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'search'
    });

    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'news'
    });

    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'financials'
    });
  });

  test('Usage plan is configured with throttling', () => {
    template.hasResourceProperties('AWS::ApiGateway::UsagePlan', {
      UsagePlanName: 'Signal9-UsagePlan-dev',
      Description: 'Usage plan for Signal9 API',
      Throttle: {
        RateLimit: 1000,
        BurstLimit: 2000
      },
      Quota: {
        Limit: 10000,
        Period: 'DAY'
      }
    });
  });

  test('API key is created and linked to usage plan', () => {
    template.hasResourceProperties('AWS::ApiGateway::ApiKey', {
      Name: 'Signal9-ApiKey-dev',
      Description: 'API key for Signal9 API'
    });

    template.hasResourceProperties('AWS::ApiGateway::UsagePlanKey', {
      KeyType: 'API_KEY'
    });
  });

  test('CloudWatch role is created for logging', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          {
            Effect: 'Allow',
            Principal: {
              Service: 'apigateway.amazonaws.com'
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
              ':iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs'
            ]
          ]
        }
      ])
    });
  });

  test('API is tagged appropriately', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Tags: Match.arrayWith([
        { Key: 'Project', Value: 'Signal9' },
        { Key: 'Purpose', Value: 'RestApi' }
      ])
    });
  });

  test('API works across different environments', () => {
    const testApp = new cdk.App();
    const testConfig = getConfig('test');
    const testStack = new Signal9Stack(testApp, 'TestSignal9StackTest', {
      env: testConfig.env,
      config: testConfig
    });
    const testTemplate = Template.fromStack(testStack);

    testTemplate.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'Signal9-API-test'
    });

    testTemplate.hasResourceProperties('AWS::ApiGateway::UsagePlan', {
      UsagePlanName: 'Signal9-UsagePlan-test'
    });

    testTemplate.hasResourceProperties('AWS::ApiGateway::ApiKey', {
      Name: 'Signal9-ApiKey-test'
    });
  });

  test('Resource count matches expected', () => {
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    template.resourceCountIs('AWS::ApiGateway::Deployment', 1);
    template.resourceCountIs('AWS::ApiGateway::Stage', 1);
    template.resourceCountIs('AWS::ApiGateway::UsagePlan', 1);
    template.resourceCountIs('AWS::ApiGateway::ApiKey', 1);
    template.resourceCountIs('AWS::ApiGateway::UsagePlanKey', 1);

    template.resourceCountIs('AWS::ApiGateway::Resource', 7);
  });

  test('CORS is configured for all endpoint resources', () => {
    const methods = template.findResources('AWS::ApiGateway::Method');
    const optionsMethods = Object.entries(methods).filter(([key, resource]) => 
      resource.Properties.HttpMethod === 'OPTIONS'
    );
    
    expect(optionsMethods.length).toBeGreaterThanOrEqual(7);
  });
});

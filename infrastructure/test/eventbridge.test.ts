import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Template } from 'aws-cdk-lib/assertions';
import { EventBridgeConstruct } from '../lib/constructs/eventbridge';
import { EnvironmentConfig } from '../lib/config/environment';

describe('EventBridgeConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let config: EnvironmentConfig;
  let eventBridgeConstruct: EventBridgeConstruct;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    config = {
      env: { region: 'us-east-1' },
      stage: 'test',
      domainName: 'test.signal9.com'
    };
    
    eventBridgeConstruct = new EventBridgeConstruct(stack, 'EventBridge', {
      config
    });
    
    template = Template.fromStack(stack);
  });

  describe('EventBridge Bus', () => {
    it('should create custom EventBridge bus', () => {
      template.hasResourceProperties('AWS::Events::EventBus', {
        Name: 'signal9-events-test',
        Description: 'Custom event bus for Signal9 application events'
      });
    });

    it('should expose event bus ARN and name', () => {
      expect(eventBridgeConstruct.getEventBusArn()).toBeDefined();
      expect(eventBridgeConstruct.getEventBusName()).toBe('signal9-events-test');
    });
  });

  describe('Dead Letter Queues', () => {
    it('should create dead letter queue for events', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'signal9-events-dlq-test',
        MessageRetentionPeriod: 1209600, // 14 days
        SqsManagedSseEnabled: true,
        DelaySeconds: 0,
        ReceiveMessageWaitTimeSeconds: 20,
        VisibilityTimeout: 300
      });
    });

    it('should create dead letter queue for event rules', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'signal9-event-rule-dlq-test',
        MessageRetentionPeriod: 1209600, // 14 days
        SqsManagedSseEnabled: true,
        DelaySeconds: 0,
        ReceiveMessageWaitTimeSeconds: 20,
        VisibilityTimeout: 300
      });
    });
  });

  describe('Event Rules', () => {
    it('should create data update rule with correct pattern', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        Name: 'signal9-data-update-rule-test',
        Description: 'Rule to handle asset data updates and trigger AI enhancement',
        EventPattern: {
          source: ['signal9.data'],
          'detail-type': ['Asset Data Updated', 'Financial Data Updated', 'News Data Updated'],
          detail: {
            dataType: ['price', 'financials', 'news'],
            status: ['success']
          }
        },
        State: 'ENABLED'
      });
    });

    it('should create AI enhancement rule with correct pattern', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        Name: 'signal9-ai-enhancement-rule-test',
        Description: 'Rule to trigger AI enhancement processes',
        EventPattern: {
          source: ['signal9.ai'],
          'detail-type': ['News Sentiment Analysis', 'Financial Analysis', 'Trend Analysis'],
          detail: {
            processingStatus: ['pending', 'retry']
          }
        },
        State: 'ENABLED'
      });
    });

    it('should create user notification rule with correct pattern', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        Name: 'signal9-user-notification-rule-test',
        Description: 'Rule to handle user notification events',
        EventPattern: {
          source: ['signal9.user'],
          'detail-type': ['User Action', 'Portfolio Update', 'Alert Triggered'],
          detail: {
            notificationType: ['email', 'push', 'sms'],
            priority: ['high', 'medium', 'low']
          }
        },
        State: 'ENABLED'
      });
    });

    it('should create daily polling rule with correct schedule', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        Name: 'signal9-daily-polling-rule-test',
        Description: 'Scheduled rule to trigger daily data polling',
        ScheduleExpression: 'cron(0 6 * * ? *)',
        State: 'ENABLED'
      });
    });
  });

  describe('Event Rule Targets', () => {
    it('should add Lambda target to data update rule', () => {
      // Create a new app and stack for this test to avoid synthesis issues
      const testApp = new cdk.App();
      const testStack = new cdk.Stack(testApp, 'TestStackWithTargets');
      const testEventBridge = new EventBridgeConstruct(testStack, 'TestEventBridge', { config });
      
      const mockLambdaFunction = new lambda.Function(testStack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}')
      });
      
      testEventBridge.addDataUpdateTarget(mockLambdaFunction);
      
      const testTemplate = Template.fromStack(testStack);
      
      // Check that the rule has targets with the correct structure
      testTemplate.hasResourceProperties('AWS::Events::Rule', {
        Name: 'signal9-data-update-rule-test',
        Targets: [
          {
            Id: 'Target0',
            RetryPolicy: {
              MaximumEventAgeInSeconds: 7200,
              MaximumRetryAttempts: 3
            }
          }
        ]
      });
      
      // Also check that the Lambda function has the correct permissions
      testTemplate.hasResourceProperties('AWS::Lambda::Permission', {
        Action: 'lambda:InvokeFunction',
        Principal: 'events.amazonaws.com'
      });
    });

    it('should add Lambda target to AI enhancement rule', () => {
      // Create a new stack for this test to avoid synthesis issues
      const testStack = new cdk.Stack(app, 'TestStackWithAITargets');
      const testEventBridge = new EventBridgeConstruct(testStack, 'TestEventBridge', { config });
      
      const mockLambdaFunction = new lambda.Function(testStack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}')
      });
      
      testEventBridge.addAIEnhancementTarget(mockLambdaFunction);
      
      const testTemplate = Template.fromStack(testStack);
      
      testTemplate.hasResourceProperties('AWS::Events::Rule', {
        Name: 'signal9-ai-enhancement-rule-test',
        Targets: [
          {
            Arn: { 'Fn::GetAtt': ['TestLambda', 'Arn'] },
            Id: 'Target0',
            DeadLetterConfig: {
              Arn: { 'Fn::GetAtt': [expect.stringMatching(/TestEventBridgeEventRuleDeadLetterQueue/), 'Arn'] }
            },
            RetryPolicy: {
              MaximumRetryAttempts: 3,
              MaximumEventAge: 7200
            }
          }
        ]
      });
    });

    it('should add Lambda target to user notification rule', () => {
      // Create a new stack for this test to avoid synthesis issues
      const testStack = new cdk.Stack(app, 'TestStackWithUserTargets');
      const testEventBridge = new EventBridgeConstruct(testStack, 'TestEventBridge', { config });
      
      const mockLambdaFunction = new lambda.Function(testStack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}')
      });
      
      testEventBridge.addUserNotificationTarget(mockLambdaFunction);
      
      const testTemplate = Template.fromStack(testStack);
      
      testTemplate.hasResourceProperties('AWS::Events::Rule', {
        Name: 'signal9-user-notification-rule-test',
        Targets: [
          {
            Arn: { 'Fn::GetAtt': ['TestLambda', 'Arn'] },
            Id: 'Target0',
            DeadLetterConfig: {
              Arn: { 'Fn::GetAtt': [expect.stringMatching(/TestEventBridgeEventRuleDeadLetterQueue/), 'Arn'] }
            },
            RetryPolicy: {
              MaximumRetryAttempts: 3,
              MaximumEventAge: 7200
            }
          }
        ]
      });
    });

    it('should add Lambda target to daily polling rule', () => {
      // Create a new stack for this test to avoid synthesis issues
      const testStack = new cdk.Stack(app, 'TestStackWithDailyTargets');
      const testEventBridge = new EventBridgeConstruct(testStack, 'TestEventBridge', { config });
      
      const mockLambdaFunction = new lambda.Function(testStack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}')
      });
      
      testEventBridge.addDailyPollingTarget(mockLambdaFunction);
      
      const testTemplate = Template.fromStack(testStack);
      
      testTemplate.hasResourceProperties('AWS::Events::Rule', {
        Name: 'signal9-daily-polling-rule-test',
        Targets: [
          {
            Arn: { 'Fn::GetAtt': ['TestLambda', 'Arn'] },
            Id: 'Target0',
            DeadLetterConfig: {
              Arn: { 'Fn::GetAtt': [expect.stringMatching(/TestEventBridgeEventRuleDeadLetterQueue/), 'Arn'] }
            },
            RetryPolicy: {
              MaximumRetryAttempts: 3,
              MaximumEventAge: 7200
            }
          }
        ]
      });
    });
  });

  describe('SQS Integration', () => {
    it('should add SQS target to custom rule', () => {
      const customQueue = new sqs.Queue(stack, 'TestQueue');
      const customRule = eventBridgeConstruct.createCustomRule(
        'CustomRule',
        'custom-test-rule',
        {
          source: ['signal9.test'],
          detailType: ['Test Event']
        }
      );
      
      eventBridgeConstruct.addSQSTarget(customRule, customQueue);
      
      template.hasResourceProperties('AWS::Events::Rule', {
        Name: 'signal9-custom-test-rule-dev',
        Targets: [
          {
            Arn: { 'Fn::GetAtt': ['TestQueue', 'Arn'] },
            Id: 'Target0',
            DeadLetterConfig: {
              Arn: { 'Fn::GetAtt': [template.findResources('AWS::SQS::Queue', {
                Properties: { QueueName: 'signal9-event-rule-dlq-test' }
              }), 'Arn'] }
            },
            RetryPolicy: {
              MaximumRetryAttempts: 3,
              MaximumEventAge: 7200
            }
          }
        ]
      });
    });
  });

  describe('Custom Rules', () => {
    it('should create custom rule with specified event pattern', () => {
      const customEventPattern = {
        source: ['signal9.custom'],
        detailType: ['Custom Event Type'],
        detail: {
          customField: ['value1', 'value2']
        }
      };
      
      const customRule = eventBridgeConstruct.createCustomRule(
        'CustomTestRule',
        'custom-rule',
        customEventPattern
      );
      
      expect(customRule).toBeDefined();
      
      template.hasResourceProperties('AWS::Events::Rule', {
        Name: 'signal9-custom-rule-dev',
        Description: 'Custom rule for custom-rule',
        EventPattern: {
          source: ['signal9.custom'],
          'detail-type': ['Custom Event Type'],
          detail: {
            customField: ['value1', 'value2']
          }
        },
        State: 'ENABLED'
      });
    });
  });

  describe('Resource Tagging', () => {
    it('should tag all resources with project and environment tags', () => {
      const resources = template.findResources('AWS::Events::EventBus');
      const resourceKeys = Object.keys(resources);
      
      expect(resourceKeys.length).toBeGreaterThan(0);
      
      // Check for tags on EventBridge resources
      template.hasResourceProperties('AWS::Events::EventBus', {
        Tags: [
          { Key: 'Project', Value: 'Signal9' },
          { Key: 'Environment', Value: 'test' },
          { Key: 'Component', Value: 'EventBridge' }
        ]
      });
    });
  });

  describe('Error Handling', () => {
    it('should configure proper retry and dead letter queue settings', () => {
      const mockLambdaFunction = new lambda.Function(stack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}')
      });
      
      eventBridgeConstruct.addDataUpdateTarget(mockLambdaFunction);
      
      // Verify dead letter queue configuration
      template.hasResourceProperties('AWS::Events::Rule', {
        Targets: [
          {
            DeadLetterConfig: {
              Arn: { 'Fn::GetAtt': [template.findResources('AWS::SQS::Queue', {
                Properties: { QueueName: 'signal9-event-rule-dlq-test' }
              }), 'Arn'] }
            },
            RetryPolicy: {
              MaximumRetryAttempts: 3,
              MaximumEventAge: 7200 // 2 hours
            }
          }
        ]
      });
    });
  });
}); 
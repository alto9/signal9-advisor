import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface EventBridgeConstructProps {
  config: EnvironmentConfig;
}

export class EventBridgeConstruct extends Construct {
  public readonly eventBus: events.EventBus;
  public readonly dataUpdateRule: events.Rule;
  public readonly aiEnhancementRule: events.Rule;
  public readonly userNotificationRule: events.Rule;
  public readonly dailyPollingRule: events.Rule;
  public readonly deadLetterQueue: sqs.Queue;
  public readonly eventDeadLetterQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: EventBridgeConstructProps) {
    super(scope, id);

    const { config } = props;

    // Create dead letter queue for failed events
    this.deadLetterQueue = new sqs.Queue(this, 'EventDeadLetterQueue', {
      queueName: `signal9-events-dlq-${config.stage}`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      deliveryDelay: cdk.Duration.seconds(0),
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    // Create event dead letter queue for rule failures
    this.eventDeadLetterQueue = new sqs.Queue(this, 'EventRuleDeadLetterQueue', {
      queueName: `signal9-event-rule-dlq-${config.stage}`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      deliveryDelay: cdk.Duration.seconds(0),
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    // Create custom EventBridge bus
    this.eventBus = new events.EventBus(this, 'Signal9EventBus', {
      eventBusName: `signal9-events-${config.stage}`,
      description: 'Custom event bus for Signal9 application events'
    });

    // Create rule for asset data updates
    this.dataUpdateRule = new events.Rule(this, 'DataUpdateRule', {
      eventBus: this.eventBus,
      ruleName: `signal9-data-update-rule-${config.stage}`,
      description: 'Rule to handle asset data updates and trigger AI enhancement',
      eventPattern: {
        source: ['signal9.data'],
        detailType: ['Asset Data Updated', 'Financial Data Updated', 'News Data Updated'],
        detail: {
          dataType: ['price', 'financials', 'news'],
          status: ['success']
        }
      },
      enabled: true
    });

    // Create rule for AI enhancement triggers
    this.aiEnhancementRule = new events.Rule(this, 'AIEnhancementRule', {
      eventBus: this.eventBus,
      ruleName: `signal9-ai-enhancement-rule-${config.stage}`,
      description: 'Rule to trigger AI enhancement processes',
      eventPattern: {
        source: ['signal9.ai'],
        detailType: ['News Sentiment Analysis', 'Financial Analysis', 'Trend Analysis'],
        detail: {
          processingStatus: ['pending', 'retry']
        }
      },
      enabled: true
    });

    // Create rule for user notification events
    this.userNotificationRule = new events.Rule(this, 'UserNotificationRule', {
      eventBus: this.eventBus,
      ruleName: `signal9-user-notification-rule-${config.stage}`,
      description: 'Rule to handle user notification events',
      eventPattern: {
        source: ['signal9.user'],
        detailType: ['User Action', 'Portfolio Update', 'Alert Triggered'],
        detail: {
          notificationType: ['email', 'push', 'sms'],
          priority: ['high', 'medium', 'low']
        }
      },
      enabled: true
    });

    // Create scheduled rule for daily data polling
    // Note: Scheduled rules cannot be associated with custom event buses
    this.dailyPollingRule = new events.Rule(this, 'DailyPollingRule', {
      ruleName: `signal9-daily-polling-rule-${config.stage}`,
      description: 'Scheduled rule to trigger daily data polling',
      schedule: events.Schedule.cron({
        hour: '6',
        minute: '0',
        day: '*',
        month: '*',
        year: '*'
      }),
      enabled: true
    });

    // Add tags to all resources
    cdk.Tags.of(this).add('Project', 'Signal9');
    cdk.Tags.of(this).add('Environment', config.stage);
    cdk.Tags.of(this).add('Component', 'EventBridge');
  }

  /**
   * Add Lambda function as target to data update rule
   */
  public addDataUpdateTarget(lambdaFunction: lambda.Function): void {
    this.dataUpdateRule.addTarget(new targets.LambdaFunction(lambdaFunction, {
      deadLetterQueue: this.eventDeadLetterQueue,
      maxEventAge: cdk.Duration.hours(2),
      retryAttempts: 3
    }));
  }

  /**
   * Add Lambda function as target to AI enhancement rule
   */
  public addAIEnhancementTarget(lambdaFunction: lambda.Function): void {
    this.aiEnhancementRule.addTarget(new targets.LambdaFunction(lambdaFunction, {
      deadLetterQueue: this.eventDeadLetterQueue,
      maxEventAge: cdk.Duration.hours(2),
      retryAttempts: 3
    }));
  }

  /**
   * Add Lambda function as target to user notification rule
   */
  public addUserNotificationTarget(lambdaFunction: lambda.Function): void {
    this.userNotificationRule.addTarget(new targets.LambdaFunction(lambdaFunction, {
      deadLetterQueue: this.eventDeadLetterQueue,
      maxEventAge: cdk.Duration.hours(2),
      retryAttempts: 3
    }));
  }

  /**
   * Add Lambda function as target to daily polling rule
   */
  public addDailyPollingTarget(lambdaFunction: lambda.Function): void {
    this.dailyPollingRule.addTarget(new targets.LambdaFunction(lambdaFunction, {
      deadLetterQueue: this.eventDeadLetterQueue,
      maxEventAge: cdk.Duration.hours(2),
      retryAttempts: 3
    }));
  }

  /**
   * Add SQS queue as target to any rule
   */
  public addSQSTarget(rule: events.Rule, queue: sqs.Queue): void {
    rule.addTarget(new targets.SqsQueue(queue, {
      deadLetterQueue: this.eventDeadLetterQueue,
      maxEventAge: cdk.Duration.hours(2),
      retryAttempts: 3
    }));
  }

  /**
   * Create a custom rule for specific event patterns
   */
  public createCustomRule(id: string, ruleName: string, eventPattern: events.EventPattern): events.Rule {
    return new events.Rule(this, id, {
      eventBus: this.eventBus,
      ruleName: `signal9-${ruleName}-${this.node.tryGetContext('stage') || 'dev'}`,
      description: `Custom rule for ${ruleName}`,
      eventPattern,
      enabled: true
    });
  }

  /**
   * Get event bus ARN for external access
   */
  public getEventBusArn(): string {
    return this.eventBus.eventBusArn;
  }

  /**
   * Get event bus name for external access
   */
  public getEventBusName(): string {
    return this.eventBus.eventBusName;
  }
} 
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { CloudWatchConstruct } from '../lib/constructs/cloudwatch';
import { EnvironmentConfig } from '../lib/config/environment';

describe('CloudWatchConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let config: EnvironmentConfig;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    config = {
      stage: 'test',
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    };
  });

  test('should create CloudWatch construct with basic configuration', () => {
    // Act
    const cloudWatchConstruct = new CloudWatchConstruct(stack, 'TestCloudWatch', {
      config,
    });

    // Assert
    expect(cloudWatchConstruct).toBeInstanceOf(CloudWatchConstruct);
    expect(cloudWatchConstruct.applicationLogGroup).toBeDefined();
    expect(cloudWatchConstruct.lambdaLogGroups).toHaveLength(0);
    expect(cloudWatchConstruct.alarms).toHaveLength(1); // Data ingestion failure alarm
    expect(cloudWatchConstruct.dashboard).toBeDefined();
  });

  test('should create application log group', () => {
    // Act
    new CloudWatchConstruct(stack, 'TestCloudWatch', {
      config,
    });

    // Assert
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/signal9/application/test',
      RetentionInDays: 30,
    });
  });

  test('should create dashboard', () => {
    // Act
    new CloudWatchConstruct(stack, 'TestCloudWatch', {
      config,
    });

    // Assert
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'Signal9-test-Dashboard',
    });
  });

  test('should create data ingestion failure alarm', () => {
    // Act
    new CloudWatchConstruct(stack, 'TestCloudWatch', {
      config,
    });

    // Assert
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'Signal9-test-DataIngestion-Failure',
      AlarmDescription: 'Data ingestion failures detected',
      MetricName: 'FailedIngestion',
      Namespace: 'Signal9/DataIngestion',
      Threshold: 3,
      ComparisonOperator: 'GreaterThanThreshold',
    });
  });

  test('should create custom metric', () => {
    // Arrange
    const cloudWatchConstruct = new CloudWatchConstruct(stack, 'TestCloudWatch', {
      config,
    });

    // Act
    const customMetric = cloudWatchConstruct.createCustomMetric(
      'TestNamespace',
      'TestMetric',
      { Environment: 'test' }
    );

    // Assert
    expect(customMetric).toBeInstanceOf(cloudwatch.Metric);
    expect(customMetric.namespace).toBe('TestNamespace');
    expect(customMetric.metricName).toBe('TestMetric');
  });

  test('should create custom alarm', () => {
    // Arrange
    const cloudWatchConstruct = new CloudWatchConstruct(stack, 'TestCloudWatch', {
      config,
    });
    const metric = new cloudwatch.Metric({
      namespace: 'TestNamespace',
      metricName: 'TestMetric',
    });

    // Act
    const customAlarm = cloudWatchConstruct.createCustomAlarm(
      'TestAlarm',
      'Test Alarm Name',
      metric,
      100
    );

    // Assert
    expect(customAlarm).toBeInstanceOf(cloudwatch.Alarm);
    expect(cloudWatchConstruct.alarms).toContain(customAlarm);
  });

  test('should create metric filter', () => {
    // Arrange
    const cloudWatchConstruct = new CloudWatchConstruct(stack, 'TestCloudWatch', {
      config,
    });
    const logGroup = new logs.LogGroup(stack, 'TestLogGroup');

    // Act
    const metricFilter = cloudWatchConstruct.createMetricFilter(
      logGroup,
      'TestMetricFilter',
      logs.FilterPattern.allEvents(),
      'TestNamespace',
      'TestMetric',
      1
    );

    // Assert
    expect(metricFilter).toBeInstanceOf(logs.MetricFilter);
  });

  test('should apply correct tags', () => {
    // Act
    new CloudWatchConstruct(stack, 'TestCloudWatch', {
      config,
    });

    // Assert
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      Tags: [
        {
          Key: 'Component',
          Value: 'Monitoring',
        },
        {
          Key: 'Environment',
          Value: 'test',
        },
        {
          Key: 'Project',
          Value: 'Signal9',
        },
      ],
    });
  });
}); 
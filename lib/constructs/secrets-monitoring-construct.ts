import * as cdk from 'aws-cdk-lib';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cwactions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';

export interface SecretsMonitoringConstructProps {
  /**
   * The secret to monitor
   */
  secret: secretsmanager.Secret;
  
  /**
   * Optional SNS topic for notifications
   */
  notificationTopic?: sns.Topic;
}

export class SecretsMonitoringConstruct extends Construct {
  public readonly cloudTrail: cloudtrail.Trail;
  public readonly logGroup: logs.LogGroup;
  public readonly unauthorizedAccessAlarm: cloudwatch.Alarm;
  public readonly highVolumeAccessAlarm: cloudwatch.Alarm;
  public readonly trailBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: SecretsMonitoringConstructProps) {
    super(scope, id);

    // Create S3 bucket for CloudTrail logs
    this.trailBucket = new s3.Bucket(this, 'SecretsTrailBucket', {
      bucketName: `${cdk.Stack.of(this).node.tryGetContext('environment') || 'dev'}-signal9-secrets-trail-${cdk.Stack.of(this).account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      lifecycleRules: [{
        id: 'CloudTrailLogRetention',
        enabled: true,
        transitions: [{
          storageClass: s3.StorageClass.INFREQUENT_ACCESS,
          transitionAfter: cdk.Duration.days(30)
        }, {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(90)
        }],
        expiration: cdk.Duration.days(2555) // 7 years retention
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY // Change to RETAIN for production
    });

    // Create CloudWatch log group for CloudTrail
    this.logGroup = new logs.LogGroup(this, 'SecretsTrailLogGroup', {
      logGroupName: '/aws/cloudtrail/signal9-advisor-secrets',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Create CloudTrail for secrets access monitoring
    this.cloudTrail = new cloudtrail.Trail(this, 'SecretsManagerTrail', {
      trailName: 'signal9-advisor-secrets-trail',
      bucket: this.trailBucket,
      s3KeyPrefix: 'secrets-manager-logs/',
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: false,
      enableFileValidation: true,
      sendToCloudWatchLogs: true,
      cloudWatchLogGroup: this.logGroup
    });

    // Add event selectors for Secrets Manager actions - simplified approach
    this.cloudTrail.logAllS3DataEvents();

    // Create metric filter for unauthorized access attempts
    const unauthorizedAccessFilter = this.logGroup.addMetricFilter('UnauthorizedAccessMetricFilter', {
      filterPattern: logs.FilterPattern.literal('[version, account, time, id, type, user, region, source, service="secretsmanager", action="GetSecretValue", result="FAILURE", ...]'),
      metricNamespace: 'Signal9Advisor/Secrets',
      metricName: 'UnauthorizedAccess',
      metricValue: '1',
      defaultValue: 0
    });

    // Create metric filter for high volume access
    const highVolumeAccessFilter = this.logGroup.addMetricFilter('HighVolumeAccessMetricFilter', {
      filterPattern: logs.FilterPattern.stringValue('$.eventName', '=', 'GetSecretValue'),
      metricNamespace: 'Signal9Advisor/Secrets',
      metricName: 'SecretAccessCount',
      metricValue: '1',
      defaultValue: 0
    });

    // Create CloudWatch alarm for unauthorized access attempts
    this.unauthorizedAccessAlarm = new cloudwatch.Alarm(this, 'UnauthorizedSecretAccessAlarm', {
      alarmName: 'Signal9Advisor-UnauthorizedSecretAccess',
      alarmDescription: 'Unauthorized access attempts to Signal9 Advisor secrets detected',
      metric: new cloudwatch.Metric({
        namespace: 'Signal9Advisor/Secrets',
        metricName: 'UnauthorizedAccess',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      actionsEnabled: true
    });

    // Create CloudWatch alarm for high volume access
    this.highVolumeAccessAlarm = new cloudwatch.Alarm(this, 'HighVolumeSecretAccessAlarm', {
      alarmName: 'Signal9Advisor-HighVolumeSecretAccess',
      alarmDescription: 'High volume of secret access attempts detected (>10 per minute)',
      metric: new cloudwatch.Metric({
        namespace: 'Signal9Advisor/Secrets',
        metricName: 'SecretAccessCount',
        statistic: 'Sum',
        period: cdk.Duration.minutes(1)
      }),
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      actionsEnabled: true
    });

    // Add SNS notification actions if topic is provided
    if (props.notificationTopic) {
      this.unauthorizedAccessAlarm.addAlarmAction(
        new cwactions.SnsAction(props.notificationTopic)
      );
      this.highVolumeAccessAlarm.addAlarmAction(
        new cwactions.SnsAction(props.notificationTopic)
      );
    }

    // Create custom metrics for secret operations
    this.createCustomMetrics();

    // Add resource tags
    cdk.Tags.of(this.cloudTrail).add('Project', 'Signal9Advisor');
    cdk.Tags.of(this.cloudTrail).add('Component', 'SecretsMonitoring');
    cdk.Tags.of(this.trailBucket).add('Project', 'Signal9Advisor');
    cdk.Tags.of(this.trailBucket).add('Component', 'SecretsMonitoring');
    cdk.Tags.of(this.logGroup).add('Project', 'Signal9Advisor');
    cdk.Tags.of(this.logGroup).add('Component', 'SecretsMonitoring');
  }

  /**
   * Create additional custom metrics for monitoring
   */
  private createCustomMetrics(): void {
    // Metric filter for secret rotation events
    this.logGroup.addMetricFilter('SecretRotationMetricFilter', {
      filterPattern: logs.FilterPattern.stringValue('$.eventName', '=', 'RotateSecret'),
      metricNamespace: 'Signal9Advisor/Secrets',
      metricName: 'SecretRotationCount',
      metricValue: '1',
      defaultValue: 0
    });

    // Metric filter for secret creation/update events
    this.logGroup.addMetricFilter('SecretUpdateMetricFilter', {
      filterPattern: logs.FilterPattern.any(
        logs.FilterPattern.stringValue('$.eventName', '=', 'CreateSecret'),
        logs.FilterPattern.stringValue('$.eventName', '=', 'UpdateSecret')
      ),
      metricNamespace: 'Signal9Advisor/Secrets',
      metricName: 'SecretUpdateCount',
      metricValue: '1',
      defaultValue: 0
    });

    // Metric filter for access by source IP (for geographic monitoring)
    this.logGroup.addMetricFilter('AccessByRegionMetricFilter', {
      filterPattern: logs.FilterPattern.stringValue('$.eventName', '=', 'GetSecretValue'),
      metricNamespace: 'Signal9Advisor/Secrets',
      metricName: 'AccessByRegion',
      metricValue: '1',
      defaultValue: 0
    });
  }

  /**
   * Create a CloudWatch dashboard for monitoring secrets
   */
  createMonitoringDashboard(): cloudwatch.Dashboard {
    const dashboard = new cloudwatch.Dashboard(this, 'SecretsMonitoringDashboard', {
      dashboardName: 'Signal9Advisor-SecretsMonitoring',
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Secret Access Volume',
            left: [
              new cloudwatch.Metric({
                namespace: 'Signal9Advisor/Secrets',
                metricName: 'SecretAccessCount',
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
              })
            ],
            width: 12,
            height: 6
          })
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Unauthorized Access Attempts',
            left: [
              new cloudwatch.Metric({
                namespace: 'Signal9Advisor/Secrets',
                metricName: 'UnauthorizedAccess',
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
              })
            ],
            width: 12,
            height: 6
          })
        ],
        [
          new cloudwatch.SingleValueWidget({
            title: 'Total Secret Accesses (24h)',
            metrics: [
              new cloudwatch.Metric({
                namespace: 'Signal9Advisor/Secrets',
                metricName: 'SecretAccessCount',
                statistic: 'Sum',
                period: cdk.Duration.hours(24)
              })
            ],
            width: 6,
            height: 3
          }),
          new cloudwatch.SingleValueWidget({
            title: 'Failed Access Attempts (24h)',
            metrics: [
              new cloudwatch.Metric({
                namespace: 'Signal9Advisor/Secrets',
                metricName: 'UnauthorizedAccess',
                statistic: 'Sum',
                period: cdk.Duration.hours(24)
              })
            ],
            width: 6,
            height: 3
          })
        ]
      ]
    });

    return dashboard;
  }
} 
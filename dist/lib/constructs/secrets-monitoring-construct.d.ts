import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sns from 'aws-cdk-lib/aws-sns';
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
export declare class SecretsMonitoringConstruct extends Construct {
    readonly cloudTrail: cloudtrail.Trail;
    readonly logGroup: logs.LogGroup;
    readonly unauthorizedAccessAlarm: cloudwatch.Alarm;
    readonly highVolumeAccessAlarm: cloudwatch.Alarm;
    readonly trailBucket: s3.Bucket;
    constructor(scope: Construct, id: string, props: SecretsMonitoringConstructProps);
    /**
     * Create additional custom metrics for monitoring
     */
    private createCustomMetrics;
    /**
     * Create a CloudWatch dashboard for monitoring secrets
     */
    createMonitoringDashboard(): cloudwatch.Dashboard;
}

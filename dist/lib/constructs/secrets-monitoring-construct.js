"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretsMonitoringConstruct = void 0;
const cdk = require("aws-cdk-lib");
const cloudtrail = require("aws-cdk-lib/aws-cloudtrail");
const cloudwatch = require("aws-cdk-lib/aws-cloudwatch");
const logs = require("aws-cdk-lib/aws-logs");
const s3 = require("aws-cdk-lib/aws-s3");
const cwactions = require("aws-cdk-lib/aws-cloudwatch-actions");
const constructs_1 = require("constructs");
class SecretsMonitoringConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
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
            this.unauthorizedAccessAlarm.addAlarmAction(new cwactions.SnsAction(props.notificationTopic));
            this.highVolumeAccessAlarm.addAlarmAction(new cwactions.SnsAction(props.notificationTopic));
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
    createCustomMetrics() {
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
            filterPattern: logs.FilterPattern.any(logs.FilterPattern.stringValue('$.eventName', '=', 'CreateSecret'), logs.FilterPattern.stringValue('$.eventName', '=', 'UpdateSecret')),
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
    createMonitoringDashboard() {
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
exports.SecretsMonitoringConstruct = SecretsMonitoringConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy1tb25pdG9yaW5nLWNvbnN0cnVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9jb25zdHJ1Y3RzL3NlY3JldHMtbW9uaXRvcmluZy1jb25zdHJ1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLHlEQUF5RDtBQUN6RCx5REFBeUQ7QUFDekQsNkNBQTZDO0FBQzdDLHlDQUF5QztBQUd6QyxnRUFBZ0U7QUFDaEUsMkNBQXVDO0FBY3ZDLE1BQWEsMEJBQTJCLFNBQVEsc0JBQVM7SUFPdkQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQztRQUM5RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLHVDQUF1QztRQUN2QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDM0QsVUFBVSxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLDBCQUEwQixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUU7WUFDbEksVUFBVSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVO1lBQzFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELFVBQVUsRUFBRSxJQUFJO1lBQ2hCLGNBQWMsRUFBRSxDQUFDO29CQUNmLEVBQUUsRUFBRSx3QkFBd0I7b0JBQzVCLE9BQU8sRUFBRSxJQUFJO29CQUNiLFdBQVcsRUFBRSxDQUFDOzRCQUNaLFlBQVksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLGlCQUFpQjs0QkFDL0MsZUFBZSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxD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d0JBQ0QsS0FBSyxFQUFFLENBQUM7d0JBQ1IsTUFBTSxFQUFFLENBQUM7cUJBQ1YsQ0FBQztpQkFDSDthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztDQUNGO0FBeE9ELGdFQXdPQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBjbG91ZHRyYWlsIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHRyYWlsJztcbmltcG9ydCAqIGFzIGNsb3Vkd2F0Y2ggZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gnO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcbmltcG9ydCAqIGFzIHNucyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc25zJztcbmltcG9ydCAqIGFzIGN3YWN0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR3YXRjaC1hY3Rpb25zJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlY3JldHNNb25pdG9yaW5nQ29uc3RydWN0UHJvcHMge1xuICAvKipcbiAgICogVGhlIHNlY3JldCB0byBtb25pdG9yXG4gICAqL1xuICBzZWNyZXQ6IHNlY3JldHNtYW5hZ2VyLlNlY3JldDtcbiAgXG4gIC8qKlxuICAgKiBPcHRpb25hbCBTTlMgdG9waWMgZm9yIG5vdGlmaWNhdGlvbnNcbiAgICovXG4gIG5vdGlmaWNhdGlvblRvcGljPzogc25zLlRvcGljO1xufVxuXG5leHBvcnQgY2xhc3MgU2VjcmV0c01vbml0b3JpbmdDb25zdHJ1Y3QgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgY2xvdWRUcmFpbDogY2xvdWR0cmFpbC5UcmFpbDtcbiAgcHVibGljIHJlYWRvbmx5IGxvZ0dyb3VwOiBsb2dzLkxvZ0dyb3VwO1xuICBwdWJsaWMgcmVhZG9ubHkgdW5hdXRob3JpemVkQWNjZXNzQWxhcm06IGNsb3Vkd2F0Y2guQWxhcm07XG4gIHB1YmxpYyByZWFkb25seSBoaWdoVm9sdW1lQWNjZXNzQWxhcm06IGNsb3Vkd2F0Y2guQWxhcm07XG4gIHB1YmxpYyByZWFkb25seSB0cmFpbEJ1Y2tldDogczMuQnVja2V0O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBTZWNyZXRzTW9uaXRvcmluZ0NvbnN0cnVjdFByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIC8vIENyZWF0ZSBTMyBidWNrZXQgZm9yIENsb3VkVHJhaWwgbG9nc1xuICAgIHRoaXMudHJhaWxCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdTZWNyZXRzVHJhaWxCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgJHtjZGsuU3RhY2sub2YodGhpcykubm9kZS50cnlHZXRDb250ZXh0KCdlbnZpcm9ubWVudCcpIHx8ICdkZXYnfS1zaWduYWw5LXNlY3JldHMtdHJhaWwtJHtjZGsuU3RhY2sub2YodGhpcykuYWNjb3VudH1gLFxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICBsaWZlY3ljbGVSdWxlczogW3tcbiAgICAgICAgaWQ6ICdDbG91ZFRyYWlsTG9nUmV0ZW50aW9uJyxcbiAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgdHJhbnNpdGlvbnM6IFt7XG4gICAgICAgICAgc3RvcmFnZUNsYXNzOiBzMy5TdG9yYWdlQ2xhc3MuSU5GUkVRVUVOVF9BQ0NFU1MsXG4gICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cygzMClcbiAgICAgICAgfSwge1xuICAgICAgICAgIHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLkdMQUNJRVIsXG4gICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cyg5MClcbiAgICAgICAgfV0sXG4gICAgICAgIGV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDI1NTUpIC8vIDcgeWVhcnMgcmV0ZW50aW9uXG4gICAgICB9XSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1kgLy8gQ2hhbmdlIHRvIFJFVEFJTiBmb3IgcHJvZHVjdGlvblxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIENsb3VkV2F0Y2ggbG9nIGdyb3VwIGZvciBDbG91ZFRyYWlsXG4gICAgdGhpcy5sb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdTZWNyZXRzVHJhaWxMb2dHcm91cCcsIHtcbiAgICAgIGxvZ0dyb3VwTmFtZTogJy9hd3MvY2xvdWR0cmFpbC9zaWduYWw5LWFkdmlzb3Itc2VjcmV0cycsXG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfTU9OVEgsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgQ2xvdWRUcmFpbCBmb3Igc2VjcmV0cyBhY2Nlc3MgbW9uaXRvcmluZ1xuICAgIHRoaXMuY2xvdWRUcmFpbCA9IG5ldyBjbG91ZHRyYWlsLlRyYWlsKHRoaXMsICdTZWNyZXRzTWFuYWdlclRyYWlsJywge1xuICAgICAgdHJhaWxOYW1lOiAnc2lnbmFsOS1hZHZpc29yLXNlY3JldHMtdHJhaWwnLFxuICAgICAgYnVja2V0OiB0aGlzLnRyYWlsQnVja2V0LFxuICAgICAgczNLZXlQcmVmaXg6ICdzZWNyZXRzLW1hbmFnZXItbG9ncy8nLFxuICAgICAgaW5jbHVkZUdsb2JhbFNlcnZpY2VFdmVudHM6IHRydWUsXG4gICAgICBpc011bHRpUmVnaW9uVHJhaWw6IGZhbHNlLFxuICAgICAgZW5hYmxlRmlsZVZhbGlkYXRpb246IHRydWUsXG4gICAgICBzZW5kVG9DbG91ZFdhdGNoTG9nczogdHJ1ZSxcbiAgICAgIGNsb3VkV2F0Y2hMb2dHcm91cDogdGhpcy5sb2dHcm91cFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIGV2ZW50IHNlbGVjdG9ycyBmb3IgU2VjcmV0cyBNYW5hZ2VyIGFjdGlvbnMgLSBzaW1wbGlmaWVkIGFwcHJvYWNoXG4gICAgdGhpcy5jbG91ZFRyYWlsLmxvZ0FsbFMzRGF0YUV2ZW50cygpO1xuXG4gICAgLy8gQ3JlYXRlIG1ldHJpYyBmaWx0ZXIgZm9yIHVuYXV0aG9yaXplZCBhY2Nlc3MgYXR0ZW1wdHNcbiAgICBjb25zdCB1bmF1dGhvcml6ZWRBY2Nlc3NGaWx0ZXIgPSB0aGlzLmxvZ0dyb3VwLmFkZE1ldHJpY0ZpbHRlcignVW5hdXRob3JpemVkQWNjZXNzTWV0cmljRmlsdGVyJywge1xuICAgICAgZmlsdGVyUGF0dGVybjogbG9ncy5GaWx0ZXJQYXR0ZXJuLmxpdGVyYWwoJ1t2ZXJzaW9uLCBhY2NvdW50LCB0aW1lLCBpZCwgdHlwZSwgdXNlciwgcmVnaW9uLCBzb3VyY2UsIHNlcnZpY2U9XCJzZWNyZXRzbWFuYWdlclwiLCBhY3Rpb249XCJHZXRTZWNyZXRWYWx1ZVwiLCByZXN1bHQ9XCJGQUlMVVJFXCIsIC4uLl0nKSxcbiAgICAgIG1ldHJpY05hbWVzcGFjZTogJ1NpZ25hbDlBZHZpc29yL1NlY3JldHMnLFxuICAgICAgbWV0cmljTmFtZTogJ1VuYXV0aG9yaXplZEFjY2VzcycsXG4gICAgICBtZXRyaWNWYWx1ZTogJzEnLFxuICAgICAgZGVmYXVsdFZhbHVlOiAwXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgbWV0cmljIGZpbHRlciBmb3IgaGlnaCB2b2x1bWUgYWNjZXNzXG4gICAgY29uc3QgaGlnaFZvbHVtZUFjY2Vzc0ZpbHRlciA9IHRoaXMubG9nR3JvdXAuYWRkTWV0cmljRmlsdGVyKCdIaWdoVm9sdW1lQWNjZXNzTWV0cmljRmlsdGVyJywge1xuICAgICAgZmlsdGVyUGF0dGVybjogbG9ncy5GaWx0ZXJQYXR0ZXJuLnN0cmluZ1ZhbHVlKCckLmV2ZW50TmFtZScsICc9JywgJ0dldFNlY3JldFZhbHVlJyksXG4gICAgICBtZXRyaWNOYW1lc3BhY2U6ICdTaWduYWw5QWR2aXNvci9TZWNyZXRzJyxcbiAgICAgIG1ldHJpY05hbWU6ICdTZWNyZXRBY2Nlc3NDb3VudCcsXG4gICAgICBtZXRyaWNWYWx1ZTogJzEnLFxuICAgICAgZGVmYXVsdFZhbHVlOiAwXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgQ2xvdWRXYXRjaCBhbGFybSBmb3IgdW5hdXRob3JpemVkIGFjY2VzcyBhdHRlbXB0c1xuICAgIHRoaXMudW5hdXRob3JpemVkQWNjZXNzQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnVW5hdXRob3JpemVkU2VjcmV0QWNjZXNzQWxhcm0nLCB7XG4gICAgICBhbGFybU5hbWU6ICdTaWduYWw5QWR2aXNvci1VbmF1dGhvcml6ZWRTZWNyZXRBY2Nlc3MnLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ1VuYXV0aG9yaXplZCBhY2Nlc3MgYXR0ZW1wdHMgdG8gU2lnbmFsOSBBZHZpc29yIHNlY3JldHMgZGV0ZWN0ZWQnLFxuICAgICAgbWV0cmljOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xuICAgICAgICBuYW1lc3BhY2U6ICdTaWduYWw5QWR2aXNvci9TZWNyZXRzJyxcbiAgICAgICAgbWV0cmljTmFtZTogJ1VuYXV0aG9yaXplZEFjY2VzcycsXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSlcbiAgICAgIH0pLFxuICAgICAgdGhyZXNob2xkOiAxLFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9PUl9FUVVBTF9UT19USFJFU0hPTEQsXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcbiAgICAgIGFjdGlvbnNFbmFibGVkOiB0cnVlXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgQ2xvdWRXYXRjaCBhbGFybSBmb3IgaGlnaCB2b2x1bWUgYWNjZXNzXG4gICAgdGhpcy5oaWdoVm9sdW1lQWNjZXNzQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnSGlnaFZvbHVtZVNlY3JldEFjY2Vzc0FsYXJtJywge1xuICAgICAgYWxhcm1OYW1lOiAnU2lnbmFsOUFkdmlzb3ItSGlnaFZvbHVtZVNlY3JldEFjY2VzcycsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnSGlnaCB2b2x1bWUgb2Ygc2VjcmV0IGFjY2VzcyBhdHRlbXB0cyBkZXRlY3RlZCAoPjEwIHBlciBtaW51dGUpJyxcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgbmFtZXNwYWNlOiAnU2lnbmFsOUFkdmlzb3IvU2VjcmV0cycsXG4gICAgICAgIG1ldHJpY05hbWU6ICdTZWNyZXRBY2Nlc3NDb3VudCcsXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMSlcbiAgICAgIH0pLFxuICAgICAgdGhyZXNob2xkOiAxMCxcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXG4gICAgICBhY3Rpb25zRW5hYmxlZDogdHJ1ZVxuICAgIH0pO1xuXG4gICAgLy8gQWRkIFNOUyBub3RpZmljYXRpb24gYWN0aW9ucyBpZiB0b3BpYyBpcyBwcm92aWRlZFxuICAgIGlmIChwcm9wcy5ub3RpZmljYXRpb25Ub3BpYykge1xuICAgICAgdGhpcy51bmF1dGhvcml6ZWRBY2Nlc3NBbGFybS5hZGRBbGFybUFjdGlvbihcbiAgICAgICAgbmV3IGN3YWN0aW9ucy5TbnNBY3Rpb24ocHJvcHMubm90aWZpY2F0aW9uVG9waWMpXG4gICAgICApO1xuICAgICAgdGhpcy5oaWdoVm9sdW1lQWNjZXNzQWxhcm0uYWRkQWxhcm1BY3Rpb24oXG4gICAgICAgIG5ldyBjd2FjdGlvbnMuU25zQWN0aW9uKHByb3BzLm5vdGlmaWNhdGlvblRvcGljKVxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgY3VzdG9tIG1ldHJpY3MgZm9yIHNlY3JldCBvcGVyYXRpb25zXG4gICAgdGhpcy5jcmVhdGVDdXN0b21NZXRyaWNzKCk7XG5cbiAgICAvLyBBZGQgcmVzb3VyY2UgdGFnc1xuICAgIGNkay5UYWdzLm9mKHRoaXMuY2xvdWRUcmFpbCkuYWRkKCdQcm9qZWN0JywgJ1NpZ25hbDlBZHZpc29yJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5jbG91ZFRyYWlsKS5hZGQoJ0NvbXBvbmVudCcsICdTZWNyZXRzTW9uaXRvcmluZycpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMudHJhaWxCdWNrZXQpLmFkZCgnUHJvamVjdCcsICdTaWduYWw5QWR2aXNvcicpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMudHJhaWxCdWNrZXQpLmFkZCgnQ29tcG9uZW50JywgJ1NlY3JldHNNb25pdG9yaW5nJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5sb2dHcm91cCkuYWRkKCdQcm9qZWN0JywgJ1NpZ25hbDlBZHZpc29yJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5sb2dHcm91cCkuYWRkKCdDb21wb25lbnQnLCAnU2VjcmV0c01vbml0b3JpbmcnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYWRkaXRpb25hbCBjdXN0b20gbWV0cmljcyBmb3IgbW9uaXRvcmluZ1xuICAgKi9cbiAgcHJpdmF0ZSBjcmVhdGVDdXN0b21NZXRyaWNzKCk6IHZvaWQge1xuICAgIC8vIE1ldHJpYyBmaWx0ZXIgZm9yIHNlY3JldCByb3RhdGlvbiBldmVudHNcbiAgICB0aGlzLmxvZ0dyb3VwLmFkZE1ldHJpY0ZpbHRlcignU2VjcmV0Um90YXRpb25NZXRyaWNGaWx0ZXInLCB7XG4gICAgICBmaWx0ZXJQYXR0ZXJuOiBsb2dzLkZpbHRlclBhdHRlcm4uc3RyaW5nVmFsdWUoJyQuZXZlbnROYW1lJywgJz0nLCAnUm90YXRlU2VjcmV0JyksXG4gICAgICBtZXRyaWNOYW1lc3BhY2U6ICdTaWduYWw5QWR2aXNvci9TZWNyZXRzJyxcbiAgICAgIG1ldHJpY05hbWU6ICdTZWNyZXRSb3RhdGlvbkNvdW50JyxcbiAgICAgIG1ldHJpY1ZhbHVlOiAnMScsXG4gICAgICBkZWZhdWx0VmFsdWU6IDBcbiAgICB9KTtcblxuICAgIC8vIE1ldHJpYyBmaWx0ZXIgZm9yIHNlY3JldCBjcmVhdGlvbi91cGRhdGUgZXZlbnRzXG4gICAgdGhpcy5sb2dHcm91cC5hZGRNZXRyaWNGaWx0ZXIoJ1NlY3JldFVwZGF0ZU1ldHJpY0ZpbHRlcicsIHtcbiAgICAgIGZpbHRlclBhdHRlcm46IGxvZ3MuRmlsdGVyUGF0dGVybi5hbnkoXG4gICAgICAgIGxvZ3MuRmlsdGVyUGF0dGVybi5zdHJpbmdWYWx1ZSgnJC5ldmVudE5hbWUnLCAnPScsICdDcmVhdGVTZWNyZXQnKSxcbiAgICAgICAgbG9ncy5GaWx0ZXJQYXR0ZXJuLnN0cmluZ1ZhbHVlKCckLmV2ZW50TmFtZScsICc9JywgJ1VwZGF0ZVNlY3JldCcpXG4gICAgICApLFxuICAgICAgbWV0cmljTmFtZXNwYWNlOiAnU2lnbmFsOUFkdmlzb3IvU2VjcmV0cycsXG4gICAgICBtZXRyaWNOYW1lOiAnU2VjcmV0VXBkYXRlQ291bnQnLFxuICAgICAgbWV0cmljVmFsdWU6ICcxJyxcbiAgICAgIGRlZmF1bHRWYWx1ZTogMFxuICAgIH0pO1xuXG4gICAgLy8gTWV0cmljIGZpbHRlciBmb3IgYWNjZXNzIGJ5IHNvdXJjZSBJUCAoZm9yIGdlb2dyYXBoaWMgbW9uaXRvcmluZylcbiAgICB0aGlzLmxvZ0dyb3VwLmFkZE1ldHJpY0ZpbHRlcignQWNjZXNzQnlSZWdpb25NZXRyaWNGaWx0ZXInLCB7XG4gICAgICBmaWx0ZXJQYXR0ZXJuOiBsb2dzLkZpbHRlclBhdHRlcm4uc3RyaW5nVmFsdWUoJyQuZXZlbnROYW1lJywgJz0nLCAnR2V0U2VjcmV0VmFsdWUnKSxcbiAgICAgIG1ldHJpY05hbWVzcGFjZTogJ1NpZ25hbDlBZHZpc29yL1NlY3JldHMnLFxuICAgICAgbWV0cmljTmFtZTogJ0FjY2Vzc0J5UmVnaW9uJyxcbiAgICAgIG1ldHJpY1ZhbHVlOiAnMScsXG4gICAgICBkZWZhdWx0VmFsdWU6IDBcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBDbG91ZFdhdGNoIGRhc2hib2FyZCBmb3IgbW9uaXRvcmluZyBzZWNyZXRzXG4gICAqL1xuICBjcmVhdGVNb25pdG9yaW5nRGFzaGJvYXJkKCk6IGNsb3Vkd2F0Y2guRGFzaGJvYXJkIHtcbiAgICBjb25zdCBkYXNoYm9hcmQgPSBuZXcgY2xvdWR3YXRjaC5EYXNoYm9hcmQodGhpcywgJ1NlY3JldHNNb25pdG9yaW5nRGFzaGJvYXJkJywge1xuICAgICAgZGFzaGJvYXJkTmFtZTogJ1NpZ25hbDlBZHZpc29yLVNlY3JldHNNb25pdG9yaW5nJyxcbiAgICAgIHdpZGdldHM6IFtcbiAgICAgICAgW1xuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcbiAgICAgICAgICAgIHRpdGxlOiAnU2VjcmV0IEFjY2VzcyBWb2x1bWUnLFxuICAgICAgICAgICAgbGVmdDogW1xuICAgICAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xuICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ1NpZ25hbDlBZHZpc29yL1NlY3JldHMnLFxuICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdTZWNyZXRBY2Nlc3NDb3VudCcsXG4gICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcbiAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2lkdGg6IDEyLFxuICAgICAgICAgICAgaGVpZ2h0OiA2XG4gICAgICAgICAgfSlcbiAgICAgICAgXSxcbiAgICAgICAgW1xuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcbiAgICAgICAgICAgIHRpdGxlOiAnVW5hdXRob3JpemVkIEFjY2VzcyBBdHRlbXB0cycsXG4gICAgICAgICAgICBsZWZ0OiBbXG4gICAgICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnU2lnbmFsOUFkdmlzb3IvU2VjcmV0cycsXG4gICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ1VuYXV0aG9yaXplZEFjY2VzcycsXG4gICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcbiAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2lkdGg6IDEyLFxuICAgICAgICAgICAgaGVpZ2h0OiA2XG4gICAgICAgICAgfSlcbiAgICAgICAgXSxcbiAgICAgICAgW1xuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLlNpbmdsZVZhbHVlV2lkZ2V0KHtcbiAgICAgICAgICAgIHRpdGxlOiAnVG90YWwgU2VjcmV0IEFjY2Vzc2VzICgyNGgpJyxcbiAgICAgICAgICAgIG1ldHJpY3M6IFtcbiAgICAgICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdTaWduYWw5QWR2aXNvci9TZWNyZXRzJyxcbiAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnU2VjcmV0QWNjZXNzQ291bnQnLFxuICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXG4gICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24uaG91cnMoMjQpXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2lkdGg6IDYsXG4gICAgICAgICAgICBoZWlnaHQ6IDNcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5TaW5nbGVWYWx1ZVdpZGdldCh7XG4gICAgICAgICAgICB0aXRsZTogJ0ZhaWxlZCBBY2Nlc3MgQXR0ZW1wdHMgKDI0aCknLFxuICAgICAgICAgICAgbWV0cmljczogW1xuICAgICAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xuICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ1NpZ25hbDlBZHZpc29yL1NlY3JldHMnLFxuICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdVbmF1dGhvcml6ZWRBY2Nlc3MnLFxuICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXG4gICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24uaG91cnMoMjQpXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2lkdGg6IDYsXG4gICAgICAgICAgICBoZWlnaHQ6IDNcbiAgICAgICAgICB9KVxuICAgICAgICBdXG4gICAgICBdXG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGFzaGJvYXJkO1xuICB9XG59ICJdfQ==
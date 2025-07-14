import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface CloudWatchConstructProps {
  config: EnvironmentConfig;
  api?: apigateway.RestApi;
  lambdaFunctions?: lambda.Function[];
  vpc?: ec2.Vpc;
}

export class CloudWatchConstruct extends Construct {
  private _apiLogGroup?: logs.LogGroup;
  private _lambdaLogGroups: logs.LogGroup[];
  private _vpcFlowLogGroup?: logs.LogGroup;
  private _applicationLogGroup!: logs.LogGroup;
  private _dashboard!: cloudwatch.Dashboard;
  private _alarms: cloudwatch.Alarm[];

  constructor(scope: Construct, id: string, props: CloudWatchConstructProps) {
    super(scope, id);

    const { config, api, lambdaFunctions = [], vpc } = props;

    // Initialize arrays for log groups and alarms
    this._lambdaLogGroups = [];
    this._alarms = [];

    // Create log groups
    this.createLogGroups(config, api, lambdaFunctions, vpc);

    // Create custom metrics and alarms
    this.createAlarmsAndMetrics(config, api, lambdaFunctions);

    // Create CloudWatch dashboard
    this.createDashboard(config, api, lambdaFunctions);

    // Add tags to all resources
    this.addTags(config);
  }

  // Getters for public access
  public get apiLogGroup(): logs.LogGroup | undefined {
    return this._apiLogGroup;
  }

  public get lambdaLogGroups(): logs.LogGroup[] {
    return this._lambdaLogGroups;
  }

  public get vpcFlowLogGroup(): logs.LogGroup | undefined {
    return this._vpcFlowLogGroup;
  }

  public get applicationLogGroup(): logs.LogGroup {
    return this._applicationLogGroup;
  }

  public get dashboard(): cloudwatch.Dashboard {
    return this._dashboard;
  }

  public get alarms(): cloudwatch.Alarm[] {
    return this._alarms;
  }

  private createLogGroups(
    config: EnvironmentConfig,
    api?: apigateway.RestApi,
    lambdaFunctions?: lambda.Function[],
    vpc?: ec2.Vpc
  ) {
    // API Gateway access log group
    if (api) {
      this._apiLogGroup = new logs.LogGroup(this, 'ApiLogGroup', {
        logGroupName: `/aws/apigateway/signal9-${config.stage}`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      // Grant API Gateway permissions to write to the log group
      this._apiLogGroup.grantWrite(new iam.ServicePrincipal('apigateway.amazonaws.com'));
    }

    // Lambda function log groups
    if (lambdaFunctions) {
      lambdaFunctions.forEach((fn, index) => {
        const logGroup = new logs.LogGroup(this, `Lambda${index}LogGroup`, {
          logGroupName: `/aws/lambda/${fn.functionName}`,
          retention: logs.RetentionDays.ONE_MONTH,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        this._lambdaLogGroups.push(logGroup);
      });
    }

    // VPC Flow Logs log group
    if (vpc) {
      this._vpcFlowLogGroup = new logs.LogGroup(this, 'VpcFlowLogGroup', {
        logGroupName: `/aws/vpc/flowlogs/signal9-${config.stage}`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      // Create VPC Flow Logs
      new ec2.FlowLog(this, 'VpcFlowLog', {
        resourceType: ec2.FlowLogResourceType.fromVpc(vpc),
        destination: ec2.FlowLogDestination.toCloudWatchLogs(this._vpcFlowLogGroup),
        trafficType: ec2.FlowLogTrafficType.ALL,
      });
    }

    // Application log group for custom application logs
    this._applicationLogGroup = new logs.LogGroup(this, 'ApplicationLogGroup', {
      logGroupName: `/signal9/application/${config.stage}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }

  private createAlarmsAndMetrics(
    config: EnvironmentConfig,
    api?: apigateway.RestApi,
    lambdaFunctions?: lambda.Function[]
  ) {
    // API Gateway alarms
    if (api) {
      // High error rate alarm
      const errorRateAlarm = new cloudwatch.Alarm(this, 'ApiHighErrorRate', {
        alarmName: `Signal9-${config.stage}-Api-HighErrorRate`,
        alarmDescription: 'API Gateway error rate is too high',
        metric: api.metricClientError().with({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 10,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });
      this._alarms.push(errorRateAlarm);

      // API latency alarm
      const latencyAlarm = new cloudwatch.Alarm(this, 'ApiHighLatency', {
        alarmName: `Signal9-${config.stage}-Api-HighLatency`,
        alarmDescription: 'API Gateway latency is too high',
        metric: api.metricLatency().with({
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5000, // 5 seconds
        evaluationPeriods: 3,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });
      this._alarms.push(latencyAlarm);

      // API throttle alarm
      const throttleAlarm = new cloudwatch.Alarm(this, 'ApiThrottling', {
        alarmName: `Signal9-${config.stage}-Api-Throttling`,
        alarmDescription: 'API Gateway requests are being throttled',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'ThrottledRequests',
          dimensionsMap: {
            ApiName: api.restApiName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });
      this._alarms.push(throttleAlarm);
    }

    // Lambda function alarms
    if (lambdaFunctions) {
      lambdaFunctions.forEach((fn, index) => {
        // Lambda error rate alarm
        const lambdaErrorAlarm = new cloudwatch.Alarm(this, `Lambda${index}ErrorRate`, {
          alarmName: `Signal9-${config.stage}-Lambda-${fn.functionName}-ErrorRate`,
          alarmDescription: `Lambda function ${fn.functionName} error rate is too high`,
          metric: fn.metricErrors().with({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
          threshold: 5,
          evaluationPeriods: 2,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        });
        this._alarms.push(lambdaErrorAlarm);

        // Lambda duration alarm
        const lambdaDurationAlarm = new cloudwatch.Alarm(this, `Lambda${index}Duration`, {
          alarmName: `Signal9-${config.stage}-Lambda-${fn.functionName}-Duration`,
          alarmDescription: `Lambda function ${fn.functionName} duration is too high`,
          metric: fn.metricDuration().with({
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
          threshold: 30000, // 30 seconds
          evaluationPeriods: 3,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        });
        this._alarms.push(lambdaDurationAlarm);

        // Lambda throttle alarm
        const lambdaThrottleAlarm = new cloudwatch.Alarm(this, `Lambda${index}Throttle`, {
          alarmName: `Signal9-${config.stage}-Lambda-${fn.functionName}-Throttle`,
          alarmDescription: `Lambda function ${fn.functionName} is being throttled`,
          metric: fn.metricThrottles().with({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
          threshold: 1,
          evaluationPeriods: 1,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        });
        this._alarms.push(lambdaThrottleAlarm);
      });
    }

    // Custom metrics for data ingestion monitoring
    this.createDataIngestionMetrics(config);
  }

  private createDataIngestionMetrics(config: EnvironmentConfig) {
    // Custom metric for data ingestion success
    const dataIngestionSuccessMetric = new cloudwatch.Metric({
      namespace: 'Signal9/DataIngestion',
      metricName: 'SuccessfulIngestion',
      dimensionsMap: {
        Environment: config.stage,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(15),
    });

    // Custom metric for data ingestion failures
    const dataIngestionFailureMetric = new cloudwatch.Metric({
      namespace: 'Signal9/DataIngestion',
      metricName: 'FailedIngestion',
      dimensionsMap: {
        Environment: config.stage,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(15),
    });

    // Alarm for failed data ingestion
    const dataIngestionFailureAlarm = new cloudwatch.Alarm(this, 'DataIngestionFailure', {
      alarmName: `Signal9-${config.stage}-DataIngestion-Failure`,
      alarmDescription: 'Data ingestion failures detected',
      metric: dataIngestionFailureMetric,
      threshold: 3,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
    this._alarms.push(dataIngestionFailureAlarm);

    // Custom metric for user activity
    const userActivityMetric = new cloudwatch.Metric({
      namespace: 'Signal9/UserActivity',
      metricName: 'ActiveUsers',
      dimensionsMap: {
        Environment: config.stage,
      },
      statistic: 'Average',
      period: cdk.Duration.hours(1),
    });
  }

  private createDashboard(
    config: EnvironmentConfig,
    api?: apigateway.RestApi,
    lambdaFunctions?: lambda.Function[]
  ) {
    const widgets: cloudwatch.IWidget[] = [];

    // API Gateway widgets
    if (api) {
      widgets.push(
        new cloudwatch.GraphWidget({
          title: 'API Gateway Requests',
          left: [
            api.metricCount().with({
              label: 'Total Requests',
              statistic: 'Sum',
            }),
          ],
          right: [
            api.metricClientError().with({
              label: 'Client Errors',
              statistic: 'Sum',
            }),
            api.metricServerError().with({
              label: 'Server Errors',
              statistic: 'Sum',
            }),
          ],
          width: 12,
          height: 6,
        })
      );

      widgets.push(
        new cloudwatch.GraphWidget({
          title: 'API Gateway Latency',
          left: [
            api.metricLatency().with({
              label: 'Latency',
              statistic: 'Average',
            }),
          ],
          width: 12,
          height: 6,
        })
      );
    }

    // Lambda widgets
    if (lambdaFunctions && lambdaFunctions.length > 0) {
      const lambdaInvocations = lambdaFunctions.map((fn, index) =>
        fn.metricInvocations().with({
          label: `${fn.functionName} Invocations`,
          statistic: 'Sum',
        })
      );

      const lambdaErrors = lambdaFunctions.map((fn, index) =>
        fn.metricErrors().with({
          label: `${fn.functionName} Errors`,
          statistic: 'Sum',
        })
      );

      const lambdaDurations = lambdaFunctions.map((fn, index) =>
        fn.metricDuration().with({
          label: `${fn.functionName} Duration`,
          statistic: 'Average',
        })
      );

      widgets.push(
        new cloudwatch.GraphWidget({
          title: 'Lambda Invocations',
          left: lambdaInvocations,
          right: lambdaErrors,
          width: 12,
          height: 6,
        })
      );

      widgets.push(
        new cloudwatch.GraphWidget({
          title: 'Lambda Duration',
          left: lambdaDurations,
          width: 12,
          height: 6,
        })
      );
    }

    // Custom metrics widgets
    widgets.push(
      new cloudwatch.GraphWidget({
        title: 'Data Ingestion Metrics',
        left: [
          new cloudwatch.Metric({
            namespace: 'Signal9/DataIngestion',
            metricName: 'SuccessfulIngestion',
            dimensionsMap: {
              Environment: config.stage,
            },
            statistic: 'Sum',
            label: 'Successful Ingestion',
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'Signal9/DataIngestion',
            metricName: 'FailedIngestion',
            dimensionsMap: {
              Environment: config.stage,
            },
            statistic: 'Sum',
            label: 'Failed Ingestion',
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    widgets.push(
      new cloudwatch.GraphWidget({
        title: 'User Activity',
        left: [
          new cloudwatch.Metric({
            namespace: 'Signal9/UserActivity',
            metricName: 'ActiveUsers',
            dimensionsMap: {
              Environment: config.stage,
            },
            statistic: 'Average',
            label: 'Active Users',
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    // Create the dashboard
    this._dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `Signal9-${config.stage}-Dashboard`,
      widgets: [widgets],
    });
  }

  private addTags(config: EnvironmentConfig) {
    cdk.Tags.of(this).add('Project', 'Signal9');
    cdk.Tags.of(this).add('Environment', config.stage);
    cdk.Tags.of(this).add('Component', 'Monitoring');
  }

  /**
   * Create a custom metric for the application
   */
  public createCustomMetric(
    namespace: string,
    metricName: string,
    dimensions: { [key: string]: string } = {}
  ): cloudwatch.Metric {
    return new cloudwatch.Metric({
      namespace,
      metricName,
      dimensionsMap: dimensions,
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });
  }

  /**
   * Create a custom alarm for the application
   */
  public createCustomAlarm(
    id: string,
    alarmName: string,
    metric: cloudwatch.Metric,
    threshold: number,
    comparisonOperator: cloudwatch.ComparisonOperator = cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
  ): cloudwatch.Alarm {
    const alarm = new cloudwatch.Alarm(this, id, {
      alarmName,
      metric,
      threshold,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator,
    });

    this._alarms.push(alarm);
    return alarm;
  }

  /**
   * Create a metric filter for a log group
   */
  public createMetricFilter(
    logGroup: logs.LogGroup,
    filterName: string,
    filterPattern: logs.IFilterPattern,
    metricNamespace: string,
    metricName: string,
    defaultValue?: number
  ): logs.MetricFilter {
    return new logs.MetricFilter(this, filterName, {
      logGroup,
      filterPattern,
      metricNamespace,
      metricName,
      defaultValue,
    });
  }
} 
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface ApiGatewayConstructProps {
  config: EnvironmentConfig;
}

export class ApiGatewayConstruct extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly v1Resource: apigateway.Resource;
  public readonly usersResource: apigateway.Resource;
  public readonly assetsResource: apigateway.Resource;
  public readonly searchResource: apigateway.Resource;
  public readonly newsResource: apigateway.Resource;
  public readonly financialsResource: apigateway.Resource;

  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
    super(scope, id);

    const { config } = props;

    this.api = new apigateway.RestApi(this, 'Signal9Api', {
      restApiName: `Signal9-API-${config.stage}`,
      description: 'Signal9 Advisor API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key']
      },
      deployOptions: {
        stageName: config.stage,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true
      },
      cloudWatchRole: true
    });

    const apiResource = this.api.root.addResource('api');
    this.v1Resource = apiResource.addResource('v1');

    this.usersResource = this.v1Resource.addResource('users');
    this.assetsResource = this.v1Resource.addResource('assets');
    this.searchResource = this.v1Resource.addResource('search');
    this.newsResource = this.v1Resource.addResource('news');
    this.financialsResource = this.v1Resource.addResource('financials');

    const usagePlan = this.api.addUsagePlan('Signal9UsagePlan', {
      name: `Signal9-UsagePlan-${config.stage}`,
      description: 'Usage plan for Signal9 API',
      throttle: {
        rateLimit: 1000,
        burstLimit: 2000
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.DAY
      }
    });

    const apiKey = this.api.addApiKey('Signal9ApiKey', {
      apiKeyName: `Signal9-ApiKey-${config.stage}`,
      description: 'API key for Signal9 API'
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: this.api.deploymentStage
    });

    cdk.Tags.of(this.api).add('Name', `Signal9-API-${config.stage}`);
    cdk.Tags.of(this.api).add('Project', 'Signal9');
    cdk.Tags.of(this.api).add('Environment', config.stage);
    cdk.Tags.of(this.api).add('Purpose', 'RestApi');
  }
}

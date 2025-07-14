import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface WafConstructProps {
  config: EnvironmentConfig;
  apiGatewayArn: string;
}

export class WafConstruct extends Construct {
  public readonly webAcl: wafv2.CfnWebACL;
  public readonly webAclAssociation: wafv2.CfnWebACLAssociation;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: WafConstructProps) {
    super(scope, id);

    const { config, apiGatewayArn } = props;

    // Create CloudWatch log group for WAF logs
    this.logGroup = new logs.LogGroup(this, 'WafLogGroup', {
      logGroupName: `/aws/waf/${config.stage}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Create WAF Web ACL
    this.webAcl = new wafv2.CfnWebACL(this, 'Signal9WebAcl', {
      name: `Signal9-WebACL-${config.stage}`,
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      description: 'WAF Web ACL for Signal9 API Gateway',
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `Signal9WebAcl${config.stage}`
      },
      rules: [
        // Rate limiting rule
        {
          name: 'RateLimitRule',
          priority: 1,
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: 'IP'
            }
          },
          action: { block: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule'
          }
        },
        // AWS managed rule for SQL injection protection
        {
          name: 'AWSManagedRulesSQLiRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet'
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesSQLiRuleSet'
          }
        },
        // AWS managed rule for XSS protection
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 3,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet'
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesCommonRuleSet'
          }
        },
        // AWS managed rule for known bad inputs
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 4,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet'
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesKnownBadInputsRuleSet'
          }
        },
        // Geographic restriction rule (example: block traffic from high-risk countries)
        {
          name: 'GeographicRestrictionRule',
          priority: 5,
          statement: {
            geoMatchStatement: {
              countryCodes: ['CN', 'RU', 'KP', 'IR'] // High-risk countries
            }
          },
          action: { block: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'GeographicRestrictionRule'
          }
        },
        // IP reputation rule
        {
          name: 'AWSManagedRulesAmazonIpReputationList',
          priority: 6,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesAmazonIpReputationList'
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesAmazonIpReputationList'
          }
        }
      ]
    });

    // Associate WAF with API Gateway
    this.webAclAssociation = new wafv2.CfnWebACLAssociation(this, 'WebAclAssociation', {
      resourceArn: apiGatewayArn,
      webAclArn: this.webAcl.attrArn
    });

    // Configure WAF logging
    new wafv2.CfnLoggingConfiguration(this, 'WafLoggingConfiguration', {
      resourceArn: this.webAcl.attrArn,
      logDestinationConfigs: [this.logGroup.logGroupArn]
    });

    // Add tags
    cdk.Tags.of(this.webAcl).add('Name', `Signal9-WebACL-${config.stage}`);
    cdk.Tags.of(this.webAcl).add('Project', 'Signal9');
    cdk.Tags.of(this.webAcl).add('Environment', config.stage);
    cdk.Tags.of(this.webAcl).add('Purpose', 'WebApplicationFirewall');

    cdk.Tags.of(this.logGroup).add('Name', `Signal9-WAF-LogGroup-${config.stage}`);
    cdk.Tags.of(this.logGroup).add('Project', 'Signal9');
    cdk.Tags.of(this.logGroup).add('Environment', config.stage);
    cdk.Tags.of(this.logGroup).add('Purpose', 'WAFLogging');
  }
} 
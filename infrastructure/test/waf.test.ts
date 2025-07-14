import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { Signal9Stack } from '../lib/stacks/signal9-stack';
import { getConfig } from '../lib/config/environment';

describe('WAF Infrastructure', () => {
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

  test('WAF Web ACL is created with correct configuration', () => {
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Scope: 'REGIONAL',
      DefaultAction: {
        Allow: {}
      },
      Description: 'WAF Web ACL for Signal9 API Gateway',
      VisibilityConfig: {
        SampledRequestsEnabled: true,
        CloudWatchMetricsEnabled: true,
        MetricName: 'Signal9WebAcldev'
      }
    });
  });

  test('WAF contains rate limiting rule', () => {
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: 'RateLimitRule',
          Priority: 1,
          Statement: {
            RateBasedStatement: {
              Limit: 2000,
              AggregateKeyType: 'IP'
            }
          },
          Action: {
            Block: {}
          },
          VisibilityConfig: {
            SampledRequestsEnabled: true,
            CloudWatchMetricsEnabled: true,
            MetricName: 'RateLimitRule'
          }
        })
      ])
    });
  });

  test('WAF contains SQL injection protection rule', () => {
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: 'AWSManagedRulesSQLiRuleSet',
          Priority: 2,
          OverrideAction: {
            None: {}
          },
          Statement: {
            ManagedRuleGroupStatement: {
              VendorName: 'AWS',
              Name: 'AWSManagedRulesSQLiRuleSet'
            }
          },
          VisibilityConfig: {
            SampledRequestsEnabled: true,
            CloudWatchMetricsEnabled: true,
            MetricName: 'AWSManagedRulesSQLiRuleSet'
          }
        })
      ])
    });
  });

  test('WAF contains XSS protection rule', () => {
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: 'AWSManagedRulesCommonRuleSet',
          Priority: 3,
          OverrideAction: {
            None: {}
          },
          Statement: {
            ManagedRuleGroupStatement: {
              VendorName: 'AWS',
              Name: 'AWSManagedRulesCommonRuleSet'
            }
          },
          VisibilityConfig: {
            SampledRequestsEnabled: true,
            CloudWatchMetricsEnabled: true,
            MetricName: 'AWSManagedRulesCommonRuleSet'
          }
        })
      ])
    });
  });

  test('WAF contains known bad inputs protection rule', () => {
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: 'AWSManagedRulesKnownBadInputsRuleSet',
          Priority: 4,
          OverrideAction: {
            None: {}
          },
          Statement: {
            ManagedRuleGroupStatement: {
              VendorName: 'AWS',
              Name: 'AWSManagedRulesKnownBadInputsRuleSet'
            }
          },
          VisibilityConfig: {
            SampledRequestsEnabled: true,
            CloudWatchMetricsEnabled: true,
            MetricName: 'AWSManagedRulesKnownBadInputsRuleSet'
          }
        })
      ])
    });
  });

  test('WAF contains geographic restriction rule', () => {
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: 'GeographicRestrictionRule',
          Priority: 5,
          Statement: {
            GeoMatchStatement: {
              CountryCodes: ['CN', 'RU', 'KP', 'IR']
            }
          },
          Action: {
            Block: {}
          },
          VisibilityConfig: {
            SampledRequestsEnabled: true,
            CloudWatchMetricsEnabled: true,
            MetricName: 'GeographicRestrictionRule'
          }
        })
      ])
    });
  });

  test('WAF contains IP reputation rule', () => {
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: 'AWSManagedRulesAmazonIpReputationList',
          Priority: 6,
          OverrideAction: {
            None: {}
          },
          Statement: {
            ManagedRuleGroupStatement: {
              VendorName: 'AWS',
              Name: 'AWSManagedRulesAmazonIpReputationList'
            }
          },
          VisibilityConfig: {
            SampledRequestsEnabled: true,
            CloudWatchMetricsEnabled: true,
            MetricName: 'AWSManagedRulesAmazonIpReputationList'
          }
        })
      ])
    });
  });

  test('WAF Web ACL is associated with API Gateway', () => {
    template.hasResourceProperties('AWS::WAFv2::WebACLAssociation', {
      WebACLArn: {
        'Fn::GetAtt': [
          Match.stringLikeRegexp('.*Signal9WebAcl.*'),
          'Arn'
        ]
      },
      ResourceArn: {
        'Fn::Join': [
          '',
          Match.arrayWith([
            'arn:',
            { 'Ref': 'AWS::Partition' },
            ':apigateway:us-east-1::/restapis/',
            { 'Ref': Match.stringLikeRegexp('.*Signal9Api.*') },
            '/stages/',
            { 'Ref': Match.stringLikeRegexp('.*dev.*') }
          ])
        ]
      }
    });
  });

  test('WAF logging is configured', () => {
    template.hasResourceProperties('AWS::WAFv2::LoggingConfiguration', {
      ResourceArn: {
        'Fn::GetAtt': [
          Match.stringLikeRegexp('.*Signal9WebAcl.*'),
          'Arn'
        ]
      },
      LogDestinationConfigs: [
        {
          'Fn::GetAtt': [
            Match.stringLikeRegexp('.*WafLogGroup.*'),
            'Arn'
          ]
        }
      ]
    });
  });

  test('WAF log group is created with correct retention', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/aws/waf/dev',
      RetentionInDays: 30
    });
  });

  test('WAF resources are properly tagged', () => {
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Tags: Match.arrayWith([
        {
          Key: 'Name',
          Value: 'Signal9-WebACL-dev'
        },
        {
          Key: 'Project',
          Value: 'Signal9'
        },
        {
          Key: 'Purpose',
          Value: 'WebApplicationFirewall'
        }
      ])
    });
  });

  test('VPC endpoints are created for AWS services', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: {
        'Fn::Join': [
          '',
          [
            'com.amazonaws.',
            { 'Ref': 'AWS::Region' },
            '.s3'
          ]
        ]
      },
      VpcEndpointType: 'Gateway'
    });

    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: {
        'Fn::Join': [
          '',
          [
            'com.amazonaws.',
            { 'Ref': 'AWS::Region' },
            '.dynamodb'
          ]
        ]
      },
      VpcEndpointType: 'Gateway'
    });

    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: 'com.amazonaws.us-east-1.secretsmanager',
      VpcEndpointType: 'Interface'
    });
  });

  test('Security groups are created for Lambda functions', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for Lambda functions',
      SecurityGroupEgress: [
        {
          CidrIp: '0.0.0.0/0',
          Description: 'Allow all outbound traffic by default',
          IpProtocol: '-1'
        }
      ]
    });
  });

  test('Security groups are created for VPC endpoints', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for VPC endpoints',
      SecurityGroupIngress: [
        {
          CidrIp: {
            'Fn::GetAtt': [
              Match.stringLikeRegexp('.*Signal9Vpc.*'),
              'CidrBlock'
            ]
          },
          Description: Match.anyValue(),
          FromPort: 443,
          IpProtocol: 'tcp',
          ToPort: 443
        }
      ]
    });
  });

  test('Network ACLs are configured for private subnets', () => {
    template.hasResourceProperties('AWS::EC2::NetworkAcl', {
      Tags: Match.arrayWith([
        {
          Key: 'Name',
          Value: 'Signal9-Private-NACL-dev'
        }
      ])
    });
  });

  test('Network ACL entries allow required traffic', () => {
    template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
      RuleNumber: 100,
      CidrBlock: '10.0.0.0/16',
      RuleAction: 'allow',
      Protocol: 6,
      PortRange: {
        From: 443,
        To: 443
      }
    });

    template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
      RuleNumber: 110,
      CidrBlock: '0.0.0.0/0',
      RuleAction: 'allow',
      Protocol: 6,
      PortRange: {
        From: 1024,
        To: 65535
      }
    });
  });
}); 
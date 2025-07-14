import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { Signal9Stack } from '../lib/stacks/signal9-stack';
import { getConfig } from '../lib/config/environment';

describe('VPC Infrastructure', () => {
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

  test('VPC is created with correct CIDR', () => {
    template.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '10.0.0.0/16',
      EnableDnsHostnames: true,
      EnableDnsSupport: true
    });
  });

  test('Public subnets are created in multiple AZs', () => {
    template.resourceCountIs('AWS::EC2::Subnet', 4);
    
    template.hasResourceProperties('AWS::EC2::Subnet', {
      CidrBlock: '10.0.0.0/24'
    });
    
    template.hasResourceProperties('AWS::EC2::Subnet', {
      CidrBlock: '10.0.1.0/24'
    });
  });

  test('Private subnets are created in multiple AZs', () => {
    template.hasResourceProperties('AWS::EC2::Subnet', {
      CidrBlock: '10.0.2.0/24'
    });
    
    template.hasResourceProperties('AWS::EC2::Subnet', {
      CidrBlock: '10.0.3.0/24'
    });
  });

  test('Internet Gateway is created and attached', () => {
    template.hasResourceProperties('AWS::EC2::InternetGateway', {});
    template.hasResourceProperties('AWS::EC2::VPCGatewayAttachment', {
      InternetGatewayId: Match.anyValue()
    });
  });

  test('NAT Gateways are created in public subnets', () => {
    template.resourceCountIs('AWS::EC2::NatGateway', 2);
  });

  test('Route tables are configured correctly', () => {
    template.hasResourceProperties('AWS::EC2::Route', {
      DestinationCidrBlock: '0.0.0.0/0',
      GatewayId: Match.anyValue()
    });
    
    template.hasResourceProperties('AWS::EC2::Route', {
      DestinationCidrBlock: '0.0.0.0/0',
      NatGatewayId: Match.anyValue()
    });
  });

  test('VPC Flow Logs are enabled', () => {
    template.hasResourceProperties('AWS::EC2::FlowLog', {
      ResourceType: 'VPC',
      TrafficType: 'ALL'
    });
    
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/aws/vpc/flowlogs/dev'
    });
  });

  test('Resources are tagged appropriately', () => {
    template.hasResourceProperties('AWS::EC2::VPC', {
      Tags: Match.arrayWith([
        { Key: 'Project', Value: 'Signal9' }
      ])
    });
    
    template.hasResourceProperties('AWS::EC2::VPC', {
      Tags: Match.arrayWith([
        { Key: 'Environment', Value: 'dev' }
      ])
    });
    
    template.hasResourceProperties('AWS::EC2::VPC', {
      Tags: Match.arrayWith([
        { Key: 'Name', Value: 'Signal9-VPC-dev' }
      ])
    });
  });

  test('VPC works across different environments', () => {
    const testApp = new cdk.App();
    const testConfig = getConfig('test');
    const testStack = new Signal9Stack(testApp, 'TestSignal9StackTest', {
      env: testConfig.env,
      config: testConfig
    });
    const testTemplate = Template.fromStack(testStack);

    testTemplate.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/aws/vpc/flowlogs/test'
    });
  });

  test('Lambda security group is created', () => {
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

  test('VPC endpoint security group is created', () => {
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

  test('Custom Network ACL is created for private subnets', () => {
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

  test('Network ACL is associated with private subnets', () => {
    template.hasResourceProperties('AWS::EC2::SubnetNetworkAclAssociation', {
      SubnetId: {
        Ref: Match.stringLikeRegexp('.*PrivateSubnet.*')
      },
      NetworkAclId: {
        Ref: Match.stringLikeRegexp('.*PrivateNetworkAcl.*')
      }
    });
  });
});

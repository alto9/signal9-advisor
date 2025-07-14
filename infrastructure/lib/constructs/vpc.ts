import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface VpcConstructProps {
  config: EnvironmentConfig;
}

export class VpcConstruct extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly publicSubnets: ec2.ISubnet[];
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;
  public readonly vpcEndpointSecurityGroup: ec2.SecurityGroup;
  public readonly dynamodbVpcEndpoint: ec2.VpcEndpoint;
  public readonly s3VpcEndpoint: ec2.VpcEndpoint;
  public readonly secretsManagerVpcEndpoint: ec2.VpcEndpoint;

  constructor(scope: Construct, id: string, props: VpcConstructProps) {
    super(scope, id);

    const { config } = props;

    this.vpc = new ec2.Vpc(this, 'Signal9Vpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24
        }
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true
    });

    this.publicSubnets = this.vpc.publicSubnets;
    this.privateSubnets = this.vpc.privateSubnets;

    // Create security group for Lambda functions
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true
    });

    // Create security group for VPC endpoints
    this.vpcEndpointSecurityGroup = new ec2.SecurityGroup(this, 'VpcEndpointSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for VPC endpoints',
      allowAllOutbound: false
    });

    // Allow Lambda security group to communicate with VPC endpoints on HTTPS
    this.vpcEndpointSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(443),
      'Allow Lambda functions to access VPC endpoints'
    );

    // Create VPC endpoints for AWS services
    this.s3VpcEndpoint = new ec2.GatewayVpcEndpoint(this, 'S3VpcEndpoint', {
      vpc: this.vpc,
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }]
    });

    this.dynamodbVpcEndpoint = new ec2.GatewayVpcEndpoint(this, 'DynamoDbVpcEndpoint', {
      vpc: this.vpc,
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
      subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }]
    });

    this.secretsManagerVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'SecretsManagerVpcEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [this.vpcEndpointSecurityGroup],
      privateDnsEnabled: true
    });

    // Create custom NACLs for additional network security
    const privateNetworkAcl = new ec2.NetworkAcl(this, 'PrivateNetworkAcl', {
      vpc: this.vpc,
      networkAclName: `Signal9-Private-NACL-${config.stage}`
    });

    // Allow inbound HTTPS traffic from VPC CIDR
    privateNetworkAcl.addEntry('AllowInboundHttpsFromVpc', {
      ruleNumber: 100,
      cidr: ec2.AclCidr.ipv4('10.0.0.0/16'),
      ruleAction: ec2.Action.ALLOW,
      direction: ec2.TrafficDirection.INGRESS,
      traffic: ec2.AclTraffic.tcpPort(443)
    });

    // Allow inbound ephemeral ports for return traffic
    privateNetworkAcl.addEntry('AllowInboundEphemeralPorts', {
      ruleNumber: 110,
      cidr: ec2.AclCidr.anyIpv4(),
      ruleAction: ec2.Action.ALLOW,
      direction: ec2.TrafficDirection.INGRESS,
      traffic: ec2.AclTraffic.tcpPortRange(1024, 65535)
    });

    // Allow outbound HTTPS traffic
    privateNetworkAcl.addEntry('AllowOutboundHttps', {
      ruleNumber: 100,
      cidr: ec2.AclCidr.anyIpv4(),
      ruleAction: ec2.Action.ALLOW,
      direction: ec2.TrafficDirection.EGRESS,
      traffic: ec2.AclTraffic.tcpPort(443)
    });

    // Allow outbound HTTP traffic for package downloads
    privateNetworkAcl.addEntry('AllowOutboundHttp', {
      ruleNumber: 110,
      cidr: ec2.AclCidr.anyIpv4(),
      ruleAction: ec2.Action.ALLOW,
      direction: ec2.TrafficDirection.EGRESS,
      traffic: ec2.AclTraffic.tcpPort(80)
    });

    // Allow outbound ephemeral ports
    privateNetworkAcl.addEntry('AllowOutboundEphemeralPorts', {
      ruleNumber: 120,
      cidr: ec2.AclCidr.anyIpv4(),
      ruleAction: ec2.Action.ALLOW,
      direction: ec2.TrafficDirection.EGRESS,
      traffic: ec2.AclTraffic.tcpPortRange(1024, 65535)
    });

    // Associate private subnets with the custom NACL
    this.privateSubnets.forEach((subnet, index) => {
      new ec2.SubnetNetworkAclAssociation(this, `PrivateSubnetNaclAssociation${index}`, {
        subnet: subnet,
        networkAcl: privateNetworkAcl
      });
    });

    const flowLogGroup = new logs.LogGroup(this, 'VpcFlowLogGroup', {
      logGroupName: `/aws/vpc/flowlogs/${config.stage}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    new ec2.FlowLog(this, 'VpcFlowLog', {
      resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
      destination: ec2.FlowLogDestination.toCloudWatchLogs(flowLogGroup)
    });

    // Add tags
    cdk.Tags.of(this.vpc).add('Name', `Signal9-VPC-${config.stage}`);
    cdk.Tags.of(this.vpc).add('Project', 'Signal9');
    cdk.Tags.of(this.vpc).add('Environment', config.stage);

    cdk.Tags.of(this.lambdaSecurityGroup).add('Name', `Signal9-Lambda-SG-${config.stage}`);
    cdk.Tags.of(this.lambdaSecurityGroup).add('Project', 'Signal9');
    cdk.Tags.of(this.lambdaSecurityGroup).add('Environment', config.stage);
    cdk.Tags.of(this.lambdaSecurityGroup).add('Purpose', 'LambdaSecurityGroup');

    cdk.Tags.of(this.vpcEndpointSecurityGroup).add('Name', `Signal9-VPCEndpoint-SG-${config.stage}`);
    cdk.Tags.of(this.vpcEndpointSecurityGroup).add('Project', 'Signal9');
    cdk.Tags.of(this.vpcEndpointSecurityGroup).add('Environment', config.stage);
    cdk.Tags.of(this.vpcEndpointSecurityGroup).add('Purpose', 'VPCEndpointSecurityGroup');

    cdk.Tags.of(privateNetworkAcl).add('Name', `Signal9-Private-NACL-${config.stage}`);
    cdk.Tags.of(privateNetworkAcl).add('Project', 'Signal9');
    cdk.Tags.of(privateNetworkAcl).add('Environment', config.stage);
    cdk.Tags.of(privateNetworkAcl).add('Purpose', 'PrivateNetworkAcl');
  }
}

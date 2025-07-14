# Phase 1: Data Foundation (MVP) — Work Tickets

## Status: Refinement Complete

---

### 1. CDK Project Structure & Base Configuration: DONE
**Description:** Set up the foundational CDK project structure with proper TypeScript configuration, folder organization, and basic CDK app scaffolding.

**Technical Steps:**
1. Initialize CDK project with TypeScript
2. Set up folder structure:
   ```
   infrastructure/
   ├── lib/
   │   ├── stacks/
   │   ├── constructs/
   │   └── config/
   ├── bin/
   ├── test/
   └── package.json
   ```
3. Configure CDK app entry point in `bin/`
4. Set up environment-specific configuration (dev, test, prod)
5. Configure CDK context for account/region settings

**Pseudocode:**
```typescript
// bin/app.ts
const app = new cdk.App();
const config = getConfig(app.node.tryGetContext('environment') || 'dev');
new Signal9Stack(app, 'Signal9Stack', { env: config.env });
```

**Acceptance Criteria:**
- CDK project compiles without errors
- Environment-specific configs are properly loaded
- Unit tests pass for basic stack instantiation
- CDK synth produces valid CloudFormation

**Testing Requirements:**
- Unit test for stack instantiation
- CDK assertions for basic stack structure
- Environment config validation tests

---

### 2. VPC & Networking Infrastructure: DONE
**Description:** Create VPC with public/private subnets across multiple AZs, NAT gateways, and internet gateway.

**Technical Steps:**
1. Create VPC with CIDR block (e.g., 10.0.0.0/16)
2. Create public subnets in 2+ AZs (10.0.1.0/24, 10.0.2.0/24)
3. Create private subnets in 2+ AZs (10.0.101.0/24, 10.0.102.0/24)
4. Create Internet Gateway and attach to VPC
5. Create NAT Gateways in each public subnet
6. Configure route tables for public/private subnets
7. Add VPC Flow Logs for monitoring

**Pseudocode:**
```typescript
const vpc = new ec2.Vpc(this, 'Signal9Vpc', {
  cidr: '10.0.0.0/16',
  maxAzs: 2,
  subnetConfiguration: [
    { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
    { name: 'Private', subnetType: ec2.SubnetType.PRIVATE_WITH_NAT, cidrMask: 24 }
  ],
  enableDnsHostnames: true,
  enableDnsSupport: true
});
```

**Acceptance Criteria:**
- VPC created with correct CIDR and subnets
- Internet connectivity works from public subnets
- Private subnets can reach internet via NAT
- VPC Flow Logs are enabled
- Resources are tagged appropriately

**Testing Requirements:**
- CDK assertions for VPC structure
- Integration test for internet connectivity
- Unit tests for subnet configuration

---

### 3. DynamoDB Tables Design & Creation: DONE
**Description:** Design and create DynamoDB tables for users, assets, financials, news, and time-series data with proper GSIs and LSIs.

**Technical Steps:**
1. Design table schemas:
   - Users table: PK=userId, attributes for profile, wizard status, topics
   - Assets table: PK=ticker, attributes for company info, metadata
   - Financials table: PK=ticker, SK=reportType#date, financial data
   - News table: PK=ticker, SK=timestamp, news data with sentiment
   - TimeSeries table: PK=ticker#dataType, SK=timestamp, price/volume data
2. Create tables with on-demand billing
3. Add Global Secondary Indexes (GSIs) for query patterns
4. Enable point-in-time recovery
5. Configure encryption at rest

**Pseudocode:**
```typescript
const usersTable = new dynamodb.Table(this, 'UsersTable', {
  partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.ON_DEMAND,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  pointInTimeRecovery: true
});

const assetsTable = new dynamodb.Table(this, 'AssetsTable', {
  partitionKey: { name: 'ticker', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.ON_DEMAND,
  encryption: dynamodb.TableEncryption.AWS_MANAGED
});

// Add GSI for search by company name
assetsTable.addGlobalSecondaryIndex({
  indexName: 'CompanyNameIndex',
  partitionKey: { name: 'companyName', type: dynamodb.AttributeType.STRING }
});
```

**Acceptance Criteria:**
- All tables created with correct schemas
- GSIs support required query patterns
- Encryption and backup are enabled
- Tables are properly tagged

**Testing Requirements:**
- CDK assertions for table structure
- Unit tests for GSI configuration
- Integration tests for basic CRUD operations

---

### 4. S3 Buckets & Storage Configuration: DONE
**Description:** Create S3 buckets for static assets, API response caching, and data backups with proper security and lifecycle policies.

**Technical Steps:**
1. Create buckets:
   - Static assets bucket (for React app)
   - API cache bucket (for raw API responses)
   - Backup bucket (for DynamoDB backups)
2. Configure bucket policies for least privilege access
3. Enable versioning and lifecycle policies
4. Set up CORS for static assets bucket
5. Enable server-side encryption
6. Configure CloudTrail for bucket access logging

**Pseudocode:**
```typescript
const staticAssetsBucket = new s3.Bucket(this, 'StaticAssetsBucket', {
  bucketName: `signal9-static-${stage}`,
  versioned: true,
  encryption: s3.BucketEncryption.S3_MANAGED,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  lifecycleRules: [{
    id: 'DeleteOldVersions',
    noncurrentVersionExpiration: cdk.Duration.days(30)
  }]
});

staticAssetsBucket.addCorsRule({
  allowedMethods: [s3.HttpMethods.GET],
  allowedOrigins: ['https://app.signal9.com'],
  allowedHeaders: ['*']
});
```

**Acceptance Criteria:**
- All buckets created with proper naming
- Security policies prevent unauthorized access
- Lifecycle policies are configured
- CORS is properly set for static assets

**Testing Requirements:**
- CDK assertions for bucket configuration
- Unit tests for bucket policies
- Integration tests for upload/download operations

---

### 5. API Gateway REST API Setup: DONE
**Description:** Create API Gateway with proper resource structure, CORS, authentication, and request/response models.

**Technical Steps:**
1. Create REST API with custom domain
2. Set up resource hierarchy:
   ```
   /api/v1/
   ├── /users
   ├── /assets
   ├── /search
   ├── /news
   └── /financials
   ```
3. Configure CORS for all resources
4. Set up request/response models and validation
5. Add API Gateway logging and monitoring
6. Configure throttling and usage plans

**Pseudocode:**
```typescript
const api = new apigateway.RestApi(this, 'Signal9Api', {
  restApiName: 'Signal9 API',
  description: 'Signal9 Advisor API',
  defaultCorsPreflightOptions: {
    allowOrigins: apigateway.Cors.ALL_ORIGINS,
    allowMethods: apigateway.Cors.ALL_METHODS,
    allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization']
  },
  deployOptions: {
    stageName: stage,
    loggingLevel: apigateway.MethodLoggingLevel.INFO,
    dataTraceEnabled: true
  }
});

const v1 = api.root.addResource('api').addResource('v1');
const usersResource = v1.addResource('users');
const assetsResource = v1.addResource('assets');
```

**Acceptance Criteria:**
- API Gateway created with proper resource structure
- CORS configured for all endpoints
- Logging and monitoring enabled
- Request/response validation configured

**Testing Requirements:**
- CDK assertions for API structure
- Unit tests for resource configuration
- Integration tests for CORS and auth

---

### 6. Lambda Function Base Infrastructure: DONE
**Description:** Set up Lambda function base configuration, layers, and deployment packaging for all API endpoints.

**Technical Steps:**
1. Create Lambda layer for shared dependencies (AWS SDK, utilities)
2. Set up Lambda function configuration template
3. Configure VPC settings for Lambda functions
4. Set up environment variables and secrets access
5. Configure Lambda logging and monitoring
6. Set up dead letter queues for error handling

**Pseudocode:**
```typescript
const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
  code: lambda.Code.fromAsset('lambda-layers/shared'),
  compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
  description: 'Shared utilities and AWS SDK'
});

const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
  ]
});

const baseLambdaProps = {
  runtime: lambda.Runtime.NODEJS_18_X,
  layers: [sharedLayer],
  vpc: vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
  role: lambdaRole,
  environment: {
    USERS_TABLE: usersTable.tableName,
    ASSETS_TABLE: assetsTable.tableName
  }
};
```

**Acceptance Criteria:**
- Shared layer created with common dependencies
- Base Lambda configuration template ready
- VPC and security settings configured
- Environment variables properly set

**Testing Requirements:**
- CDK assertions for Lambda configuration
- Unit tests for layer packaging
- Integration tests for VPC connectivity

---

### 7. Secrets Manager & API Key Storage: DONE
**Description:** Set up AWS Secrets Manager for storing third-party API keys and sensitive configuration.

**Technical Steps:**
1. Create secrets for:
   - AlphaVantage API key
   - Alpaca API key and secret
   - Auth0 client secret
   - Database connection strings (if needed)
2. Configure IAM policies for Lambda access to secrets
3. Set up secret rotation (where applicable)
4. Configure secret versioning

**Pseudocode:**
```typescript
const alphaVantageSecret = new secretsmanager.Secret(this, 'AlphaVantageSecret', {
  secretName: `signal9/alphavantage/${stage}`,
  description: 'AlphaVantage API key',
  generateSecretString: {
    secretStringTemplate: JSON.stringify({ apiKey: '' }),
    generateStringKey: 'apiKey',
    excludeCharacters: '"@/\\'
  }
});

const alpacaSecret = new secretsmanager.Secret(this, 'AlpacaSecret', {
  secretName: `signal9/alpaca/${stage}`,
  description: 'Alpaca API credentials',
  generateSecretString: {
    secretStringTemplate: JSON.stringify({ apiKey: '', secretKey: '' }),
    generateStringKey: 'secretKey'
  }
});

// Grant Lambda functions access to secrets
alphaVantageSecret.grantRead(lambdaRole);
alpacaSecret.grantRead(lambdaRole);
```

**Acceptance Criteria:**
- All API keys stored in Secrets Manager
- IAM policies grant appropriate access
- Secret rotation configured where applicable
- Secrets are properly tagged and organized

**Testing Requirements:**
- CDK assertions for secret configuration
- Unit tests for IAM policy validation
- Integration tests for secret retrieval

---

### 8. EventBridge & Event-Driven Architecture: DONE
**Description:** Set up EventBridge custom bus and rules for data pipeline orchestration and AI enhancement triggers.

**Technical Steps:**
1. Create custom EventBridge bus for Signal9 events
2. Define event schemas for:
   - Asset data updated
   - News sentiment analyzed
   - Financial data ingested
   - User action events
3. Create EventBridge rules for:
   - Daily data polling triggers
   - AI enhancement triggers
   - User notification events
4. Set up dead letter queues for failed events

**Pseudocode:**
```typescript
const eventBus = new events.EventBus(this, 'Signal9EventBus', {
  eventBusName: `signal9-events-${stage}`
});

const dataUpdateRule = new events.Rule(this, 'DataUpdateRule', {
  eventBus: eventBus,
  eventPattern: {
    source: ['signal9.data'],
    detailType: ['Asset Data Updated']
  },
  targets: [new targets.LambdaFunction(aiEnhancementFunction)]
});

const dailyPollingRule = new events.Rule(this, 'DailyPollingRule', {
  schedule: events.Schedule.cron({ hour: '6', minute: '0' }),
  targets: [new targets.LambdaFunction(dataPollingFunction)]
});
```

**Acceptance Criteria:**
- Custom EventBridge bus created
- Event schemas defined and validated
- Rules configured for all event patterns
- Dead letter queues set up for error handling

**Testing Requirements:**
- CDK assertions for EventBridge configuration
- Unit tests for event pattern matching
- Integration tests for event publishing/consuming

---

### 9. CloudWatch Logging & Monitoring Setup: DONE
**Description:** Configure comprehensive logging, metrics, and alerting for all AWS resources.

**Technical Steps:**
1. Create CloudWatch log groups for:
   - API Gateway access logs
   - Lambda function logs
   - VPC Flow Logs
   - Application logs
2. Set up custom metrics for:
   - API response times
   - Error rates
   - Data ingestion success/failure
   - User activity metrics
3. Create CloudWatch alarms for:
   - High error rates
   - API latency thresholds
   - Failed data ingestion
   - Resource utilization
4. Set up CloudWatch dashboard

**Pseudocode:**
```typescript
const apiLogGroup = new logs.LogGroup(this, 'ApiLogGroup', {
  logGroupName: `/aws/apigateway/signal9-${stage}`,
  retention: logs.RetentionDays.ONE_MONTH
});

const errorRateAlarm = new cloudwatch.Alarm(this, 'HighErrorRate', {
  metric: api.metricClientError(),
  threshold: 10,
  evaluationPeriods: 2,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
});

const dashboard = new cloudwatch.Dashboard(this, 'Signal9Dashboard', {
  dashboardName: `Signal9-${stage}`,
  widgets: [
    [new cloudwatch.GraphWidget({
      title: 'API Requests',
      left: [api.metricCount()]
    })]
  ]
});
```

**Acceptance Criteria:**
- All log groups created with proper retention
- Custom metrics are being collected
- Alarms trigger appropriately
- Dashboard shows key metrics

**Testing Requirements:**
- CDK assertions for logging configuration
- Unit tests for metric collection
- Integration tests for alarm triggering

---

### 10. WAF & Security Configuration
**Description:** Set up AWS WAF for API Gateway protection and configure security groups and NACLs.

**Technical Steps:**
1. Create WAF Web ACL with rules for:
   - Rate limiting
   - IP whitelisting/blacklisting
   - SQL injection protection
   - XSS protection
   - Geographic restrictions
2. Associate WAF with API Gateway
3. Configure security groups for Lambda functions
4. Set up VPC endpoints for AWS services
5. Configure NACLs for additional network security

**Pseudocode:**
```typescript
const webAcl = new wafv2.CfnWebACL(this, 'Signal9WebAcl', {
  scope: 'REGIONAL',
  defaultAction: { allow: {} },
  rules: [
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
    }
  ]
});

const webAclAssociation = new wafv2.CfnWebACLAssociation(this, 'WebAclAssociation', {
  resourceArn: api.deploymentStage.stageArn,
  webAclArn: webAcl.attrArn
});
```

**Acceptance Criteria:**
- WAF configured with appropriate rules
- Security groups follow least privilege
- VPC endpoints configured for AWS services
- Network security properly implemented

**Testing Requirements:**
- CDK assertions for WAF configuration
- Unit tests for security group rules
- Integration tests for rate limiting

---

### 11. CloudFront Distribution Setup
**Description:** Configure CloudFront distribution for static asset delivery and API caching.

**Technical Steps:**
1. Create CloudFront distribution with:
   - S3 origin for static assets
   - API Gateway origin for API calls
   - Custom domain configuration
2. Configure caching behaviors:
   - Static assets: long-term caching
   - API responses: short-term caching with cache invalidation
3. Set up SSL certificate via ACM
4. Configure geographic restrictions if needed
5. Set up CloudFront logging

**Pseudocode:**
```typescript
const distribution = new cloudfront.Distribution(this, 'Signal9Distribution', {
  defaultBehavior: {
    origin: new origins.S3Origin(staticAssetsBucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
  },
  additionalBehaviors: {
    '/api/*': {
      origin: new origins.RestApiOrigin(api),
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN
    }
  },
  domainNames: [`app.signal9.com`],
  certificate: certificate
});
```

**Acceptance Criteria:**
- CloudFront distribution serves static assets
- API caching configured appropriately
- SSL certificate properly configured
- Custom domain resolves correctly

**Testing Requirements:**
- CDK assertions for distribution configuration
- Integration tests for content delivery
- Performance tests for caching behavior

---

### 12. Route 53 DNS Configuration
**Description:** Set up Route 53 hosted zone and DNS records for the application domain.

**Technical Steps:**
1. Create Route 53 hosted zone for domain
2. Configure DNS records:
   - A record for app.signal9.com → CloudFront
   - CNAME records for subdomains
   - MX records for email (if needed)
3. Set up health checks for critical endpoints
4. Configure DNS failover (if needed)

**Pseudocode:**
```typescript
const hostedZone = new route53.HostedZone(this, 'Signal9HostedZone', {
  zoneName: 'signal9.com'
});

const aRecord = new route53.ARecord(this, 'AppARecord', {
  zone: hostedZone,
  recordName: 'app',
  target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
});

const healthCheck = new route53.CfnHealthCheck(this, 'ApiHealthCheck', {
  type: 'HTTPS',
  resourcePath: '/api/v1/health',
  fullyQualifiedDomainName: 'app.signal9.com'
});
```

**Acceptance Criteria:**
- Hosted zone created and configured
- DNS records resolve correctly
- Health checks monitor critical endpoints
- DNS propagation completed

**Testing Requirements:**
- CDK assertions for DNS configuration
- Integration tests for domain resolution
- Health check validation tests

---

## Status: Refinement Complete

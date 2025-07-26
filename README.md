# Signal9 Advisor - AWS Infrastructure

This repository contains the AWS CDK infrastructure code for the Signal9 Advisor platform, an AI-powered financial analysis system.

## Architecture Overview

The infrastructure consists of:

- **DynamoDB Tables**: Three core tables for assets, earnings calendar, and analysis queue
- **S3 Bucket**: Secure storage for analysis data with lifecycle policies
- **IAM Roles**: Lambda execution roles with minimal required permissions
- **CloudWatch**: Logging and monitoring infrastructure

## Prerequisites

- Node.js v22+ installed
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed globally: `npm install -g aws-cdk`
- AWS account with sufficient permissions for resource creation

## Project Structure

```
signal9-advisor/
├── bin/
│   └── signal9-advisor.ts          # Main CDK app entry point
├── lib/
│   ├── signal9-advisor-stack.ts    # Main stack definition
│   └── constructs/
│       ├── database-construct.ts   # DynamoDB tables
│       ├── s3-construct.ts         # S3 bucket configuration
│       └── lambda-roles-construct.ts # IAM roles
├── test/
│   └── infrastructure.test.ts      # Unit tests
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── jest.config.js                  # Jest test configuration
├── cdk.json                        # CDK configuration
└── README.md                       # This file
```

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure AWS credentials:
   ```bash
   aws configure
   ```

## Development

### Running Tests

```bash
npm test
```

Tests cover:
- DynamoDB table configurations
- S3 bucket settings
- IAM role permissions
- Resource tagging
- CloudFormation outputs

### Synthesizing CloudFormation

```bash
npm run synth
```

This generates the CloudFormation template without deploying.

### Viewing Changes

```bash
npm run diff
```

Shows differences between deployed stack and current code.

## Deployment

### First Time Setup

1. Bootstrap CDK (if not already done):
   ```bash
   cdk bootstrap
   ```

2. Deploy the stack:
   ```bash
   npm run deploy
   ```

### Environment Configuration

The infrastructure supports multiple environments through CDK context:

- **Development**: `development-signal9-*` resources
- **Staging**: `staging-signal9-*` resources  
- **Production**: `production-signal9-*` resources

To deploy to a specific environment:

```bash
cdk deploy --context environment=staging
```

## Infrastructure Components

### DynamoDB Tables

#### Assets Table (`development-signal9-assets`)
- **Partition Key**: `asset_id` (String)
- **GSI**: `SymbolIndex` on `symbol` + `asset_id`
- **Purpose**: Store financial asset information
- **Features**: On-demand billing, encryption, point-in-time recovery

#### Earnings Calendar Table (`development-signal9-earnings-calendar`)
- **Partition Key**: `date` (String)
- **Sort Key**: `symbol` (String)
- **GSI**: `SymbolDateIndex` on `symbol` + `date`
- **Purpose**: Track earnings announcements and dates
- **Features**: On-demand billing, encryption, point-in-time recovery

#### Analysis Queue Table (`development-signal9-analysis-queue`)
- **Partition Key**: `queue_id` (String)
- **Sort Key**: `timestamp` (String)
- **GSI**: `StatusIndex` on `status` + `timestamp`
- **GSI**: `SymbolIndex` on `symbol` + `timestamp`
- **Purpose**: Queue analysis tasks and track their status
- **Features**: On-demand billing, encryption, point-in-time recovery

### S3 Bucket

#### Analysis Data Bucket (`development-signal9-analysis-data-*`)
- **Encryption**: S3-managed encryption (AES256)
- **Versioning**: Enabled
- **Lifecycle Rules**:
  - Standard → IA after 30 days
  - IA → Glacier after 90 days
  - Glacier → Deep Archive after 365 days
  - Expiration after 7 years
- **Security**: Block all public access, enforce SSL
- **Purpose**: Store large analysis files and reports

### IAM Roles

#### Data Processing Role (`development-signal9-data-processing-role`)
- **Trust Policy**: Lambda service principal
- **Permissions**:
  - DynamoDB read/write access to all tables and indexes
  - S3 read/write access to analysis data bucket
  - CloudWatch Logs access
- **Purpose**: Lambda function execution role

## Security Features

- **Encryption at Rest**: All DynamoDB tables and S3 objects encrypted
- **Encryption in Transit**: S3 bucket enforces SSL
- **Least Privilege**: IAM roles grant minimal required permissions
- **Public Access Blocked**: S3 bucket blocks all public access
- **Resource Tagging**: All resources tagged for cost tracking and management

## Monitoring and Observability

- **CloudWatch Logs**: All Lambda functions log to CloudWatch
- **DynamoDB Metrics**: Auto-scaling and performance metrics
- **S3 Access Logs**: Bucket access logging enabled
- **Resource Tagging**: Consistent tagging for cost analysis

## Cost Optimization

- **DynamoDB On-Demand**: Pay-per-request billing for variable workloads
- **S3 Lifecycle Policies**: Automatic transition to cheaper storage classes
- **TTL**: Automatic cleanup of old data
- **Resource Tagging**: Track costs by project and environment

## Production Considerations

Before deploying to production:

1. **Change Removal Policies**: Update from `DESTROY` to `RETAIN` for critical resources
2. **Enable CloudTrail**: For comprehensive API logging
3. **Set Up Alerts**: Configure CloudWatch alarms for critical metrics
4. **Review IAM Policies**: Ensure least privilege access
5. **Enable Backup**: Consider additional backup strategies
6. **Performance Testing**: Validate auto-scaling behavior under load

## Troubleshooting

### Common Issues

1. **CDK Bootstrap Required**: Run `cdk bootstrap` if deployment fails
2. **Insufficient Permissions**: Ensure AWS credentials have required permissions
3. **Resource Limits**: Check AWS service quotas for your account
4. **Name Conflicts**: Ensure unique resource names across regions

### Useful Commands

```bash
# View stack status
cdk list

# Destroy stack (use with caution)
cdk destroy

# View stack outputs
aws cloudformation describe-stacks --stack-name Signal9AdvisorStack --query 'Stacks[0].Outputs'
```

## Contributing

1. Follow the existing code structure and patterns
2. Add tests for new infrastructure components
3. Update documentation for any changes
4. Ensure all tests pass before submitting changes

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
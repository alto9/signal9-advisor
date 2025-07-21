# Ticket 1.1: AWS Infrastructure Foundation Setup

## Estimate
Full-Day Task (8 hours)

**Status**: Refinement Complete

#### Description
Establish the core AWS infrastructure foundation for Signal9 Advisor using AWS CDK with TypeScript. This ticket implements the foundational infrastructure components including Lambda execution roles, core DynamoDB tables, S3 storage, and basic networking configuration that will support the event-driven data processing pipeline. The implementation uses CDK best practices with proper IAM permissions, resource tagging, and infrastructure-as-code principles.

#### Technical Details
- **Implementation Steps**:
  1. **Initialize CDK Project Structure**:
     ```typescript
     // Create main CDK app file: bin/signal9-advisor.ts
     import * as cdk from 'aws-cdk-lib';
     import { Signal9AdvisorStack } from '../lib/signal9-advisor-stack';
     
     const app = new cdk.App();
     new Signal9AdvisorStack(app, 'Signal9AdvisorStack', {
       env: { 
         account: process.env.CDK_DEFAULT_ACCOUNT, 
         region: process.env.CDK_DEFAULT_REGION 
       },
     });
     ```

  2. **Create Core DynamoDB Tables**:
     ```typescript
     // lib/constructs/database-construct.ts
     export class DatabaseConstruct extends Construct {
       public readonly assetsTable: Table;
       public readonly earningsCalendarTable: Table;
       public readonly analysisQueueTable: Table;
     
       constructor(scope: Construct, id: string) {
         super(scope, id);
     
         // Assets table with GSI for symbol lookups
         this.assetsTable = new Table(this, 'AssetsTable', {
           partitionKey: { name: 'asset_id', type: AttributeType.STRING },
           billingMode: BillingMode.PAY_PER_REQUEST,
           pointInTimeRecovery: true,
           removalPolicy: RemovalPolicy.DESTROY // Change to RETAIN for production
         });
         
         this.assetsTable.addGlobalSecondaryIndex({
           indexName: 'SymbolIndex',
           partitionKey: { name: 'symbol', type: AttributeType.STRING }
         });
         
         // Continue with other tables...
       }
     }
     ```

  3. **Configure Lambda Execution Roles**:
     ```typescript
     // lib/constructs/lambda-roles-construct.ts
     export class LambdaRolesConstruct extends Construct {
       public readonly dataProcessingRole: Role;
       
       constructor(scope: Construct, id: string, tables: DatabaseConstruct) {
         super(scope, id);
         
         this.dataProcessingRole = new Role(this, 'DataProcessingRole', {
           assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
           managedPolicies: [
             ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
           ]
         });
         
         // Grant DynamoDB permissions
         tables.assetsTable.grantReadWriteData(this.dataProcessingRole);
         tables.earningsCalendarTable.grantReadWriteData(this.dataProcessingRole);
         tables.analysisQueueTable.grantReadWriteData(this.dataProcessingRole);
       }
     }
     ```

  4. **Create S3 Bucket for Large Objects**:
     ```typescript
     // S3 bucket with encryption and lifecycle policies
     const analysisDataBucket = new Bucket(this, 'AnalysisDataBucket', {
       encryption: BucketEncryption.S3_MANAGED,
       versioned: true,
       lifecycleRules: [{
         id: 'AnalysisDataLifecycle',
         enabled: true,
         transitions: [{
           storageClass: StorageClass.INFREQUENT_ACCESS,
           transitionAfter: Duration.days(30)
         }]
       }],
       removalPolicy: RemovalPolicy.DESTROY // Change to RETAIN for production
     });
     ```

  5. **Configure Resource Tagging Strategy**:
     ```typescript
     // Apply consistent tags across all resources
     Tags.of(this).add('Project', 'Signal9Advisor');
     Tags.of(this).add('Environment', 'development');
     Tags.of(this).add('Phase', 'Phase1');
     Tags.of(this).add('ManagedBy', 'CDK');
     ```

  6. **Set Up CDK Deployment Pipeline**:
     ```bash
     # Install dependencies
     npm install aws-cdk-lib constructs
     npm install --save-dev @types/node
     
     # Bootstrap CDK (if not already done)
     cdk bootstrap
     
     # Synthesize and deploy
     cdk synth
     cdk deploy --require-approval never
     ```

  7. **Configure Auto-scaling for DynamoDB Tables**:
     ```typescript
     // Enable auto-scaling for tables
     assetsTable.autoScaleReadCapacity({
       minCapacity: 1,
       maxCapacity: 10
     }).scaleOnUtilization({
       targetUtilizationPercent: 70
     });
     ```

- **Architecture Considerations**:
  - Uses AWS CDK for infrastructure-as-code with full version control
  - DynamoDB tables designed with proper partition keys and GSI patterns
  - IAM roles follow principle of least privilege
  - Resources tagged consistently for cost tracking and management
  - S3 bucket configured with encryption and lifecycle policies
  - Auto-scaling enabled for DynamoDB to handle variable workloads

- **Security Requirements**:
  - All DynamoDB tables have encryption at rest enabled by default
  - S3 bucket uses server-side encryption (S3 managed)
  - IAM roles grant minimal required permissions only
  - No hardcoded credentials or sensitive data in CDK code
  - CloudTrail logging enabled for all API calls
  - Point-in-time recovery enabled for DynamoDB tables

- **Performance Requirements**:
  - DynamoDB tables configured with on-demand billing for cost optimization
  - Auto-scaling policies set to maintain <70% utilization
  - Global Secondary Indexes designed for efficient query patterns
  - S3 bucket configured with appropriate storage classes

#### Dependencies
- **Prerequisites**:
  - AWS CLI configured with appropriate credentials
  - Node.js v22+ installed
  - AWS CDK CLI installed globally (`npm install -g aws-cdk`)
  - AWS account with sufficient permissions for resource creation
  - Project repository initialized with package.json

- **Dependent Tickets**:
  - Ticket 1.2: Secrets Manager Configuration
  - Ticket 1.3: EventBridge Event Architecture Setup
  - All subsequent infrastructure tickets

#### Testing Requirements
- **Unit Tests**:
  ```typescript
  // tests/infrastructure.test.ts
  describe('Signal9AdvisorStack', () => {
    test('Creates all required DynamoDB tables', () => {
      const app = new cdk.App();
      const stack = new Signal9AdvisorStack(app, 'TestStack');
      const template = Template.fromStack(stack);
      
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        BillingMode: 'PAY_PER_REQUEST',
        PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true }
      });
    });
    
    test('IAM roles have correct permissions', () => {
      // Verify Lambda execution roles have appropriate policies attached
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'lambda.amazonaws.com' }
          }]
        }
      });
    });
  });
  ```
  - Test coverage requirement: >90% for infrastructure code
  - Mock AWS services using CDK testing utilities
  - Validate table schemas match expected structure
  - Verify IAM policies grant correct permissions
  - Test resource tagging is applied consistently

- **Integration Tests**:
  ```typescript
  // tests/integration/infrastructure-integration.test.ts
  describe('Infrastructure Integration', () => {
    test('Can successfully deploy and destroy stack', async () => {
      // Deploy to test environment
      // Verify all resources are created
      // Clean up resources
    });
    
    test('DynamoDB tables are accessible with proper permissions', async () => {
      // Test table read/write operations using SDK
    });
  });
  ```
  - Deploy stack to test AWS environment
  - Verify all resources are created correctly
  - Test DynamoDB table access patterns
  - Validate S3 bucket permissions and encryption
  - Confirm IAM roles can be assumed by Lambda functions

- **Performance Tests**:
  - Measure CDK synthesis time (<30 seconds)
  - Validate deployment time (<10 minutes)
  - Test DynamoDB query performance (<100ms for simple queries)
  - Verify auto-scaling policies trigger correctly under load

- **Security Tests**:
  - Scan CDK templates for security best practices using `cdk-nag`
  - Verify no hardcoded secrets or credentials
  - Validate encryption at rest is enabled for all data stores
  - Confirm IAM policies follow least privilege principle
  - Test resource access from unauthorized roles fails

#### Acceptance Criteria
- [ ] CDK stack synthesizes without errors or warnings
- [ ] Stack deploys successfully to AWS account
- [ ] Assets table created with SymbolIndex GSI
- [ ] Earnings Calendar table created with date-based access patterns
- [ ] Analysis Queue table created with status tracking capabilities
- [ ] Lambda execution roles created with minimal required permissions
- [ ] S3 bucket created with encryption and lifecycle policies enabled
- [ ] All resources tagged consistently with project metadata
- [ ] DynamoDB auto-scaling policies configured and functional
- [ ] Point-in-time recovery enabled for all DynamoDB tables
- [ ] All unit tests pass with >90% coverage
- [ ] Integration tests pass in test environment
- [ ] Security scan passes with no critical issues
- [ ] CDK deployment completes in <10 minutes
- [ ] Code review completed and approved
- [ ] Infrastructure documentation updated

#### Error Handling
- **CDK Synthesis Errors**:
  - Log detailed error messages with context
  - Validate all construct parameters before synthesis
  - Handle missing environment variables gracefully
  - Provide clear error messages for common configuration issues

- **Deployment Failures**:
  - Implement rollback procedures for failed deployments
  - Log AWS API errors with request IDs for debugging
  - Handle resource limit exceptions with clear messaging
  - Retry transient failures with exponential backoff

- **Resource Access Errors**:
  - Validate IAM permissions before resource operations
  - Handle DynamoDB throttling with appropriate backoff
  - Log S3 access errors with bucket and key information
  - Implement graceful degradation for optional resources

#### Monitoring and Observability
- **CloudWatch Metrics**:
  - Track DynamoDB read/write capacity utilization
  - Monitor S3 bucket storage usage and request metrics
  - Log CDK deployment success/failure rates
  - Alert on resource creation failures

- **Logging Requirements**:
  - Structure all logs in JSON format with consistent fields
  - Log resource creation/deletion events
  - Include correlation IDs for tracing deployments
  - Set log retention to 30 days for cost optimization

- **Alerting Criteria**:
  - Alert on DynamoDB throttling events
  - Notify on deployment failures
  - Monitor for unexpected resource deletion
  - Track unusual access patterns to S3 bucket

#### Open Questions
- None - ticket is ready for development

#### Notes
- This foundation infrastructure must be deployed before any other Phase 1 tickets can begin
- Use CDK context parameters to support multiple environments (dev/staging/prod)
- Consider using CDK Pipelines for production deployments in later phases
- All resource names should include environment suffix to prevent conflicts
- Remove `RemovalPolicy.DESTROY` and change to `RETAIN` for production deployment
- Ensure AWS account has sufficient service quotas for all resources being created 
# Ticket 1.2: Secrets Manager Configuration

## Estimate
Half-Day Task (4 hours)

**Status**: Refinement Complete

#### Description
Configure AWS Secrets Manager to securely store external API credentials (AlphaVantage and Alpaca) with proper access controls, rotation policies, and Lambda integration patterns. This ticket implements a centralized, secure credential management system that supports the event-driven data processing pipeline while following AWS security best practices for secret storage, access control, and audit logging.

#### Technical Details
- **Implementation Steps**:
  1. **Create Secrets Manager Secret Structure**:
     ```typescript
     // lib/constructs/secrets-construct.ts
     export class SecretsConstruct extends Construct {
       public readonly apiCredentialsSecret: Secret;
       
       constructor(scope: Construct, id: string) {
         super(scope, id);
         
         // Create secret for external API credentials
         this.apiCredentialsSecret = new Secret(this, 'ApiCredentialsSecret', {
           secretName: 'signal9-advisor/api-credentials',
           description: 'External API credentials for AlphaVantage and Alpaca APIs',
           generateSecretString: {
             secretStringTemplate: JSON.stringify({
               alphaVantageApiKey: '',
               alpacaApiKey: '',
               alpacaApiSecret: ''
             }),
             generateStringKey: 'placeholder',
             excludeCharacters: '"@/\\'
           },
           removalPolicy: RemovalPolicy.DESTROY // Change to RETAIN for production
         });
       }
     }
     ```

  2. **Configure Secret Rotation Policy**:
     ```typescript
     // Configure automatic rotation every 90 days
     const rotationLambda = new Function(this, 'SecretRotationFunction', {
       runtime: Runtime.NODEJS_22_X,
       handler: 'index.handler',
       code: Code.fromInline(`
         exports.handler = async (event) => {
           console.log('Secret rotation triggered:', JSON.stringify(event));
           // Custom rotation logic for external API keys
           // This would typically involve generating new API keys
           // For external APIs like AlphaVantage/Alpaca, rotation is manual
           return { statusCode: 200, body: 'Rotation logged' };
         };
       `),
       timeout: Duration.minutes(5)
     });
     
     this.apiCredentialsSecret.addRotationSchedule('RotationSchedule', {
       rotationLambda: rotationLambda,
       automaticallyAfter: Duration.days(90)
     });
     ```

  3. **Create IAM Policies for Lambda Access**:
     ```typescript
     // lib/constructs/secrets-access-construct.ts
     export class SecretsAccessConstruct extends Construct {
       public readonly secretsReaderPolicy: ManagedPolicy;
       
       constructor(scope: Construct, id: string, secret: Secret) {
         super(scope, id);
         
         this.secretsReaderPolicy = new ManagedPolicy(this, 'SecretsReaderPolicy', {
           description: 'Policy for Lambda functions to read API credentials',
           statements: [
             new PolicyStatement({
               effect: Effect.ALLOW,
               actions: [
                 'secretsmanager:GetSecretValue',
                 'secretsmanager:DescribeSecret'
               ],
               resources: [secret.secretArn],
               conditions: {
                 StringEquals: {
                   'secretsmanager:ResourceTag/Project': 'Signal9Advisor'
                 }
               }
             })
           ]
         });
       }
     }
     ```

  4. **Implement Lambda Helper Function for Secret Access**:
     ```typescript
     // lib/utils/secrets-helper.ts
     import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
     
     export interface ApiCredentials {
       alphaVantageApiKey: string;
       alpacaApiKey: string;
       alpacaApiSecret: string;
     }
     
     export class SecretsHelper {
       private client: SecretsManagerClient;
       private secretName: string;
       private cachedCredentials?: ApiCredentials;
       private cacheExpiry?: Date;
       
       constructor(secretName: string = 'signal9-advisor/api-credentials') {
         this.client = new SecretsManagerClient({});
         this.secretName = secretName;
       }
       
       async getApiCredentials(): Promise<ApiCredentials> {
         // Check cache first (5-minute cache)
         if (this.cachedCredentials && this.cacheExpiry && new Date() < this.cacheExpiry) {
           return this.cachedCredentials;
         }
         
         try {
           const command = new GetSecretValueCommand({
             SecretId: this.secretName
           });
           
           const response = await this.client.send(command);
           
           if (!response.SecretString) {
             throw new Error('Secret string is empty');
           }
           
           const credentials = JSON.parse(response.SecretString) as ApiCredentials;
           
           // Validate required fields
           if (!credentials.alphaVantageApiKey || !credentials.alpacaApiKey || !credentials.alpacaApiSecret) {
             throw new Error('Missing required API credentials in secret');
           }
           
           // Cache for 5 minutes
           this.cachedCredentials = credentials;
           this.cacheExpiry = new Date(Date.now() + 5 * 60 * 1000);
           
           return credentials;
         } catch (error) {
           console.error('Failed to retrieve API credentials:', error);
           throw new Error(`Failed to get API credentials: ${error.message}`);
         }
       }
     }
     ```

  5. **Configure CloudTrail Logging for Secret Access**:
     ```typescript
     // Enable CloudTrail logging for Secrets Manager actions
     const secretsManagerTrail = new Trail(this, 'SecretsManagerTrail', {
       trailName: 'signal9-advisor-secrets-trail',
       includeGlobalServiceEvents: true,
       isMultiRegionTrail: false,
       enableFileValidation: true,
       eventRuleLogGroupName: 'signal9-advisor-secrets-events'
     });
     
     // Add event rule for secret access monitoring
     secretsManagerTrail.addEventSelector({
       dataResources: [{
         type: 'AWS::SecretsManager::Secret',
         values: [this.apiCredentialsSecret.secretArn]
       }],
       includeManagementEvents: true,
       readWriteType: ReadWriteType.ALL
     });
     ```

  6. **Set Up Secret Monitoring and Alerting**:
     ```typescript
     // Create CloudWatch alarm for unauthorized access attempts
     new Alarm(this, 'UnauthorizedSecretAccess', {
       metric: new Metric({
         namespace: 'AWS/SecretsManager',
         metricName: 'GetSecretValue',
         dimensionsMap: {
           SecretName: this.apiCredentialsSecret.secretName!
         },
         statistic: 'Sum'
       }),
       threshold: 10,
       evaluationPeriods: 1,
       comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
       treatMissingData: TreatMissingData.NOT_BREACHING,
       alarmDescription: 'High number of secret access attempts detected'
     });
     ```

  7. **Create Secret Population Script**:
     ```bash
     #!/bin/bash
     # scripts/populate-secrets.sh
     # Script to populate initial API credentials
     
     SECRET_NAME="signal9-advisor/api-credentials"
     
     # Validate environment variables
     if [[ -z "$ALPHAVANTAGE_API_KEY" || -z "$ALPACA_API_KEY" || -z "$ALPACA_API_SECRET" ]]; then
       echo "Error: Required environment variables not set"
       echo "Please set ALPHAVANTAGE_API_KEY, ALPACA_API_KEY, and ALPACA_API_SECRET"
       exit 1
     fi
     
     # Create secret JSON
     SECRET_VALUE=$(cat <<EOF
     {
       "alphaVantageApiKey": "$ALPHAVANTAGE_API_KEY",
       "alpacaApiKey": "$ALPACA_API_KEY",
       "alpacaApiSecret": "$ALPACA_API_SECRET"
     }
     EOF
     )
     
     # Update secret in AWS
     aws secretsmanager update-secret \
       --secret-id "$SECRET_NAME" \
       --secret-string "$SECRET_VALUE" \
       --description "External API credentials for Signal9 Advisor"
     
     echo "Secret updated successfully"
     ```

- **Architecture Considerations**:
  - Centralized credential management for all external API integrations
  - In-memory caching to reduce API calls and improve performance
  - Proper error handling and validation for missing credentials
  - CloudTrail integration for comprehensive audit logging
  - Resource tagging for access control and cost tracking
  - Rotation schedule configured for security compliance

- **Security Requirements**:
  - Secret encrypted at rest using AWS KMS default key
  - IAM policies follow principle of least privilege
  - Conditional access based on resource tags
  - CloudTrail logging for all secret access events
  - No credentials stored in CDK code or environment variables
  - Alarm monitoring for unusual access patterns
  - Automatic rotation schedule (90 days) with notification

- **Performance Requirements**:
  - Secret retrieval cached for 5 minutes to reduce API calls
  - Timeout configuration for Lambda functions (5 minutes max)
  - Efficient error handling to prevent Lambda timeouts
  - Minimal resource usage for rotation Lambda

#### Dependencies
- **Prerequisites**:
  - Ticket 1.1: AWS Infrastructure Foundation Setup (completed)
  - AlphaVantage API key obtained from alphavantage.co
  - Alpaca API key and secret obtained from alpaca.markets
  - AWS CLI configured with SecretsManager permissions

- **Dependent Tickets**:
  - Ticket 1.5: Asset Synchronization Lambda Function
  - Ticket 1.6: Earnings Calendar Sync Lambda Function
  - Ticket 1.7: Data Processing Pipeline Implementation
  - All tickets requiring external API access

#### Testing Requirements
- **Unit Tests**:
  ```typescript
  // tests/secrets-helper.test.ts
  describe('SecretsHelper', () => {
    let secretsHelper: SecretsHelper;
    let mockSecretsManager: jest.Mocked<SecretsManagerClient>;
    
    beforeEach(() => {
      mockSecretsManager = {
        send: jest.fn()
      } as any;
      secretsHelper = new SecretsHelper('test-secret');
      (secretsHelper as any).client = mockSecretsManager;
    });
    
    test('Successfully retrieves and validates API credentials', async () => {
      const mockResponse = {
        SecretString: JSON.stringify({
          alphaVantageApiKey: 'test-av-key',
          alpacaApiKey: 'test-alpaca-key',
          alpacaApiSecret: 'test-alpaca-secret'
        })
      };
      
      mockSecretsManager.send.mockResolvedValueOnce(mockResponse);
      
      const credentials = await secretsHelper.getApiCredentials();
      
      expect(credentials.alphaVantageApiKey).toBe('test-av-key');
      expect(credentials.alpacaApiKey).toBe('test-alpaca-key');
      expect(credentials.alpacaApiSecret).toBe('test-alpaca-secret');
    });
    
    test('Throws error for missing credentials', async () => {
      const mockResponse = {
        SecretString: JSON.stringify({
          alphaVantageApiKey: 'test-key'
          // Missing alpacaApiKey and alpacaApiSecret
        })
      };
      
      mockSecretsManager.send.mockResolvedValueOnce(mockResponse);
      
      await expect(secretsHelper.getApiCredentials()).rejects.toThrow('Missing required API credentials');
    });
    
    test('Uses cached credentials within cache period', async () => {
      // Setup initial call
      const mockResponse = {
        SecretString: JSON.stringify({
          alphaVantageApiKey: 'test-av-key',
          alpacaApiKey: 'test-alpaca-key',
          alpacaApiSecret: 'test-alpaca-secret'
        })
      };
      
      mockSecretsManager.send.mockResolvedValueOnce(mockResponse);
      
      // First call
      await secretsHelper.getApiCredentials();
      
      // Second call should use cache
      await secretsHelper.getApiCredentials();
      
      expect(mockSecretsManager.send).toHaveBeenCalledTimes(1);
    });
  });
  ```
  - Test coverage requirement: >90% for secrets helper and CDK constructs
  - Mock AWS SDK calls for isolated testing
  - Validate error handling for missing secrets
  - Test caching behavior and expiration
  - Verify IAM policy generation

- **Integration Tests**:
  ```typescript
  // tests/integration/secrets-integration.test.ts
  describe('Secrets Integration', () => {
    test('Can create and retrieve secret through CDK deployment', async () => {
      // Deploy stack with secrets
      // Populate secret with test credentials
      // Verify retrieval through Lambda function
      // Clean up test resources
    });
    
    test('IAM policies allow Lambda access to secrets', async () => {
      // Test Lambda function with secrets reader role
      // Verify successful secret retrieval
      // Test access denial with incorrect role
    });
    
    test('CloudTrail logs secret access events', async () => {
      // Access secret through Lambda
      // Query CloudTrail for access events
      // Verify proper logging format
    });
  });
  ```
  - Deploy secrets to test environment
  - Verify Lambda functions can access secrets with proper IAM roles
  - Test CloudTrail logging functionality
  - Validate secret rotation trigger (manual test)
  - Confirm alarm triggers on high access volume

- **Performance Tests**:
  - Measure secret retrieval time (<500ms)
  - Test caching effectiveness (reduced API calls)
  - Validate Lambda timeout handling
  - Test concurrent secret access

- **Security Tests**:
  - Verify unauthorized access is denied
  - Test IAM policy effectiveness
  - Validate CloudTrail audit logging
  - Confirm secret encryption at rest
  - Test rotation Lambda security permissions

#### Acceptance Criteria
- [ ] Secrets Manager secret created with proper naming convention
- [ ] Secret structure supports AlphaVantage and Alpaca API credentials
- [ ] IAM policies created for Lambda function access with least privilege
- [ ] Secret rotation schedule configured for 90-day cycle
- [ ] CloudTrail logging enabled for all secret access events
- [ ] SecretsHelper utility class implements secure credential retrieval
- [ ] Credential caching implemented (5-minute cache duration)
- [ ] Error handling covers missing credentials and access failures
- [ ] CloudWatch alarm configured for unauthorized access monitoring
- [ ] Population script created for initial credential setup
- [ ] All unit tests pass with >90% coverage
- [ ] Integration tests validate end-to-end secret access
- [ ] Security tests confirm access control effectiveness
- [ ] Secret retrieval performance <500ms average
- [ ] Code review completed and approved
- [ ] Security documentation updated with access procedures

#### Error Handling
- **Secret Retrieval Failures**:
  - Log detailed error messages without exposing credential values
  - Implement exponential backoff for transient AWS API failures
  - Graceful degradation when secrets are temporarily unavailable
  - Clear error messages for missing or malformed secrets

- **Access Control Errors**:
  - Handle IAM permission denied errors with actionable messages
  - Log unauthorized access attempts for security monitoring
  - Implement circuit breaker pattern for repeated failures
  - Provide fallback mechanism for critical operations

- **Rotation Failures**:
  - Log rotation attempts and outcomes
  - Send notifications for manual rotation requirements
  - Handle rotation Lambda timeouts gracefully
  - Maintain service availability during rotation events

#### Monitoring and Observability
- **CloudWatch Metrics**:
  - Track secret retrieval success/failure rates
  - Monitor cache hit/miss ratios
  - Alert on high-frequency access patterns
  - Log rotation events and outcomes

- **Logging Requirements**:
  - Structure all logs in JSON format for parsing
  - Include correlation IDs for request tracing
  - Log secret access without exposing credential values
  - Set 30-day retention for cost optimization

- **Alerting Criteria**:
  - Alert on >10 secret access attempts per minute
  - Notify on rotation failures or missed rotations
  - Monitor unauthorized access attempts
  - Track unusual access patterns outside normal hours

#### Open Questions
- None - ticket is ready for development

#### Notes
- This ticket must be completed before any Lambda functions requiring external API access
- The population script should be run after CDK deployment to set initial credentials
- Consider using AWS Systems Manager Parameter Store for non-sensitive configuration
- Rotation Lambda is placeholder - external API keys typically require manual rotation
- Review secret naming convention to ensure consistency across environments
- Ensure API credentials are obtained from AlphaVantage and Alpaca before development
- Test secret access in development environment before production deployment 
import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class SecretsConstruct extends Construct {
  public readonly apiCredentialsSecret: secretsmanager.Secret;
  public readonly rotationLambda: lambda.Function;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create rotation Lambda function
    this.rotationLambda = new lambda.Function(this, 'SecretRotationFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Secret rotation triggered:', JSON.stringify(event, null, 2));
          
          // Custom rotation logic for external API keys
          // For external APIs like AlphaVantage/Alpaca, rotation is typically manual
          // This function logs the rotation attempt and provides notification
          
          const { SecretId, Step } = event;
          
          switch (Step) {
            case 'createSecret':
              console.log('Step: Creating new secret version');
              // For external APIs, this would typically involve generating new API keys
              // through the provider's API or notifying administrators
              break;
              
            case 'setSecret':
              console.log('Step: Setting new secret in rotation');
              // This step would update the secret with new credentials
              break;
              
            case 'testSecret':
              console.log('Step: Testing new secret');
              // Test the new credentials against the APIs
              break;
              
            case 'finishSecret':
              console.log('Step: Finishing rotation');
              // Cleanup and complete the rotation
              break;
              
            default:
              throw new Error(\`Invalid step: \${Step}\`);
          }
          
          return {
            statusCode: 200,
            body: JSON.stringify({
              message: 'Rotation step completed',
              step: Step,
              secretId: SecretId,
              timestamp: new Date().toISOString()
            })
          };
        };
      `),
      timeout: cdk.Duration.minutes(5),
      description: 'Handles rotation of external API credentials',
      environment: {
        LOG_LEVEL: 'INFO'
      }
    });

    // Create secret for external API credentials
    this.apiCredentialsSecret = new secretsmanager.Secret(this, 'ApiCredentialsSecret', {
      secretName: 'signal9-advisor/api-credentials',
      description: 'External API credentials for AlphaVantage and Alpaca APIs',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          alphaVantageApiKey: '',
          alpacaApiKey: '',
          alpacaApiSecret: '',
          lastUpdated: new Date().toISOString()
        }),
        generateStringKey: 'placeholder',
        excludeCharacters: '"@/\\',
        requireEachIncludedType: true,
        includeSpace: false
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY // Change to RETAIN for production
    });

    // Configure automatic rotation every 90 days
    this.apiCredentialsSecret.addRotationSchedule('RotationSchedule', {
      rotationLambda: this.rotationLambda,
      automaticallyAfter: cdk.Duration.days(90),
      rotateImmediatelyOnUpdate: false
    });

    // Add resource tags for identification and access control
    cdk.Tags.of(this.apiCredentialsSecret).add('Project', 'Signal9Advisor');
    cdk.Tags.of(this.apiCredentialsSecret).add('Component', 'SecretsManager');
    cdk.Tags.of(this.apiCredentialsSecret).add('Environment', cdk.Stack.of(this).node.tryGetContext('environment') || 'development');
    cdk.Tags.of(this.rotationLambda).add('Project', 'Signal9Advisor');
    cdk.Tags.of(this.rotationLambda).add('Component', 'SecretRotation');
  }
} 
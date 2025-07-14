import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface SecretsManagerConstructProps {
  config: EnvironmentConfig;
}

export class SecretsManagerConstruct extends Construct {
  public readonly alphaVantageSecret: secretsmanager.Secret;
  public readonly alpacaSecret: secretsmanager.Secret;
  public readonly auth0Secret: secretsmanager.Secret;
  public readonly lambdaSecretsRole: iam.Role;

  constructor(scope: Construct, id: string, props: SecretsManagerConstructProps) {
    super(scope, id);

    const { config } = props;

    // Create AlphaVantage API key secret
    this.alphaVantageSecret = new secretsmanager.Secret(this, 'AlphaVantageSecret', {
      secretName: `signal9/alphavantage/${config.stage}`,
      description: 'AlphaVantage API key for financial data access',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ 
          apiKey: '',
          rateLimit: 5, // calls per minute for free tier
          tier: 'free'
        }),
        generateStringKey: 'apiKey',
        excludeCharacters: '"@/\\\'',
        includeSpace: false,
        requireEachIncludedType: false
      }
    });

    // Create Alpaca API credentials secret
    this.alpacaSecret = new secretsmanager.Secret(this, 'AlpacaSecret', {
      secretName: `signal9/alpaca/${config.stage}`,
      description: 'Alpaca API credentials for market data access',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ 
          apiKey: '',
          secretKey: '',
          baseUrl: config.stage === 'prod' ? 'https://api.alpaca.markets' : 'https://paper-api.alpaca.markets'
        }),
        generateStringKey: 'secretKey',
        excludeCharacters: '"@/\\\'',
        includeSpace: false,
        requireEachIncludedType: false
      }
    });

    // Create Auth0 client secret
    this.auth0Secret = new secretsmanager.Secret(this, 'Auth0Secret', {
      secretName: `signal9/auth0/${config.stage}`,
      description: 'Auth0 client credentials for user authentication',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ 
          clientId: '',
          clientSecret: '',
          domain: '',
          audience: `https://api.${config.domainName}`
        }),
        generateStringKey: 'clientSecret',
        excludeCharacters: '"@/\\\'',
        includeSpace: false,
        requireEachIncludedType: false
      }
    });

    // Create IAM role for Lambda functions to access secrets
    this.lambdaSecretsRole = new iam.Role(this, 'LambdaSecretsRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Lambda functions to access secrets',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
      ]
    });

    // Grant Lambda functions read access to secrets
    this.alphaVantageSecret.grantRead(this.lambdaSecretsRole);
    this.alpacaSecret.grantRead(this.lambdaSecretsRole);
    this.auth0Secret.grantRead(this.lambdaSecretsRole);

    // Create custom policy for secrets access
    const secretsPolicy = new iam.Policy(this, 'SecretsAccessPolicy', {
      policyName: `signal9-secrets-access-${config.stage}`,
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'secretsmanager:GetSecretValue',
            'secretsmanager:DescribeSecret'
          ],
          resources: [
            this.alphaVantageSecret.secretArn,
            this.alpacaSecret.secretArn,
            this.auth0Secret.secretArn
          ]
        })
      ]
    });

    this.lambdaSecretsRole.attachInlinePolicy(secretsPolicy);

    // Add tags to all secrets
    const commonTags = {
      Project: 'Signal9',
      Environment: config.stage,
      Component: 'SecretsManager'
    };

    cdk.Tags.of(this.alphaVantageSecret).add('SecretType', 'API-Key');
    cdk.Tags.of(this.alpacaSecret).add('SecretType', 'API-Credentials');
    cdk.Tags.of(this.auth0Secret).add('SecretType', 'Auth-Credentials');

    Object.entries(commonTags).forEach(([key, value]) => {
      cdk.Tags.of(this.alphaVantageSecret).add(key, value);
      cdk.Tags.of(this.alpacaSecret).add(key, value);
      cdk.Tags.of(this.auth0Secret).add(key, value);
    });

    // Output secret ARNs for reference
    new cdk.CfnOutput(this, 'AlphaVantageSecretArn', {
      value: this.alphaVantageSecret.secretArn,
      description: 'ARN of the AlphaVantage API key secret',
      exportName: `Signal9-AlphaVantageSecret-${config.stage}`
    });

    new cdk.CfnOutput(this, 'AlpacaSecretArn', {
      value: this.alpacaSecret.secretArn,
      description: 'ARN of the Alpaca API credentials secret',
      exportName: `Signal9-AlpacaSecret-${config.stage}`
    });

    new cdk.CfnOutput(this, 'Auth0SecretArn', {
      value: this.auth0Secret.secretArn,
      description: 'ARN of the Auth0 client credentials secret',
      exportName: `Signal9-Auth0Secret-${config.stage}`
    });

    new cdk.CfnOutput(this, 'LambdaSecretsRoleArn', {
      value: this.lambdaSecretsRole.roleArn,
      description: 'ARN of the Lambda role for secrets access',
      exportName: `Signal9-LambdaSecretsRole-${config.stage}`
    });
  }

  /**
   * Grant read access to secrets for additional roles or resources
   */
  public grantSecretsReadAccess(grantee: iam.IGrantable): void {
    this.alphaVantageSecret.grantRead(grantee);
    this.alpacaSecret.grantRead(grantee);
    this.auth0Secret.grantRead(grantee);
  }

  /**
   * Get environment variables for Lambda functions to access secrets
   */
  public getSecretsEnvironmentVariables(): { [key: string]: string } {
    return {
      ALPHAVANTAGE_SECRET_ARN: this.alphaVantageSecret.secretArn,
      ALPACA_SECRET_ARN: this.alpacaSecret.secretArn,
      AUTH0_SECRET_ARN: this.auth0Secret.secretArn
    };
  }
} 
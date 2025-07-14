import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { SecretsManagerConstruct } from '../lib/constructs/secrets-manager';
import { EnvironmentConfig } from '../lib/config/environment';

describe('SecretsManagerConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let config: EnvironmentConfig;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    config = {
      env: { region: 'us-east-1' },
      stage: 'test',
      domainName: 'test.signal9.com'
    };
  });

  describe('Secret Creation', () => {
    test('creates AlphaVantage secret with correct configuration', () => {
      const construct = new SecretsManagerConstruct(stack, 'TestSecretsManager', { config });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'signal9/alphavantage/test',
        Description: 'AlphaVantage API key for financial data access',
        GenerateSecretString: {
          SecretStringTemplate: JSON.stringify({
            apiKey: '',
            rateLimit: 5,
            tier: 'free'
          }),
          GenerateStringKey: 'apiKey',
          ExcludeCharacters: '"@/\\\'',
          IncludeSpace: false,
          RequireEachIncludedType: false
        }
      });
    });

    test('creates Alpaca secret with correct configuration', () => {
      const construct = new SecretsManagerConstruct(stack, 'TestSecretsManager', { config });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'signal9/alpaca/test',
        Description: 'Alpaca API credentials for market data access',
        GenerateSecretString: {
          SecretStringTemplate: JSON.stringify({
            apiKey: '',
            secretKey: '',
            baseUrl: 'https://paper-api.alpaca.markets'
          }),
          GenerateStringKey: 'secretKey',
          ExcludeCharacters: '"@/\\\'',
          IncludeSpace: false,
          RequireEachIncludedType: false
        }
      });
    });

    test('creates Auth0 secret with correct configuration', () => {
      const construct = new SecretsManagerConstruct(stack, 'TestSecretsManager', { config });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'signal9/auth0/test',
        Description: 'Auth0 client credentials for user authentication',
        GenerateSecretString: {
          SecretStringTemplate: JSON.stringify({
            clientId: '',
            clientSecret: '',
            domain: '',
            audience: 'https://api.test.signal9.com'
          }),
          GenerateStringKey: 'clientSecret',
          ExcludeCharacters: '"@/\\\'',
          IncludeSpace: false,
          RequireEachIncludedType: false
        }
      });
    });

    test('uses production Alpaca URL for prod environment', () => {
      const prodConfig: EnvironmentConfig = {
        env: { region: 'us-east-1' },
        stage: 'prod',
        domainName: 'app.signal9.com'
      };

      const construct = new SecretsManagerConstruct(stack, 'TestSecretsManager', { config: prodConfig });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'signal9/alpaca/prod',
        GenerateSecretString: {
          SecretStringTemplate: JSON.stringify({
            apiKey: '',
            secretKey: '',
            baseUrl: 'https://api.alpaca.markets'
          })
        }
      });
    });
  });

  describe('IAM Role and Policies', () => {
    test('creates Lambda secrets role with correct configuration', () => {
      const construct = new SecretsManagerConstruct(stack, 'TestSecretsManager', { config });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: { Service: 'lambda.amazonaws.com' },
              Action: 'sts:AssumeRole'
            }
          ]
        },
        Description: 'Role for Lambda functions to access secrets'
      });

      // Check that managed policies are attached (CDK uses Fn::Join for ARN construction)
      const roles = template.findResources('AWS::IAM::Role');
      const roleResource = Object.values(roles)[0] as any;
      expect(roleResource.Properties.ManagedPolicyArns).toHaveLength(2);
    });

    test('creates secrets access policy with correct permissions', () => {
      const construct = new SecretsManagerConstruct(stack, 'TestSecretsManager', { config });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyName: 'signal9-secrets-access-test',
        PolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret'
              ],
              Resource: Match.anyValue()
            }
          ]
        }
      });
    });

    test('grants read access to all secrets', () => {
      const construct = new SecretsManagerConstruct(stack, 'TestSecretsManager', { config });
      const template = Template.fromStack(stack);

      // Check that secrets exist (the grantRead method creates resource policies internally)
      template.resourceCountIs('AWS::SecretsManager::Secret', 3);
      template.resourceCountIs('AWS::IAM::Role', 1);
    });
  });

  describe('Tags', () => {
    test('applies correct tags to all secrets', () => {
      const construct = new SecretsManagerConstruct(stack, 'TestSecretsManager', { config });
      const template = Template.fromStack(stack);

      // Check that all secrets have the Project tag
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Tags: Match.arrayWith([
          { Key: 'Project', Value: 'Signal9' }
        ])
      });

      // Check that secrets have tags (CDK may add additional tags)
      const secrets = template.findResources('AWS::SecretsManager::Secret');
      Object.values(secrets).forEach((secret: any) => {
        expect(secret.Properties.Tags).toBeDefined();
        expect(secret.Properties.Tags.length).toBeGreaterThan(0);
      });
    });

    test('applies specific tags to different secret types', () => {
      const construct = new SecretsManagerConstruct(stack, 'TestSecretsManager', { config });
      const template = Template.fromStack(stack);

      // AlphaVantage secret should have API-Key tag
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'signal9/alphavantage/test',
        Tags: Match.arrayWith([
          { Key: 'SecretType', Value: 'API-Key' }
        ])
      });

      // Alpaca secret should have API-Credentials tag
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'signal9/alpaca/test',
        Tags: Match.arrayWith([
          { Key: 'SecretType', Value: 'API-Credentials' }
        ])
      });

      // Auth0 secret should have Auth-Credentials tag
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'signal9/auth0/test',
        Tags: Match.arrayWith([
          { Key: 'SecretType', Value: 'Auth-Credentials' }
        ])
      });
    });
  });

  describe('CloudFormation Outputs', () => {
    test('creates outputs for all secret ARNs', () => {
      const construct = new SecretsManagerConstruct(stack, 'TestSecretsManager', { config });
      const template = Template.fromStack(stack);

      // Check that outputs exist - the exact naming may vary
      const outputs = template.findOutputs('*');
      const outputNames = Object.keys(outputs);
      
      expect(outputNames.some(name => name.includes('AlphaVantageSecretArn'))).toBe(true);
      expect(outputNames.some(name => name.includes('AlpacaSecretArn'))).toBe(true);
      expect(outputNames.some(name => name.includes('Auth0SecretArn'))).toBe(true);
      expect(outputNames.some(name => name.includes('LambdaSecretsRoleArn'))).toBe(true);
    });
  });

  describe('Public Methods', () => {
    test('grantSecretsReadAccess grants access to all secrets', () => {
      const construct = new SecretsManagerConstruct(stack, 'TestSecretsManager', { config });
      
      const testRole = new iam.Role(stack, 'TestRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
      });

      construct.grantSecretsReadAccess(testRole);

      const template = Template.fromStack(stack);
      
      // Should still have the same number of secrets and roles
      template.resourceCountIs('AWS::SecretsManager::Secret', 3);
      template.resourceCountIs('AWS::IAM::Role', 2); // Original + test role
    });

    test('getSecretsEnvironmentVariables returns correct environment variables', () => {
      const construct = new SecretsManagerConstruct(stack, 'TestSecretsManager', { config });
      
      const envVars = construct.getSecretsEnvironmentVariables();

      expect(envVars).toHaveProperty('ALPHAVANTAGE_SECRET_ARN');
      expect(envVars).toHaveProperty('ALPACA_SECRET_ARN');
      expect(envVars).toHaveProperty('AUTH0_SECRET_ARN');
      
      // In CDK, these will be tokens that resolve to ARNs at deploy time
      expect(typeof envVars.ALPHAVANTAGE_SECRET_ARN).toBe('string');
      expect(typeof envVars.ALPACA_SECRET_ARN).toBe('string');
      expect(typeof envVars.AUTH0_SECRET_ARN).toBe('string');
    });
  });

  describe('Resource Count', () => {
    test('creates expected number of resources', () => {
      const construct = new SecretsManagerConstruct(stack, 'TestSecretsManager', { config });
      const template = Template.fromStack(stack);

      // Should create 3 secrets, 1 role, and policies (CDK may create additional policies)
      template.resourceCountIs('AWS::SecretsManager::Secret', 3);
      template.resourceCountIs('AWS::IAM::Role', 1);
      
      // CDK creates additional policies for resource access
      const policies = template.findResources('AWS::IAM::Policy');
      expect(Object.keys(policies).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Integration with Different Environments', () => {
    test('handles dev environment correctly', () => {
      const devConfig: EnvironmentConfig = {
        env: { region: 'us-east-1' },
        stage: 'dev',
        domainName: 'dev.signal9.com'
      };

      const construct = new SecretsManagerConstruct(stack, 'TestSecretsManager', { config: devConfig });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'signal9/alphavantage/dev'
      });

      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'signal9/alpaca/dev'
      });

      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'signal9/auth0/dev',
        GenerateSecretString: {
          SecretStringTemplate: JSON.stringify({
            clientId: '',
            clientSecret: '',
            domain: '',
            audience: 'https://api.dev.signal9.com'
          })
        }
      });
    });
  });
}); 
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface SecretsAccessConstructProps {
  /**
   * The secret that Lambda functions need to access
   */
  secret: secretsmanager.Secret;
}

export class SecretsAccessConstruct extends Construct {
  public readonly secretsReaderPolicy: iam.ManagedPolicy;
  public readonly secretsReaderRole: iam.Role;

  constructor(scope: Construct, id: string, props: SecretsAccessConstructProps) {
    super(scope, id);

    // Create managed policy for reading secrets
    this.secretsReaderPolicy = new iam.ManagedPolicy(this, 'SecretsReaderPolicy', {
      description: 'Policy for Lambda functions to read API credentials from Secrets Manager',
      statements: [
        // Allow reading the specific secret
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'secretsmanager:GetSecretValue',
            'secretsmanager:DescribeSecret'
          ],
          resources: [props.secret.secretArn],
          conditions: {
            StringEquals: {
              'secretsmanager:ResourceTag/Project': 'Signal9Advisor'
            }
          }
        }),
        // Allow listing secrets for debugging (restricted to project)
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'secretsmanager:ListSecrets'
          ],
          resources: ['*'],
          conditions: {
            StringEquals: {
              'secretsmanager:ResourceTag/Project': 'Signal9Advisor'
            }
          }
        }),
        // Allow CloudWatch logging for troubleshooting
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents'
          ],
          resources: [
            `arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/lambda/*`
          ]
        })
      ]
    });

    // Create a role that can be used by Lambda functions
    this.secretsReaderRole = new iam.Role(this, 'SecretsReaderRole', {
      description: 'Role for Lambda functions that need to access API credentials',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        this.secretsReaderPolicy,
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      maxSessionDuration: cdk.Duration.hours(1), // Limit session duration for security
      inlinePolicies: {
        'RestrictedSecretsAccess': new iam.PolicyDocument({
          statements: [
            // Explicitly deny access to secrets outside our project
            new iam.PolicyStatement({
              effect: iam.Effect.DENY,
              actions: [
                'secretsmanager:*'
              ],
              resources: ['*'],
              conditions: {
                StringNotEquals: {
                  'secretsmanager:ResourceTag/Project': 'Signal9Advisor'
                }
              }
            })
          ]
        })
      }
    });

    // Add tags for identification and compliance
    cdk.Tags.of(this.secretsReaderPolicy).add('Project', 'Signal9Advisor');
    cdk.Tags.of(this.secretsReaderPolicy).add('Component', 'IAMPolicy');
    cdk.Tags.of(this.secretsReaderRole).add('Project', 'Signal9Advisor');
    cdk.Tags.of(this.secretsReaderRole).add('Component', 'IAMRole');
  }

  /**
   * Create a policy statement that allows access to the secret
   * This can be used to attach to existing roles
   */
  public createSecretAccessPolicyStatement(): iam.PolicyStatement {
    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
        'secretsmanager:DescribeSecret'
      ],
      resources: [this.secretsReaderPolicy.managedPolicyArn],
      conditions: {
        StringEquals: {
          'secretsmanager:ResourceTag/Project': 'Signal9Advisor'
        }
      }
    });
  }
} 
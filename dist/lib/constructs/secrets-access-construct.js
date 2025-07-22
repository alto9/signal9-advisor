"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretsAccessConstruct = void 0;
const cdk = require("aws-cdk-lib");
const iam = require("aws-cdk-lib/aws-iam");
const constructs_1 = require("constructs");
class SecretsAccessConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
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
    createSecretAccessPolicyStatement() {
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
exports.SecretsAccessConstruct = SecretsAccessConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy1hY2Nlc3MtY29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL2NvbnN0cnVjdHMvc2VjcmV0cy1hY2Nlc3MtY29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQywyQ0FBMkM7QUFFM0MsMkNBQXVDO0FBU3ZDLE1BQWEsc0JBQXVCLFNBQVEsc0JBQVM7SUFJbkQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFrQztRQUMxRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLDRDQUE0QztRQUM1QyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUM1RSxXQUFXLEVBQUUsMEVBQTBFO1lBQ3ZGLFVBQVUsRUFBRTtnQkFDVixvQ0FBb0M7Z0JBQ3BDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztvQkFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztvQkFDeEIsT0FBTyxFQUFFO3dCQUNQLCtCQUErQjt3QkFDL0IsK0JBQStCO3FCQUNoQztvQkFDRCxTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztvQkFDbkMsVUFBVSxFQUFFO3dCQUNWLFlBQVksRUFBRTs0QkFDWixvQ0FBb0MsRUFBRSxnQkFBZ0I7eUJBQ3ZEO3FCQUNGO2lCQUNGLENBQUM7Z0JBQ0YsOERBQThEO2dCQUM5RCxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7b0JBQ3RCLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7b0JBQ3hCLE9BQU8sRUFBRTt3QkFDUCw0QkFBNEI7cUJBQzdCO29CQUNELFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztvQkFDaEIsVUFBVSxFQUFFO3dCQUNWLFlBQVksRUFBRTs0QkFDWixvQ0FB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dCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlY3JldHNBY2Nlc3NDb25zdHJ1Y3RQcm9wcyB7XG4gIC8qKlxuICAgKiBUaGUgc2VjcmV0IHRoYXQgTGFtYmRhIGZ1bmN0aW9ucyBuZWVkIHRvIGFjY2Vzc1xuICAgKi9cbiAgc2VjcmV0OiBzZWNyZXRzbWFuYWdlci5TZWNyZXQ7XG59XG5cbmV4cG9ydCBjbGFzcyBTZWNyZXRzQWNjZXNzQ29uc3RydWN0IGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IHNlY3JldHNSZWFkZXJQb2xpY3k6IGlhbS5NYW5hZ2VkUG9saWN5O1xuICBwdWJsaWMgcmVhZG9ubHkgc2VjcmV0c1JlYWRlclJvbGU6IGlhbS5Sb2xlO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBTZWNyZXRzQWNjZXNzQ29uc3RydWN0UHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgLy8gQ3JlYXRlIG1hbmFnZWQgcG9saWN5IGZvciByZWFkaW5nIHNlY3JldHNcbiAgICB0aGlzLnNlY3JldHNSZWFkZXJQb2xpY3kgPSBuZXcgaWFtLk1hbmFnZWRQb2xpY3kodGhpcywgJ1NlY3JldHNSZWFkZXJQb2xpY3knLCB7XG4gICAgICBkZXNjcmlwdGlvbjogJ1BvbGljeSBmb3IgTGFtYmRhIGZ1bmN0aW9ucyB0byByZWFkIEFQSSBjcmVkZW50aWFscyBmcm9tIFNlY3JldHMgTWFuYWdlcicsXG4gICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgIC8vIEFsbG93IHJlYWRpbmcgdGhlIHNwZWNpZmljIHNlY3JldFxuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICdzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZScsXG4gICAgICAgICAgICAnc2VjcmV0c21hbmFnZXI6RGVzY3JpYmVTZWNyZXQnXG4gICAgICAgICAgXSxcbiAgICAgICAgICByZXNvdXJjZXM6IFtwcm9wcy5zZWNyZXQuc2VjcmV0QXJuXSxcbiAgICAgICAgICBjb25kaXRpb25zOiB7XG4gICAgICAgICAgICBTdHJpbmdFcXVhbHM6IHtcbiAgICAgICAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOlJlc291cmNlVGFnL1Byb2plY3QnOiAnU2lnbmFsOUFkdmlzb3InXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KSxcbiAgICAgICAgLy8gQWxsb3cgbGlzdGluZyBzZWNyZXRzIGZvciBkZWJ1Z2dpbmcgKHJlc3RyaWN0ZWQgdG8gcHJvamVjdClcbiAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAnc2VjcmV0c21hbmFnZXI6TGlzdFNlY3JldHMnXG4gICAgICAgICAgXSxcbiAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgICAgIGNvbmRpdGlvbnM6IHtcbiAgICAgICAgICAgIFN0cmluZ0VxdWFsczoge1xuICAgICAgICAgICAgICAnc2VjcmV0c21hbmFnZXI6UmVzb3VyY2VUYWcvUHJvamVjdCc6ICdTaWduYWw5QWR2aXNvcidcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pLFxuICAgICAgICAvLyBBbGxvdyBDbG91ZFdhdGNoIGxvZ2dpbmcgZm9yIHRyb3VibGVzaG9vdGluZ1xuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICdsb2dzOkNyZWF0ZUxvZ0dyb3VwJyxcbiAgICAgICAgICAgICdsb2dzOkNyZWF0ZUxvZ1N0cmVhbScsXG4gICAgICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnXG4gICAgICAgICAgXSxcbiAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgIGBhcm46YXdzOmxvZ3M6JHtjZGsuU3RhY2sub2YodGhpcykucmVnaW9ufToke2Nkay5TdGFjay5vZih0aGlzKS5hY2NvdW50fTpsb2ctZ3JvdXA6L2F3cy9sYW1iZGEvKmBcbiAgICAgICAgICBdXG4gICAgICAgIH0pXG4gICAgICBdXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgYSByb2xlIHRoYXQgY2FuIGJlIHVzZWQgYnkgTGFtYmRhIGZ1bmN0aW9uc1xuICAgIHRoaXMuc2VjcmV0c1JlYWRlclJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ1NlY3JldHNSZWFkZXJSb2xlJywge1xuICAgICAgZGVzY3JpcHRpb246ICdSb2xlIGZvciBMYW1iZGEgZnVuY3Rpb25zIHRoYXQgbmVlZCB0byBhY2Nlc3MgQVBJIGNyZWRlbnRpYWxzJyxcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIHRoaXMuc2VjcmV0c1JlYWRlclBvbGljeSxcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlJylcbiAgICAgIF0sXG4gICAgICBtYXhTZXNzaW9uRHVyYXRpb246IGNkay5EdXJhdGlvbi5ob3VycygxKSwgLy8gTGltaXQgc2Vzc2lvbiBkdXJhdGlvbiBmb3Igc2VjdXJpdHlcbiAgICAgIGlubGluZVBvbGljaWVzOiB7XG4gICAgICAgICdSZXN0cmljdGVkU2VjcmV0c0FjY2Vzcyc6IG5ldyBpYW0uUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgIC8vIEV4cGxpY2l0bHkgZGVueSBhY2Nlc3MgdG8gc2VjcmV0cyBvdXRzaWRlIG91ciBwcm9qZWN0XG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5ERU5ZLFxuICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOionXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICAgICAgICAgIGNvbmRpdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBTdHJpbmdOb3RFcXVhbHM6IHtcbiAgICAgICAgICAgICAgICAgICdzZWNyZXRzbWFuYWdlcjpSZXNvdXJjZVRhZy9Qcm9qZWN0JzogJ1NpZ25hbDlBZHZpc29yJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICBdXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBBZGQgdGFncyBmb3IgaWRlbnRpZmljYXRpb24gYW5kIGNvbXBsaWFuY2VcbiAgICBjZGsuVGFncy5vZih0aGlzLnNlY3JldHNSZWFkZXJQb2xpY3kpLmFkZCgnUHJvamVjdCcsICdTaWduYWw5QWR2aXNvcicpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMuc2VjcmV0c1JlYWRlclBvbGljeSkuYWRkKCdDb21wb25lbnQnLCAnSUFNUG9saWN5Jyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5zZWNyZXRzUmVhZGVyUm9sZSkuYWRkKCdQcm9qZWN0JywgJ1NpZ25hbDlBZHZpc29yJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5zZWNyZXRzUmVhZGVyUm9sZSkuYWRkKCdDb21wb25lbnQnLCAnSUFNUm9sZScpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIHBvbGljeSBzdGF0ZW1lbnQgdGhhdCBhbGxvd3MgYWNjZXNzIHRvIHRoZSBzZWNyZXRcbiAgICogVGhpcyBjYW4gYmUgdXNlZCB0byBhdHRhY2ggdG8gZXhpc3Rpbmcgcm9sZXNcbiAgICovXG4gIHB1YmxpYyBjcmVhdGVTZWNyZXRBY2Nlc3NQb2xpY3lTdGF0ZW1lbnQoKTogaWFtLlBvbGljeVN0YXRlbWVudCB7XG4gICAgcmV0dXJuIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkdldFNlY3JldFZhbHVlJyxcbiAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkRlc2NyaWJlU2VjcmV0J1xuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW3RoaXMuc2VjcmV0c1JlYWRlclBvbGljeS5tYW5hZ2VkUG9saWN5QXJuXSxcbiAgICAgIGNvbmRpdGlvbnM6IHtcbiAgICAgICAgU3RyaW5nRXF1YWxzOiB7XG4gICAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOlJlc291cmNlVGFnL1Byb2plY3QnOiAnU2lnbmFsOUFkdmlzb3InXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufSAiXX0=
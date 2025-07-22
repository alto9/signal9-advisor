import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
export interface SecretsAccessConstructProps {
    /**
     * The secret that Lambda functions need to access
     */
    secret: secretsmanager.Secret;
}
export declare class SecretsAccessConstruct extends Construct {
    readonly secretsReaderPolicy: iam.ManagedPolicy;
    readonly secretsReaderRole: iam.Role;
    constructor(scope: Construct, id: string, props: SecretsAccessConstructProps);
    /**
     * Create a policy statement that allows access to the secret
     * This can be used to attach to existing roles
     */
    createSecretAccessPolicyStatement(): iam.PolicyStatement;
}

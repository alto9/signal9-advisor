import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
export declare class SecretsConstruct extends Construct {
    readonly apiCredentialsSecret: secretsmanager.Secret;
    readonly rotationLambda: lambda.Function;
    constructor(scope: Construct, id: string);
}

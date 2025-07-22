import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
interface LambdaRolesConstructProps {
    database: {
        assetsTable: dynamodb.Table;
        earningsCalendarTable: dynamodb.Table;
        analysisQueueTable: dynamodb.Table;
    };
    s3: {
        analysisDataBucket: s3.Bucket;
    };
}
export declare class LambdaRolesConstruct extends Construct {
    readonly dataProcessingRole: iam.Role;
    constructor(scope: Construct, id: string, props: LambdaRolesConstructProps);
}
export {};

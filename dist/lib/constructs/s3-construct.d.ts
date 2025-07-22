import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
export declare class S3Construct extends Construct {
    readonly analysisDataBucket: s3.Bucket;
    constructor(scope: Construct, id: string);
}

import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
export declare class DatabaseConstruct extends Construct {
    readonly assetsTable: dynamodb.Table;
    readonly earningsCalendarTable: dynamodb.Table;
    readonly analysisQueueTable: dynamodb.Table;
    constructor(scope: Construct, id: string);
    private configureAutoScaling;
}

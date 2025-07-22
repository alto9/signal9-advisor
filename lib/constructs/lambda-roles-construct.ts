import * as cdk from 'aws-cdk-lib';
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

export class LambdaRolesConstruct extends Construct {
  public readonly dataProcessingRole: iam.Role;
  
  constructor(scope: Construct, id: string, props: LambdaRolesConstructProps) {
    super(scope, id);
    
    // Data Processing Role for Lambda functions
    this.dataProcessingRole = new iam.Role(this, 'DataProcessingRole', {
      roleName: `${cdk.Stack.of(this).node.tryGetContext('environment') || 'dev'}-signal9-data-processing-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        'DynamoDBAccess': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
              ],
              resources: [
                props.database.assetsTable.tableArn,
                `${props.database.assetsTable.tableArn}/index/*`,
                props.database.earningsCalendarTable.tableArn,
                `${props.database.earningsCalendarTable.tableArn}/index/*`,
                props.database.analysisQueueTable.tableArn,
                `${props.database.analysisQueueTable.tableArn}/index/*`
              ]
            })
          ]
        }),
        'S3Access': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket'
              ],
              resources: [
                props.s3.analysisDataBucket.bucketArn,
                `${props.s3.analysisDataBucket.bucketArn}/*`
              ]
            })
          ]
        }),
        'CloudWatchLogs': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    // Grant DynamoDB permissions using table methods (additional layer of security)
    props.database.assetsTable.grantReadWriteData(this.dataProcessingRole);
    props.database.earningsCalendarTable.grantReadWriteData(this.dataProcessingRole);
    props.database.analysisQueueTable.grantReadWriteData(this.dataProcessingRole);

    // Grant S3 permissions
    props.s3.analysisDataBucket.grantReadWrite(this.dataProcessingRole);
  }
} 
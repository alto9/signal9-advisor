import { Template, Match } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { Signal9AdvisorStack } from '../lib/signal9-advisor-stack';

describe('Signal9AdvisorStack', () => {
  let template: Template;

  beforeEach(() => {
    const app = new cdk.App();
    const stack = new Signal9AdvisorStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  test('Creates all required DynamoDB tables', () => {
    // Check that all three tables are created
    template.resourceCountIs('AWS::DynamoDB::Table', 3);
    
    // Check table properties
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
      PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
      SSESpecification: { SSEEnabled: true }
    });
  });

  test('Assets table has correct configuration', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: Match.stringLikeRegexp('.*-signal9-assets'),
      AttributeDefinitions: Match.arrayWith([
        { AttributeName: 'asset_id', AttributeType: 'S' },
        { AttributeName: 'symbol', AttributeType: 'S' }
      ]),
      KeySchema: [{ AttributeName: 'asset_id', KeyType: 'HASH' }],
      GlobalSecondaryIndexes: Match.arrayWith([
        {
          IndexName: 'SymbolIndex',
          KeySchema: [
            { AttributeName: 'symbol', KeyType: 'HASH' },
            { AttributeName: 'asset_id', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' }
        }
      ])
    });
  });

  test('Earnings Calendar table has correct configuration', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: Match.stringLikeRegexp('.*-signal9-earnings-calendar'),
      AttributeDefinitions: Match.arrayWith([
        { AttributeName: 'date', AttributeType: 'S' },
        { AttributeName: 'symbol', AttributeType: 'S' }
      ]),
      KeySchema: [
        { AttributeName: 'date', KeyType: 'HASH' },
        { AttributeName: 'symbol', KeyType: 'RANGE' }
      ],
      GlobalSecondaryIndexes: Match.arrayWith([
        {
          IndexName: 'SymbolDateIndex',
          KeySchema: [
            { AttributeName: 'symbol', KeyType: 'HASH' },
            { AttributeName: 'date', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' }
        }
      ])
    });
  });

  test('Analysis Queue table has correct configuration', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: Match.stringLikeRegexp('.*-signal9-analysis-queue'),
      AttributeDefinitions: Match.arrayWith([
        { AttributeName: 'queue_id', AttributeType: 'S' },
        { AttributeName: 'timestamp', AttributeType: 'S' },
        { AttributeName: 'status', AttributeType: 'S' },
        { AttributeName: 'symbol', AttributeType: 'S' }
      ]),
      KeySchema: [
        { AttributeName: 'queue_id', KeyType: 'HASH' },
        { AttributeName: 'timestamp', KeyType: 'RANGE' }
      ],
      GlobalSecondaryIndexes: Match.arrayWith([
        {
          IndexName: 'StatusIndex',
          KeySchema: [
            { AttributeName: 'status', KeyType: 'HASH' },
            { AttributeName: 'timestamp', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' }
        },
        {
          IndexName: 'SymbolIndex',
          KeySchema: [
            { AttributeName: 'symbol', KeyType: 'HASH' },
            { AttributeName: 'timestamp', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' }
        }
      ])
    });
  });

  test('S3 bucket has correct configuration', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256'
            }
          }
        ]
      },
      VersioningConfiguration: { Status: 'Enabled' },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true
      }
    });
  });

  test('IAM roles have correct permissions', () => {
    // Check that Lambda execution role is created
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [{
          Effect: 'Allow',
          Principal: { Service: 'lambda.amazonaws.com' }
        }]
      }
    });
  });

  test('All resources are properly tagged', () => {
    template.hasResource('AWS::DynamoDB::Table', {
      Properties: {
        Tags: Match.arrayWith([
          { Key: 'Project', Value: 'Signal9Advisor' }
        ])
      }
    });

    template.hasResource('AWS::S3::Bucket', {
      Properties: {
        Tags: Match.arrayWith([
          { Key: 'Project', Value: 'Signal9Advisor' }
        ])
      }
    });
  });

  test('CloudFormation outputs are created', () => {
    template.hasOutput('AssetsTableName', {});
    template.hasOutput('EarningsCalendarTableName', {});
    template.hasOutput('AnalysisQueueTableName', {});
    template.hasOutput('AnalysisDataBucketName', {});
    template.hasOutput('DataProcessingRoleArn', {});
  });
}); 
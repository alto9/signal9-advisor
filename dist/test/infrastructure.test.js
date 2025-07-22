"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("aws-cdk-lib/assertions");
const cdk = require("aws-cdk-lib");
const signal9_advisor_stack_1 = require("../lib/signal9-advisor-stack");
describe('Signal9AdvisorStack', () => {
    let template;
    beforeEach(() => {
        const app = new cdk.App();
        const stack = new signal9_advisor_stack_1.Signal9AdvisorStack(app, 'TestStack');
        template = assertions_1.Template.fromStack(stack);
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
            TableName: assertions_1.Match.stringLikeRegexp('.*-signal9-assets'),
            AttributeDefinitions: assertions_1.Match.arrayWith([
                { AttributeName: 'asset_id', AttributeType: 'S' },
                { AttributeName: 'symbol', AttributeType: 'S' }
            ]),
            KeySchema: [{ AttributeName: 'asset_id', KeyType: 'HASH' }],
            GlobalSecondaryIndexes: assertions_1.Match.arrayWith([
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
            TableName: assertions_1.Match.stringLikeRegexp('.*-signal9-earnings-calendar'),
            AttributeDefinitions: assertions_1.Match.arrayWith([
                { AttributeName: 'date', AttributeType: 'S' },
                { AttributeName: 'symbol', AttributeType: 'S' }
            ]),
            KeySchema: [
                { AttributeName: 'date', KeyType: 'HASH' },
                { AttributeName: 'symbol', KeyType: 'RANGE' }
            ],
            GlobalSecondaryIndexes: assertions_1.Match.arrayWith([
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
            TableName: assertions_1.Match.stringLikeRegexp('.*-signal9-analysis-queue'),
            AttributeDefinitions: assertions_1.Match.arrayWith([
                { AttributeName: 'queue_id', AttributeType: 'S' },
                { AttributeName: 'timestamp', AttributeType: 'S' },
                { AttributeName: 'status', AttributeType: 'S' },
                { AttributeName: 'symbol', AttributeType: 'S' }
            ]),
            KeySchema: [
                { AttributeName: 'queue_id', KeyType: 'HASH' },
                { AttributeName: 'timestamp', KeyType: 'RANGE' }
            ],
            GlobalSecondaryIndexes: assertions_1.Match.arrayWith([
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
                Tags: assertions_1.Match.arrayWith([
                    { Key: 'Project', Value: 'Signal9Advisor' }
                ])
            }
        });
        template.hasResource('AWS::S3::Bucket', {
            Properties: {
                Tags: assertions_1.Match.arrayWith([
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5mcmFzdHJ1Y3R1cmUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3Rlc3QvaW5mcmFzdHJ1Y3R1cmUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHVEQUF5RDtBQUN6RCxtQ0FBbUM7QUFDbkMsd0VBQW1FO0FBRW5FLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7SUFDbkMsSUFBSSxRQUFrQixDQUFDO0lBRXZCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUMxQixNQUFNLEtBQUssR0FBRyxJQUFJLDJDQUFtQixDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN4RCxRQUFRLEdBQUcscUJBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFO1FBQ2hELDBDQUEwQztRQUMxQyxRQUFRLENBQUMsZUFBZSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBELHlCQUF5QjtRQUN6QixRQUFRLENBQUMscUJBQXFCLENBQUMsc0JBQXNCLEVBQUU7WUFDckQsV0FBVyxFQUFFLGlCQUFpQjtZQUM5QixnQ0FBZ0MsRUFBRSxFQUFFLDBCQUEwQixFQUFFLElBQUksRUFBRTtZQUN0RSxnQkFBZ0IsRUFBRSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUU7U0FDdkMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO1FBQ2xELFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxzQkFBc0IsRUFBRTtZQUNyRCxTQUFTLEVBQUUsa0JBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQztZQUN0RCxvQkFBb0IsRUFBRSxrQkFBSyxD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aCB9IGZyb20gJ2F3cy1jZGstbGliL2Fzc2VydGlvbnMnO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFNpZ25hbDlBZHZpc29yU3RhY2sgfSBmcm9tICcuLi9saWIvc2lnbmFsOS1hZHZpc29yLXN0YWNrJztcblxuZGVzY3JpYmUoJ1NpZ25hbDlBZHZpc29yU3RhY2snLCAoKSA9PiB7XG4gIGxldCB0ZW1wbGF0ZTogVGVtcGxhdGU7XG5cbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcbiAgICBjb25zdCBzdGFjayA9IG5ldyBTaWduYWw5QWR2aXNvclN0YWNrKGFwcCwgJ1Rlc3RTdGFjaycpO1xuICAgIHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcbiAgfSk7XG5cbiAgdGVzdCgnQ3JlYXRlcyBhbGwgcmVxdWlyZWQgRHluYW1vREIgdGFibGVzJywgKCkgPT4ge1xuICAgIC8vIENoZWNrIHRoYXQgYWxsIHRocmVlIHRhYmxlcyBhcmUgY3JlYXRlZFxuICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCAzKTtcbiAgICBcbiAgICAvLyBDaGVjayB0YWJsZSBwcm9wZXJ0aWVzXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgIEJpbGxpbmdNb2RlOiAnUEFZX1BFUl9SRVFVRVNUJyxcbiAgICAgIFBvaW50SW5UaW1lUmVjb3ZlcnlTcGVjaWZpY2F0aW9uOiB7IFBvaW50SW5UaW1lUmVjb3ZlcnlFbmFibGVkOiB0cnVlIH0sXG4gICAgICBTU0VTcGVjaWZpY2F0aW9uOiB7IFNTRUVuYWJsZWQ6IHRydWUgfVxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdBc3NldHMgdGFibGUgaGFzIGNvcnJlY3QgY29uZmlndXJhdGlvbicsICgpID0+IHtcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgVGFibGVOYW1lOiBNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKCcuKi1zaWduYWw5LWFzc2V0cycpLFxuICAgICAgQXR0cmlidXRlRGVmaW5pdGlvbnM6IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgIHsgQXR0cmlidXRlTmFtZTogJ2Fzc2V0X2lkJywgQXR0cmlidXRlVHlwZTogJ1MnIH0sXG4gICAgICAgIHsgQXR0cmlidXRlTmFtZTogJ3N5bWJvbCcsIEF0dHJpYnV0ZVR5cGU6ICdTJyB9XG4gICAgICBdKSxcbiAgICAgIEtleVNjaGVtYTogW3sgQXR0cmlidXRlTmFtZTogJ2Fzc2V0X2lkJywgS2V5VHlwZTogJ0hBU0gnIH1dLFxuICAgICAgR2xvYmFsU2Vjb25kYXJ5SW5kZXhlczogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAge1xuICAgICAgICAgIEluZGV4TmFtZTogJ1N5bWJvbEluZGV4JyxcbiAgICAgICAgICBLZXlTY2hlbWE6IFtcbiAgICAgICAgICAgIHsgQXR0cmlidXRlTmFtZTogJ3N5bWJvbCcsIEtleVR5cGU6ICdIQVNIJyB9LFxuICAgICAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAnYXNzZXRfaWQnLCBLZXlUeXBlOiAnUkFOR0UnIH1cbiAgICAgICAgICBdLFxuICAgICAgICAgIFByb2plY3Rpb246IHsgUHJvamVjdGlvblR5cGU6ICdBTEwnIH1cbiAgICAgICAgfVxuICAgICAgXSlcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnRWFybmluZ3MgQ2FsZW5kYXIgdGFibGUgaGFzIGNvcnJlY3QgY29uZmlndXJhdGlvbicsICgpID0+IHtcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgVGFibGVOYW1lOiBNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKCcuKi1zaWduYWw5LWVhcm5pbmdzLWNhbGVuZGFyJyksXG4gICAgICBBdHRyaWJ1dGVEZWZpbml0aW9uczogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAnZGF0ZScsIEF0dHJpYnV0ZVR5cGU6ICdTJyB9LFxuICAgICAgICB7IEF0dHJpYnV0ZU5hbWU6ICdzeW1ib2wnLCBBdHRyaWJ1dGVUeXBlOiAnUycgfVxuICAgICAgXSksXG4gICAgICBLZXlTY2hlbWE6IFtcbiAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAnZGF0ZScsIEtleVR5cGU6ICdIQVNIJyB9LFxuICAgICAgICB7IEF0dHJpYnV0ZU5hbWU6ICdzeW1ib2wnLCBLZXlUeXBlOiAnUkFOR0UnIH1cbiAgICAgIF0sXG4gICAgICBHbG9iYWxTZWNvbmRhcnlJbmRleGVzOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICB7XG4gICAgICAgICAgSW5kZXhOYW1lOiAnU3ltYm9sRGF0ZUluZGV4JyxcbiAgICAgICAgICBLZXlTY2hlbWE6IFtcbiAgICAgICAgICAgIHsgQXR0cmlidXRlTmFtZTogJ3N5bWJvbCcsIEtleVR5cGU6ICdIQVNIJyB9LFxuICAgICAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAnZGF0ZScsIEtleVR5cGU6ICdSQU5HRScgfVxuICAgICAgICAgIF0sXG4gICAgICAgICAgUHJvamVjdGlvbjogeyBQcm9qZWN0aW9uVHlwZTogJ0FMTCcgfVxuICAgICAgICB9XG4gICAgICBdKVxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdBbmFseXNpcyBRdWV1ZSB0YWJsZSBoYXMgY29ycmVjdCBjb25maWd1cmF0aW9uJywgKCkgPT4ge1xuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCB7XG4gICAgICBUYWJsZU5hbWU6IE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoJy4qLXNpZ25hbDktYW5hbHlzaXMtcXVldWUnKSxcbiAgICAgIEF0dHJpYnV0ZURlZmluaXRpb25zOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICB7IEF0dHJpYnV0ZU5hbWU6ICdxdWV1ZV9pZCcsIEF0dHJpYnV0ZVR5cGU6ICdTJyB9LFxuICAgICAgICB7IEF0dHJpYnV0ZU5hbWU6ICd0aW1lc3RhbXAnLCBBdHRyaWJ1dGVUeXBlOiAnUycgfSxcbiAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAnc3RhdHVzJywgQXR0cmlidXRlVHlwZTogJ1MnIH0sXG4gICAgICAgIHsgQXR0cmlidXRlTmFtZTogJ3N5bWJvbCcsIEF0dHJpYnV0ZVR5cGU6ICdTJyB9XG4gICAgICBdKSxcbiAgICAgIEtleVNjaGVtYTogW1xuICAgICAgICB7IEF0dHJpYnV0ZU5hbWU6ICdxdWV1ZV9pZCcsIEtleVR5cGU6ICdIQVNIJyB9LFxuICAgICAgICB7IEF0dHJpYnV0ZU5hbWU6ICd0aW1lc3RhbXAnLCBLZXlUeXBlOiAnUkFOR0UnIH1cbiAgICAgIF0sXG4gICAgICBHbG9iYWxTZWNvbmRhcnlJbmRleGVzOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICB7XG4gICAgICAgICAgSW5kZXhOYW1lOiAnU3RhdHVzSW5kZXgnLFxuICAgICAgICAgIEtleVNjaGVtYTogW1xuICAgICAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAnc3RhdHVzJywgS2V5VHlwZTogJ0hBU0gnIH0sXG4gICAgICAgICAgICB7IEF0dHJpYnV0ZU5hbWU6ICd0aW1lc3RhbXAnLCBLZXlUeXBlOiAnUkFOR0UnIH1cbiAgICAgICAgICBdLFxuICAgICAgICAgIFByb2plY3Rpb246IHsgUHJvamVjdGlvblR5cGU6ICdBTEwnIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIEluZGV4TmFtZTogJ1N5bWJvbEluZGV4JyxcbiAgICAgICAgICBLZXlTY2hlbWE6IFtcbiAgICAgICAgICAgIHsgQXR0cmlidXRlTmFtZTogJ3N5bWJvbCcsIEtleVR5cGU6ICdIQVNIJyB9LFxuICAgICAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAndGltZXN0YW1wJywgS2V5VHlwZTogJ1JBTkdFJyB9XG4gICAgICAgICAgXSxcbiAgICAgICAgICBQcm9qZWN0aW9uOiB7IFByb2plY3Rpb25UeXBlOiAnQUxMJyB9XG4gICAgICAgIH1cbiAgICAgIF0pXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ1MzIGJ1Y2tldCBoYXMgY29ycmVjdCBjb25maWd1cmF0aW9uJywgKCkgPT4ge1xuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpTMzo6QnVja2V0Jywge1xuICAgICAgQnVja2V0RW5jcnlwdGlvbjoge1xuICAgICAgICBTZXJ2ZXJTaWRlRW5jcnlwdGlvbkNvbmZpZ3VyYXRpb246IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBTZXJ2ZXJTaWRlRW5jcnlwdGlvbkJ5RGVmYXVsdDoge1xuICAgICAgICAgICAgICBTU0VBbGdvcml0aG06ICdBRVMyNTYnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9LFxuICAgICAgVmVyc2lvbmluZ0NvbmZpZ3VyYXRpb246IHsgU3RhdHVzOiAnRW5hYmxlZCcgfSxcbiAgICAgIFB1YmxpY0FjY2Vzc0Jsb2NrQ29uZmlndXJhdGlvbjoge1xuICAgICAgICBCbG9ja1B1YmxpY0FjbHM6IHRydWUsXG4gICAgICAgIEJsb2NrUHVibGljUG9saWN5OiB0cnVlLFxuICAgICAgICBJZ25vcmVQdWJsaWNBY2xzOiB0cnVlLFxuICAgICAgICBSZXN0cmljdFB1YmxpY0J1Y2tldHM6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnSUFNIHJvbGVzIGhhdmUgY29ycmVjdCBwZXJtaXNzaW9ucycsICgpID0+IHtcbiAgICAvLyBDaGVjayB0aGF0IExhbWJkYSBleGVjdXRpb24gcm9sZSBpcyBjcmVhdGVkXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6Um9sZScsIHtcbiAgICAgIEFzc3VtZVJvbGVQb2xpY3lEb2N1bWVudDoge1xuICAgICAgICBTdGF0ZW1lbnQ6IFt7XG4gICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICAgIFByaW5jaXBhbDogeyBTZXJ2aWNlOiAnbGFtYmRhLmFtYXpvbmF3cy5jb20nIH1cbiAgICAgICAgfV1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnQWxsIHJlc291cmNlcyBhcmUgcHJvcGVybHkgdGFnZ2VkJywgKCkgPT4ge1xuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgVGFnczogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAgICB7IEtleTogJ1Byb2plY3QnLCBWYWx1ZTogJ1NpZ25hbDlBZHZpc29yJyB9XG4gICAgICAgIF0pXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZSgnQVdTOjpTMzo6QnVja2V0Jywge1xuICAgICAgUHJvcGVydGllczoge1xuICAgICAgICBUYWdzOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgIHsgS2V5OiAnUHJvamVjdCcsIFZhbHVlOiAnU2lnbmFsOUFkdmlzb3InIH1cbiAgICAgICAgXSlcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnQ2xvdWRGb3JtYXRpb24gb3V0cHV0cyBhcmUgY3JlYXRlZCcsICgpID0+IHtcbiAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ0Fzc2V0c1RhYmxlTmFtZScsIHt9KTtcbiAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ0Vhcm5pbmdzQ2FsZW5kYXJUYWJsZU5hbWUnLCB7fSk7XG4gICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdBbmFseXNpc1F1ZXVlVGFibGVOYW1lJywge30pO1xuICAgIHRlbXBsYXRlLmhhc091dHB1dCgnQW5hbHlzaXNEYXRhQnVja2V0TmFtZScsIHt9KTtcbiAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ0RhdGFQcm9jZXNzaW5nUm9sZUFybicsIHt9KTtcbiAgfSk7XG59KTsgIl19
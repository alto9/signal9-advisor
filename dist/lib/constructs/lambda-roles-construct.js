"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambdaRolesConstruct = void 0;
const cdk = require("aws-cdk-lib");
const iam = require("aws-cdk-lib/aws-iam");
const constructs_1 = require("constructs");
class LambdaRolesConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
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
exports.LambdaRolesConstruct = LambdaRolesConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLXJvbGVzLWNvbnN0cnVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9jb25zdHJ1Y3RzL2xhbWJkYS1yb2xlcy1jb25zdHJ1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLDJDQUEyQztBQUczQywyQ0FBdUM7QUFhdkMsTUFBYSxvQkFBcUIsU0FBUSxzQkFBUztJQUdqRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWdDO1FBQ3hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsNENBQTRDO1FBQzVDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQ2pFLFFBQVEsRUFBRSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSywrQkFBK0I7WUFDekcsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDO1lBQzNELGVBQWUsRUFBRTtnQkFDZixHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLDBDQUEwQyxDQUFDO2FBQ3ZGO1lBQ0QsY0FBYyxFQUFFO2dCQUNkLGdCQUFnQixFQUFFLElBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQztvQkFDdkMsVUFBVSxFQUFFO3dCQUNWLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQzs0QkFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSzs0QkFDeEIsT0FBTyxFQUFFO2dDQUNQLGtCQUFrQjtnQ0FDbEIsa0JBQWtCO2dDQUNsQixxQkFBcUI7Z0NBQ3JCLHFCQUFxQjtnQ0FDckIsZ0JBQWdCO2dDQUNoQixlQUFlOzZCQUNoQjs0QkFDRCxTQUFTLEVBQUU7Z0NBQ1QsS0FBSyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsUUFBUTtnQ0FDbkMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxRQUFRLFVBQVU7Z0NBQ2hELEtBQUssQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsUUFBUTtnQ0FDN0MsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsVUFBVTtnQ0FDMUQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRO2dDQUMxQyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsUUFBUSxVQUFVOzZCQUN4RDt5QkFDRixDQUFDO3FCQUNIO2lCQUNGLENBQUM7Z0JBQ0YsVUFBVSxFQUFFLElBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQztvQkFDakMsVUFBVSxFQUFFO3dCQUNWLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQzs0QkFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSzs0QkFDeEIsT0FBTyxFQUFFO2dDQUNQLGNBQWM7Z0NBQ2QsY0FBYztnQ0FDZCxpQkFBaUI7Z0NBQ2pCLGVBQWU7NkJBQ2hCOzRCQUNELFNBQVMsRUFBRTtnQ0FDVCxLQUFLLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLFNBQVM7Z0NBQ3JDLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLElBQUk7NkJBQzdDO3lCQUNGLENBQUM7cUJBQ0g7aUJBQ0YsQ0FBQztnQkFDRixnQkFBZ0IsRUFBRSxJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUM7b0JBQ3ZDLFVBQVUsRUFBRTt3QkFDVixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7NEJBQ3RCLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7NEJBQ3hCLE9BQU8sRUFBRTtnQ0FDUCxxQkFBcUI7Z0NBQ3JCLHNCQUFzQjtnQ0FDdEIsbUJBQW1COzZCQUNwQjs0QkFDRCxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7eUJBQ2pCLENBQUM7cUJBQ0g7aUJBQ0YsQ0FBQzthQUNIO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsZ0ZBQWdGO1FBQ2hGLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3ZFLEtBQUssQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDakYsS0FBSyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUU5RSx1QkFBdUI7UUFDdkIsS0FBSyxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDdEUsQ0FBQztDQUNGO0FBOUVELG9EQThFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5pbnRlcmZhY2UgTGFtYmRhUm9sZXNDb25zdHJ1Y3RQcm9wcyB7XG4gIGRhdGFiYXNlOiB7XG4gICAgYXNzZXRzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICAgIGVhcm5pbmdzQ2FsZW5kYXJUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gICAgYW5hbHlzaXNRdWV1ZVRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgfTtcbiAgczM6IHtcbiAgICBhbmFseXNpc0RhdGFCdWNrZXQ6IHMzLkJ1Y2tldDtcbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIExhbWJkYVJvbGVzQ29uc3RydWN0IGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGRhdGFQcm9jZXNzaW5nUm9sZTogaWFtLlJvbGU7XG4gIFxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTGFtYmRhUm9sZXNDb25zdHJ1Y3RQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG4gICAgXG4gICAgLy8gRGF0YSBQcm9jZXNzaW5nIFJvbGUgZm9yIExhbWJkYSBmdW5jdGlvbnNcbiAgICB0aGlzLmRhdGFQcm9jZXNzaW5nUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnRGF0YVByb2Nlc3NpbmdSb2xlJywge1xuICAgICAgcm9sZU5hbWU6IGAke2Nkay5TdGFjay5vZih0aGlzKS5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50JykgfHwgJ2Rldid9LXNpZ25hbDktZGF0YS1wcm9jZXNzaW5nLXJvbGVgLFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJyksXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlJylcbiAgICAgIF0sXG4gICAgICBpbmxpbmVQb2xpY2llczoge1xuICAgICAgICAnRHluYW1vREJBY2Nlc3MnOiBuZXcgaWFtLlBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpEZWxldGVJdGVtJyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpTY2FuJ1xuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICBwcm9wcy5kYXRhYmFzZS5hc3NldHNUYWJsZS50YWJsZUFybixcbiAgICAgICAgICAgICAgICBgJHtwcm9wcy5kYXRhYmFzZS5hc3NldHNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXG4gICAgICAgICAgICAgICAgcHJvcHMuZGF0YWJhc2UuZWFybmluZ3NDYWxlbmRhclRhYmxlLnRhYmxlQXJuLFxuICAgICAgICAgICAgICAgIGAke3Byb3BzLmRhdGFiYXNlLmVhcm5pbmdzQ2FsZW5kYXJUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXG4gICAgICAgICAgICAgICAgcHJvcHMuZGF0YWJhc2UuYW5hbHlzaXNRdWV1ZVRhYmxlLnRhYmxlQXJuLFxuICAgICAgICAgICAgICAgIGAke3Byb3BzLmRhdGFiYXNlLmFuYWx5c2lzUXVldWVUYWJsZS50YWJsZUFybn0vaW5kZXgvKmBcbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICBdXG4gICAgICAgIH0pLFxuICAgICAgICAnUzNBY2Nlc3MnOiBuZXcgaWFtLlBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICdzMzpHZXRPYmplY3QnLFxuICAgICAgICAgICAgICAgICdzMzpQdXRPYmplY3QnLFxuICAgICAgICAgICAgICAgICdzMzpEZWxldGVPYmplY3QnLFxuICAgICAgICAgICAgICAgICdzMzpMaXN0QnVja2V0J1xuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICBwcm9wcy5zMy5hbmFseXNpc0RhdGFCdWNrZXQuYnVja2V0QXJuLFxuICAgICAgICAgICAgICAgIGAke3Byb3BzLnMzLmFuYWx5c2lzRGF0YUJ1Y2tldC5idWNrZXRBcm59LypgXG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgXVxuICAgICAgICB9KSxcbiAgICAgICAgJ0Nsb3VkV2F0Y2hMb2dzJzogbmV3IGlhbS5Qb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXG4gICAgICAgICAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcbiAgICAgICAgICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIHJlc291cmNlczogWycqJ11cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgXVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgRHluYW1vREIgcGVybWlzc2lvbnMgdXNpbmcgdGFibGUgbWV0aG9kcyAoYWRkaXRpb25hbCBsYXllciBvZiBzZWN1cml0eSlcbiAgICBwcm9wcy5kYXRhYmFzZS5hc3NldHNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodGhpcy5kYXRhUHJvY2Vzc2luZ1JvbGUpO1xuICAgIHByb3BzLmRhdGFiYXNlLmVhcm5pbmdzQ2FsZW5kYXJUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodGhpcy5kYXRhUHJvY2Vzc2luZ1JvbGUpO1xuICAgIHByb3BzLmRhdGFiYXNlLmFuYWx5c2lzUXVldWVUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodGhpcy5kYXRhUHJvY2Vzc2luZ1JvbGUpO1xuXG4gICAgLy8gR3JhbnQgUzMgcGVybWlzc2lvbnNcbiAgICBwcm9wcy5zMy5hbmFseXNpc0RhdGFCdWNrZXQuZ3JhbnRSZWFkV3JpdGUodGhpcy5kYXRhUHJvY2Vzc2luZ1JvbGUpO1xuICB9XG59ICJdfQ==
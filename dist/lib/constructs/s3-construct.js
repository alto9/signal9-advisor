"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Construct = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const constructs_1 = require("constructs");
class S3Construct extends constructs_1.Construct {
    constructor(scope, id) {
        super(scope, id);
        // S3 bucket with encryption and lifecycle policies
        this.analysisDataBucket = new s3.Bucket(this, 'AnalysisDataBucket', {
            bucketName: `${cdk.Stack.of(this).node.tryGetContext('environment') || 'dev'}-signal9-analysis-data-${cdk.Stack.of(this).account}`,
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: true,
            lifecycleRules: [{
                    id: 'AnalysisDataLifecycle',
                    enabled: true,
                    transitions: [{
                            storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                            transitionAfter: cdk.Duration.days(30)
                        }, {
                            storageClass: s3.StorageClass.GLACIER,
                            transitionAfter: cdk.Duration.days(90)
                        }, {
                            storageClass: s3.StorageClass.DEEP_ARCHIVE,
                            transitionAfter: cdk.Duration.days(365)
                        }],
                    expiration: cdk.Duration.days(2555) // 7 years
                }],
            removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            objectOwnership: s3.ObjectOwnership.OBJECT_WRITER
        });
        // Add bucket policy for additional security
        this.analysisDataBucket.addToResourcePolicy(new cdk.aws_iam.PolicyStatement({
            effect: cdk.aws_iam.Effect.DENY,
            principals: [new cdk.aws_iam.AnyPrincipal()],
            actions: ['s3:*'],
            resources: [this.analysisDataBucket.arnForObjects('*')],
            conditions: {
                Bool: {
                    'aws:SecureTransport': 'false'
                }
            }
        }));
    }
}
exports.S3Construct = S3Construct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiczMtY29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL2NvbnN0cnVjdHMvczMtY29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyx5Q0FBeUM7QUFDekMsMkNBQXVDO0FBRXZDLE1BQWEsV0FBWSxTQUFRLHNCQUFTO0lBR3hDLFlBQVksS0FBZ0IsRUFBRSxFQUFVO1FBQ3RDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsbURBQW1EO1FBQ25ELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQ2xFLFVBQVUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSywwQkFBMEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFO1lBQ2xJLFVBQVUsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVTtZQUMxQyxTQUFTLEVBQUUsSUFBSTtZQUNmLGNBQWMsRUFBRSxDQUFDO29CQUNmLEVBQUUsRUFBRSx1QkFBdUI7b0JBQzNCLE9BQU8sRUFBRSxJQUFJO29CQUNiLFdBQVcsRUFBRSxDQUFDOzRCQUNaLFlBQVksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLGlCQUFpQjs0QkFDL0MsZUFBZSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzt5QkFDdkMsRUFBRTs0QkFDRCxZQUFZLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPOzRCQUNyQyxlQUFlLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO3lCQUN2QyxFQUFFOzRCQUNELFlBQVksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLFlBQVk7NEJBQzFDLGVBQWUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7eUJBQ3hDLENBQUM7b0JBQ0YsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVU7aUJBQy9DLENBQUM7WUFDRixhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsa0NBQWtDO1lBQzVFLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELFVBQVUsRUFBRSxJQUFJO1lBQ2hCLGVBQWUsRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLGFBQWE7U0FDbEQsQ0FBQyxDQUFDO1FBRUgsNENBQTRDO1FBQzVDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FDekMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQztZQUM5QixNQUFNLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSTtZQUMvQixVQUFVLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDNUMsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDO1lBQ2pCLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdkQsVUFBVSxFQUFFO2dCQUNWLElBQUksRUFBRTtvQkFDSixxQkFBcUIsRUFBRSxPQUFPO2lCQUMvQjthQUNGO1NBQ0YsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDO0NBQ0Y7QUEvQ0Qsa0NBK0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGNsYXNzIFMzQ29uc3RydWN0IGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGFuYWx5c2lzRGF0YUJ1Y2tldDogczMuQnVja2V0O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgLy8gUzMgYnVja2V0IHdpdGggZW5jcnlwdGlvbiBhbmQgbGlmZWN5Y2xlIHBvbGljaWVzXG4gICAgdGhpcy5hbmFseXNpc0RhdGFCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdBbmFseXNpc0RhdGFCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgJHtjZGsuU3RhY2sub2YodGhpcykubm9kZS50cnlHZXRDb250ZXh0KCdlbnZpcm9ubWVudCcpIHx8ICdkZXYnfS1zaWduYWw5LWFuYWx5c2lzLWRhdGEtJHtjZGsuU3RhY2sub2YodGhpcykuYWNjb3VudH1gLFxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFt7XG4gICAgICAgIGlkOiAnQW5hbHlzaXNEYXRhTGlmZWN5Y2xlJyxcbiAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgdHJhbnNpdGlvbnM6IFt7XG4gICAgICAgICAgc3RvcmFnZUNsYXNzOiBzMy5TdG9yYWdlQ2xhc3MuSU5GUkVRVUVOVF9BQ0NFU1MsXG4gICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cygzMClcbiAgICAgICAgfSwge1xuICAgICAgICAgIHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLkdMQUNJRVIsXG4gICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cyg5MClcbiAgICAgICAgfSwge1xuICAgICAgICAgIHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLkRFRVBfQVJDSElWRSxcbiAgICAgICAgICB0cmFuc2l0aW9uQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDM2NSlcbiAgICAgICAgfV0sXG4gICAgICAgIGV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDI1NTUpIC8vIDcgeWVhcnNcbiAgICAgIH1dLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gQ2hhbmdlIHRvIFJFVEFJTiBmb3IgcHJvZHVjdGlvblxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICBvYmplY3RPd25lcnNoaXA6IHMzLk9iamVjdE93bmVyc2hpcC5PQkpFQ1RfV1JJVEVSXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgYnVja2V0IHBvbGljeSBmb3IgYWRkaXRpb25hbCBzZWN1cml0eVxuICAgIHRoaXMuYW5hbHlzaXNEYXRhQnVja2V0LmFkZFRvUmVzb3VyY2VQb2xpY3koXG4gICAgICBuZXcgY2RrLmF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBjZGsuYXdzX2lhbS5FZmZlY3QuREVOWSxcbiAgICAgICAgcHJpbmNpcGFsczogW25ldyBjZGsuYXdzX2lhbS5BbnlQcmluY2lwYWwoKV0sXG4gICAgICAgIGFjdGlvbnM6IFsnczM6KiddLFxuICAgICAgICByZXNvdXJjZXM6IFt0aGlzLmFuYWx5c2lzRGF0YUJ1Y2tldC5hcm5Gb3JPYmplY3RzKCcqJyldLFxuICAgICAgICBjb25kaXRpb25zOiB7XG4gICAgICAgICAgQm9vbDoge1xuICAgICAgICAgICAgJ2F3czpTZWN1cmVUcmFuc3BvcnQnOiAnZmFsc2UnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICk7XG4gIH1cbn0gIl19
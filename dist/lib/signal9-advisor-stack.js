"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Signal9AdvisorStack = void 0;
const cdk = require("aws-cdk-lib");
const database_construct_1 = require("./constructs/database-construct");
const lambda_roles_construct_1 = require("./constructs/lambda-roles-construct");
const s3_construct_1 = require("./constructs/s3-construct");
const secrets_construct_1 = require("./constructs/secrets-construct");
const secrets_access_construct_1 = require("./constructs/secrets-access-construct");
const secrets_monitoring_construct_1 = require("./constructs/secrets-monitoring-construct");
class Signal9AdvisorStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Apply consistent tags across all resources
        cdk.Tags.of(this).add('Project', 'Signal9Advisor');
        cdk.Tags.of(this).add('Environment', 'development');
        cdk.Tags.of(this).add('Phase', 'Phase1');
        cdk.Tags.of(this).add('ManagedBy', 'CDK');
        // Create database construct
        const database = new database_construct_1.DatabaseConstruct(this, 'Database');
        // Create S3 construct
        const s3 = new s3_construct_1.S3Construct(this, 'S3');
        // Create secrets construct for API credentials
        const secrets = new secrets_construct_1.SecretsConstruct(this, 'Secrets');
        // Create secrets access construct for IAM policies
        const secretsAccess = new secrets_access_construct_1.SecretsAccessConstruct(this, 'SecretsAccess', {
            secret: secrets.apiCredentialsSecret
        });
        // Create secrets monitoring construct for CloudTrail and alarms
        const secretsMonitoring = new secrets_monitoring_construct_1.SecretsMonitoringConstruct(this, 'SecretsMonitoring', {
            secret: secrets.apiCredentialsSecret
        });
        // Create monitoring dashboard
        const monitoringDashboard = secretsMonitoring.createMonitoringDashboard();
        // Create Lambda roles construct with secrets access
        const lambdaRoles = new lambda_roles_construct_1.LambdaRolesConstruct(this, 'LambdaRoles', {
            database,
            s3
        });
        // Grant Lambda roles access to secrets
        secrets.apiCredentialsSecret.grantRead(lambdaRoles.dataProcessingRole);
        lambdaRoles.dataProcessingRole.addManagedPolicy(secretsAccess.secretsReaderPolicy);
        // Output important resource information
        new cdk.CfnOutput(this, 'AssetsTableName', {
            value: database.assetsTable.tableName,
            description: 'Name of the Assets DynamoDB table'
        });
        new cdk.CfnOutput(this, 'EarningsCalendarTableName', {
            value: database.earningsCalendarTable.tableName,
            description: 'Name of the Earnings Calendar DynamoDB table'
        });
        new cdk.CfnOutput(this, 'AnalysisQueueTableName', {
            value: database.analysisQueueTable.tableName,
            description: 'Name of the Analysis Queue DynamoDB table'
        });
        new cdk.CfnOutput(this, 'AnalysisDataBucketName', {
            value: s3.analysisDataBucket.bucketName,
            description: 'Name of the Analysis Data S3 bucket'
        });
        new cdk.CfnOutput(this, 'DataProcessingRoleArn', {
            value: lambdaRoles.dataProcessingRole.roleArn,
            description: 'ARN of the Data Processing Lambda role'
        });
        // Secrets-related outputs
        new cdk.CfnOutput(this, 'ApiCredentialsSecretArn', {
            value: secrets.apiCredentialsSecret.secretArn,
            description: 'ARN of the API credentials secret'
        });
        new cdk.CfnOutput(this, 'ApiCredentialsSecretName', {
            value: secrets.apiCredentialsSecret.secretName,
            description: 'Name of the API credentials secret'
        });
        new cdk.CfnOutput(this, 'SecretsReaderRoleArn', {
            value: secretsAccess.secretsReaderRole.roleArn,
            description: 'ARN of the Secrets Reader IAM role'
        });
        new cdk.CfnOutput(this, 'SecretsReaderPolicyArn', {
            value: secretsAccess.secretsReaderPolicy.managedPolicyArn,
            description: 'ARN of the Secrets Reader managed policy'
        });
        new cdk.CfnOutput(this, 'SecretRotationLambdaArn', {
            value: secrets.rotationLambda.functionArn,
            description: 'ARN of the secret rotation Lambda function'
        });
        new cdk.CfnOutput(this, 'SecretsCloudTrailArn', {
            value: secretsMonitoring.cloudTrail.trailArn,
            description: 'ARN of the CloudTrail for secrets monitoring'
        });
        new cdk.CfnOutput(this, 'SecretsMonitoringDashboardUrl', {
            value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${monitoringDashboard.dashboardName}`,
            description: 'URL to the secrets monitoring CloudWatch dashboard'
        });
        new cdk.CfnOutput(this, 'SecretsTrailBucketName', {
            value: secretsMonitoring.trailBucket.bucketName,
            description: 'Name of the S3 bucket for CloudTrail logs'
        });
        // Output helpful commands for secret population
        new cdk.CfnOutput(this, 'SecretPopulationCommand', {
            value: `cd signal9-advisor && ALPHAVANTAGE_API_KEY='your-key' ALPACA_API_KEY='your-key' ALPACA_API_SECRET='your-secret' ./scripts/populate-secrets.sh`,
            description: 'Command to populate the API credentials secret'
        });
        new cdk.CfnOutput(this, 'SecretTestCommand', {
            value: `aws secretsmanager get-secret-value --secret-id ${secrets.apiCredentialsSecret.secretName} --region ${this.region}`,
            description: 'Command to test secret retrieval'
        });
    }
}
exports.Signal9AdvisorStack = Signal9AdvisorStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnbmFsOS1hZHZpc29yLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL3NpZ25hbDktYWR2aXNvci1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFFbkMsd0VBQW9FO0FBQ3BFLGdGQUEyRTtBQUMzRSw0REFBd0Q7QUFDeEQsc0VBQWtFO0FBQ2xFLG9GQUErRTtBQUMvRSw0RkFBdUY7QUFFdkYsTUFBYSxtQkFBb0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNoRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLDZDQUE2QztRQUM3QyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNwRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3pDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFMUMsNEJBQTRCO1FBQzVCLE1BQU0sUUFBUSxHQUFHLElBQUksc0NBQWlCLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRXpELHNCQUFzQjtRQUN0QixNQUFNLEVBQUUsR0FBRyxJQUFJLDBCQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXZDLCtDQUErQztRQUMvQyxNQUFNLE9BQU8sR0FBRyxJ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QUM7SUFDTCxDQUFDO0NBQ0Y7QUF4SEQsa0RBd0hDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRGF0YWJhc2VDb25zdHJ1Y3QgfSBmcm9tICcuL2NvbnN0cnVjdHMvZGF0YWJhc2UtY29uc3RydWN0JztcbmltcG9ydCB7IExhbWJkYVJvbGVzQ29uc3RydWN0IH0gZnJvbSAnLi9jb25zdHJ1Y3RzL2xhbWJkYS1yb2xlcy1jb25zdHJ1Y3QnO1xuaW1wb3J0IHsgUzNDb25zdHJ1Y3QgfSBmcm9tICcuL2NvbnN0cnVjdHMvczMtY29uc3RydWN0JztcbmltcG9ydCB7IFNlY3JldHNDb25zdHJ1Y3QgfSBmcm9tICcuL2NvbnN0cnVjdHMvc2VjcmV0cy1jb25zdHJ1Y3QnO1xuaW1wb3J0IHsgU2VjcmV0c0FjY2Vzc0NvbnN0cnVjdCB9IGZyb20gJy4vY29uc3RydWN0cy9zZWNyZXRzLWFjY2Vzcy1jb25zdHJ1Y3QnO1xuaW1wb3J0IHsgU2VjcmV0c01vbml0b3JpbmdDb25zdHJ1Y3QgfSBmcm9tICcuL2NvbnN0cnVjdHMvc2VjcmV0cy1tb25pdG9yaW5nLWNvbnN0cnVjdCc7XG5cbmV4cG9ydCBjbGFzcyBTaWduYWw5QWR2aXNvclN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gQXBwbHkgY29uc2lzdGVudCB0YWdzIGFjcm9zcyBhbGwgcmVzb3VyY2VzXG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdQcm9qZWN0JywgJ1NpZ25hbDlBZHZpc29yJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdFbnZpcm9ubWVudCcsICdkZXZlbG9wbWVudCcpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnUGhhc2UnLCAnUGhhc2UxJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdNYW5hZ2VkQnknLCAnQ0RLJyk7XG5cbiAgICAvLyBDcmVhdGUgZGF0YWJhc2UgY29uc3RydWN0XG4gICAgY29uc3QgZGF0YWJhc2UgPSBuZXcgRGF0YWJhc2VDb25zdHJ1Y3QodGhpcywgJ0RhdGFiYXNlJyk7XG5cbiAgICAvLyBDcmVhdGUgUzMgY29uc3RydWN0XG4gICAgY29uc3QgczMgPSBuZXcgUzNDb25zdHJ1Y3QodGhpcywgJ1MzJyk7XG5cbiAgICAvLyBDcmVhdGUgc2VjcmV0cyBjb25zdHJ1Y3QgZm9yIEFQSSBjcmVkZW50aWFsc1xuICAgIGNvbnN0IHNlY3JldHMgPSBuZXcgU2VjcmV0c0NvbnN0cnVjdCh0aGlzLCAnU2VjcmV0cycpO1xuXG4gICAgLy8gQ3JlYXRlIHNlY3JldHMgYWNjZXNzIGNvbnN0cnVjdCBmb3IgSUFNIHBvbGljaWVzXG4gICAgY29uc3Qgc2VjcmV0c0FjY2VzcyA9IG5ldyBTZWNyZXRzQWNjZXNzQ29uc3RydWN0KHRoaXMsICdTZWNyZXRzQWNjZXNzJywge1xuICAgICAgc2VjcmV0OiBzZWNyZXRzLmFwaUNyZWRlbnRpYWxzU2VjcmV0XG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgc2VjcmV0cyBtb25pdG9yaW5nIGNvbnN0cnVjdCBmb3IgQ2xvdWRUcmFpbCBhbmQgYWxhcm1zXG4gICAgY29uc3Qgc2VjcmV0c01vbml0b3JpbmcgPSBuZXcgU2VjcmV0c01vbml0b3JpbmdDb25zdHJ1Y3QodGhpcywgJ1NlY3JldHNNb25pdG9yaW5nJywge1xuICAgICAgc2VjcmV0OiBzZWNyZXRzLmFwaUNyZWRlbnRpYWxzU2VjcmV0XG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgbW9uaXRvcmluZyBkYXNoYm9hcmRcbiAgICBjb25zdCBtb25pdG9yaW5nRGFzaGJvYXJkID0gc2VjcmV0c01vbml0b3JpbmcuY3JlYXRlTW9uaXRvcmluZ0Rhc2hib2FyZCgpO1xuXG4gICAgLy8gQ3JlYXRlIExhbWJkYSByb2xlcyBjb25zdHJ1Y3Qgd2l0aCBzZWNyZXRzIGFjY2Vzc1xuICAgIGNvbnN0IGxhbWJkYVJvbGVzID0gbmV3IExhbWJkYVJvbGVzQ29uc3RydWN0KHRoaXMsICdMYW1iZGFSb2xlcycsIHtcbiAgICAgIGRhdGFiYXNlLFxuICAgICAgczNcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IExhbWJkYSByb2xlcyBhY2Nlc3MgdG8gc2VjcmV0c1xuICAgIHNlY3JldHMuYXBpQ3JlZGVudGlhbHNTZWNyZXQuZ3JhbnRSZWFkKGxhbWJkYVJvbGVzLmRhdGFQcm9jZXNzaW5nUm9sZSk7XG4gICAgbGFtYmRhUm9sZXMuZGF0YVByb2Nlc3NpbmdSb2xlLmFkZE1hbmFnZWRQb2xpY3koc2VjcmV0c0FjY2Vzcy5zZWNyZXRzUmVhZGVyUG9saWN5KTtcblxuICAgIC8vIE91dHB1dCBpbXBvcnRhbnQgcmVzb3VyY2UgaW5mb3JtYXRpb25cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXNzZXRzVGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IGRhdGFiYXNlLmFzc2V0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnTmFtZSBvZiB0aGUgQXNzZXRzIER5bmFtb0RCIHRhYmxlJ1xuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Vhcm5pbmdzQ2FsZW5kYXJUYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogZGF0YWJhc2UuZWFybmluZ3NDYWxlbmRhclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnTmFtZSBvZiB0aGUgRWFybmluZ3MgQ2FsZW5kYXIgRHluYW1vREIgdGFibGUnXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQW5hbHlzaXNRdWV1ZVRhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiBkYXRhYmFzZS5hbmFseXNpc1F1ZXVlVGFibGUudGFibGVOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdOYW1lIG9mIHRoZSBBbmFseXNpcyBRdWV1ZSBEeW5hbW9EQiB0YWJsZSdcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBbmFseXNpc0RhdGFCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IHMzLmFuYWx5c2lzRGF0YUJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdOYW1lIG9mIHRoZSBBbmFseXNpcyBEYXRhIFMzIGJ1Y2tldCdcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEYXRhUHJvY2Vzc2luZ1JvbGVBcm4nLCB7XG4gICAgICB2YWx1ZTogbGFtYmRhUm9sZXMuZGF0YVByb2Nlc3NpbmdSb2xlLnJvbGVBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0FSTiBvZiB0aGUgRGF0YSBQcm9jZXNzaW5nIExhbWJkYSByb2xlJ1xuICAgIH0pO1xuXG4gICAgLy8gU2VjcmV0cy1yZWxhdGVkIG91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpQ3JlZGVudGlhbHNTZWNyZXRBcm4nLCB7XG4gICAgICB2YWx1ZTogc2VjcmV0cy5hcGlDcmVkZW50aWFsc1NlY3JldC5zZWNyZXRBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0FSTiBvZiB0aGUgQVBJIGNyZWRlbnRpYWxzIHNlY3JldCdcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlDcmVkZW50aWFsc1NlY3JldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogc2VjcmV0cy5hcGlDcmVkZW50aWFsc1NlY3JldC5zZWNyZXROYW1lISxcbiAgICAgIGRlc2NyaXB0aW9uOiAnTmFtZSBvZiB0aGUgQVBJIGNyZWRlbnRpYWxzIHNlY3JldCdcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTZWNyZXRzUmVhZGVyUm9sZUFybicsIHtcbiAgICAgIHZhbHVlOiBzZWNyZXRzQWNjZXNzLnNlY3JldHNSZWFkZXJSb2xlLnJvbGVBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0FSTiBvZiB0aGUgU2VjcmV0cyBSZWFkZXIgSUFNIHJvbGUnXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU2VjcmV0c1JlYWRlclBvbGljeUFybicsIHtcbiAgICAgIHZhbHVlOiBzZWNyZXRzQWNjZXNzLnNlY3JldHNSZWFkZXJQb2xpY3kubWFuYWdlZFBvbGljeUFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBTZWNyZXRzIFJlYWRlciBtYW5hZ2VkIHBvbGljeSdcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTZWNyZXRSb3RhdGlvbkxhbWJkYUFybicsIHtcbiAgICAgIHZhbHVlOiBzZWNyZXRzLnJvdGF0aW9uTGFtYmRhLmZ1bmN0aW9uQXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdBUk4gb2YgdGhlIHNlY3JldCByb3RhdGlvbiBMYW1iZGEgZnVuY3Rpb24nXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU2VjcmV0c0Nsb3VkVHJhaWxBcm4nLCB7XG4gICAgICB2YWx1ZTogc2VjcmV0c01vbml0b3JpbmcuY2xvdWRUcmFpbC50cmFpbEFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBDbG91ZFRyYWlsIGZvciBzZWNyZXRzIG1vbml0b3JpbmcnXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU2VjcmV0c01vbml0b3JpbmdEYXNoYm9hcmRVcmwnLCB7XG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHt0aGlzLnJlZ2lvbn0uY29uc29sZS5hd3MuYW1hem9uLmNvbS9jbG91ZHdhdGNoL2hvbWU/cmVnaW9uPSR7dGhpcy5yZWdpb259I2Rhc2hib2FyZHM6bmFtZT0ke21vbml0b3JpbmdEYXNoYm9hcmQuZGFzaGJvYXJkTmFtZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdVUkwgdG8gdGhlIHNlY3JldHMgbW9uaXRvcmluZyBDbG91ZFdhdGNoIGRhc2hib2FyZCdcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTZWNyZXRzVHJhaWxCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IHNlY3JldHNNb25pdG9yaW5nLnRyYWlsQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ05hbWUgb2YgdGhlIFMzIGJ1Y2tldCBmb3IgQ2xvdWRUcmFpbCBsb2dzJ1xuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0IGhlbHBmdWwgY29tbWFuZHMgZm9yIHNlY3JldCBwb3B1bGF0aW9uXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1NlY3JldFBvcHVsYXRpb25Db21tYW5kJywge1xuICAgICAgdmFsdWU6IGBjZCBzaWduYWw5LWFkdmlzb3IgJiYgQUxQSEFWQU5UQUdFX0FQSV9LRVk9J3lvdXIta2V5JyBBTFBBQ0FfQVBJX0tFWT0neW91ci1rZXknIEFMUEFDQV9BUElfU0VDUkVUPSd5b3VyLXNlY3JldCcgLi9zY3JpcHRzL3BvcHVsYXRlLXNlY3JldHMuc2hgLFxuICAgICAgZGVzY3JpcHRpb246ICdDb21tYW5kIHRvIHBvcHVsYXRlIHRoZSBBUEkgY3JlZGVudGlhbHMgc2VjcmV0J1xuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1NlY3JldFRlc3RDb21tYW5kJywge1xuICAgICAgdmFsdWU6IGBhd3Mgc2VjcmV0c21hbmFnZXIgZ2V0LXNlY3JldC12YWx1ZSAtLXNlY3JldC1pZCAke3NlY3JldHMuYXBpQ3JlZGVudGlhbHNTZWNyZXQuc2VjcmV0TmFtZSF9IC0tcmVnaW9uICR7dGhpcy5yZWdpb259YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29tbWFuZCB0byB0ZXN0IHNlY3JldCByZXRyaWV2YWwnXG4gICAgfSk7XG4gIH1cbn0gIl19
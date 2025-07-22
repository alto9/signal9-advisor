"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretsConstruct = void 0;
const cdk = require("aws-cdk-lib");
const secretsmanager = require("aws-cdk-lib/aws-secretsmanager");
const lambda = require("aws-cdk-lib/aws-lambda");
const constructs_1 = require("constructs");
class SecretsConstruct extends constructs_1.Construct {
    constructor(scope, id) {
        super(scope, id);
        // Create rotation Lambda function
        this.rotationLambda = new lambda.Function(this, 'SecretRotationFunction', {
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'index.handler',
            code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Secret rotation triggered:', JSON.stringify(event, null, 2));
          
          // Custom rotation logic for external API keys
          // For external APIs like AlphaVantage/Alpaca, rotation is typically manual
          // This function logs the rotation attempt and provides notification
          
          const { SecretId, Step } = event;
          
          switch (Step) {
            case 'createSecret':
              console.log('Step: Creating new secret version');
              // For external APIs, this would typically involve generating new API keys
              // through the provider's API or notifying administrators
              break;
              
            case 'setSecret':
              console.log('Step: Setting new secret in rotation');
              // This step would update the secret with new credentials
              break;
              
            case 'testSecret':
              console.log('Step: Testing new secret');
              // Test the new credentials against the APIs
              break;
              
            case 'finishSecret':
              console.log('Step: Finishing rotation');
              // Cleanup and complete the rotation
              break;
              
            default:
              throw new Error(\`Invalid step: \${Step}\`);
          }
          
          return {
            statusCode: 200,
            body: JSON.stringify({
              message: 'Rotation step completed',
              step: Step,
              secretId: SecretId,
              timestamp: new Date().toISOString()
            })
          };
        };
      `),
            timeout: cdk.Duration.minutes(5),
            description: 'Handles rotation of external API credentials',
            environment: {
                LOG_LEVEL: 'INFO'
            }
        });
        // Create secret for external API credentials
        this.apiCredentialsSecret = new secretsmanager.Secret(this, 'ApiCredentialsSecret', {
            secretName: 'signal9-advisor/api-credentials',
            description: 'External API credentials for AlphaVantage and Alpaca APIs',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    alphaVantageApiKey: '',
                    alpacaApiKey: '',
                    alpacaApiSecret: '',
                    lastUpdated: new Date().toISOString()
                }),
                generateStringKey: 'placeholder',
                excludeCharacters: '"@/\\',
                requireEachIncludedType: true,
                includeSpace: false
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY // Change to RETAIN for production
        });
        // Configure automatic rotation every 90 days
        this.apiCredentialsSecret.addRotationSchedule('RotationSchedule', {
            rotationLambda: this.rotationLambda,
            automaticallyAfter: cdk.Duration.days(90),
            rotateImmediatelyOnUpdate: false
        });
        // Add resource tags for identification and access control
        cdk.Tags.of(this.apiCredentialsSecret).add('Project', 'Signal9Advisor');
        cdk.Tags.of(this.apiCredentialsSecret).add('Component', 'SecretsManager');
        cdk.Tags.of(this.apiCredentialsSecret).add('Environment', cdk.Stack.of(this).node.tryGetContext('environment') || 'development');
        cdk.Tags.of(this.rotationLambda).add('Project', 'Signal9Advisor');
        cdk.Tags.of(this.rotationLambda).add('Component', 'SecretRotation');
    }
}
exports.SecretsConstruct = SecretsConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy1jb25zdHJ1Y3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvY29uc3RydWN0cy9zZWNyZXRzLWNvbnN0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMsaUVBQWlFO0FBQ2pFLGlEQUFpRDtBQUNqRCwyQ0FBdUM7QUFFdkMsTUFBYSxnQkFBaUIsU0FBUSxzQkFBUztJQUk3QyxZQUFZLEtBQWdCLEVBQUUsRUFBVTtRQUN0QyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLGtDQUFrQztRQUNsQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDeEUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0E4QzVCLENBQUM7WUFDRixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLFdBQVcsRUFBRSw4Q0FBOEM7WUFDM0QsV0FBVyxFQUFFO2dCQUNYLFNBQVMsRUFBRSxNQUFNO2FBQ2xCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQ2xGLFVBQVUsRUFBRSxpQ0FBaUM7WUFDN0MsV0FBVyxFQUFFLDJEQUEyRDtZQUN4RSxvQkFBb0IsRUFBRTtnQkFDcEIsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkMsa0JBQWtCLEVBQUUsRUFBRTtvQkFDdEIsWUFBWSxFQUFFLEVBQUU7b0JBQ2hCLGVBQWUsRUFBRSxFQUFFO29CQUNuQixXQUFXLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7aUJBQ3RDLENBQUM7Z0JBQ0YsaUJBQWlCLEVBQUUsYUFBYTtnQkFDaEMsaUJBQWlCLEVBQUUsT0FBTztnQkFDMUIsdUJBQXVCLEVBQUUsSUFBSTtnQkFDN0IsWUFBWSxFQUFFLEtBQUs7YUFDcEI7WUFDRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsa0NBQWtDO1NBQzVFLENBQUMsQ0FBQztRQUVILDZDQUE2QztRQUM3QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsbUJBQW1CLENBQUMsa0JBQWtCLEVBQUU7WUFDaEUsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO1lBQ25DLGtCQUFrQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN6Qyx5QkFBeUIsRUFBRSxLQUFLO1NBQ2pDLENBQUMsQ0FBQztRQUVILDBEQUEwRDtRQUMxRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDeEUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxhQUFhLENBQUMsQ0FBQztRQUNqSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2xFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDdEUsQ0FBQztDQUNGO0FBbEdELDRDQWtHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBzZWNyZXRzbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBjbGFzcyBTZWNyZXRzQ29uc3RydWN0IGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGFwaUNyZWRlbnRpYWxzU2VjcmV0OiBzZWNyZXRzbWFuYWdlci5TZWNyZXQ7XG4gIHB1YmxpYyByZWFkb25seSByb3RhdGlvbkxhbWJkYTogbGFtYmRhLkZ1bmN0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgLy8gQ3JlYXRlIHJvdGF0aW9uIExhbWJkYSBmdW5jdGlvblxuICAgIHRoaXMucm90YXRpb25MYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTZWNyZXRSb3RhdGlvbkZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIyX1gsXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tSW5saW5lKGBcbiAgICAgICAgZXhwb3J0cy5oYW5kbGVyID0gYXN5bmMgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1NlY3JldCByb3RhdGlvbiB0cmlnZ2VyZWQ6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBDdXN0b20gcm90YXRpb24gbG9naWMgZm9yIGV4dGVybmFsIEFQSSBrZXlzXG4gICAgICAgICAgLy8gRm9yIGV4dGVybmFsIEFQSXMgbGlrZSBBbHBoYVZhbnRhZ2UvQWxwYWNhLCByb3RhdGlvbiBpcyB0eXBpY2FsbHkgbWFudWFsXG4gICAgICAgICAgLy8gVGhpcyBmdW5jdGlvbiBsb2dzIHRoZSByb3RhdGlvbiBhdHRlbXB0IGFuZCBwcm92aWRlcyBub3RpZmljYXRpb25cbiAgICAgICAgICBcbiAgICAgICAgICBjb25zdCB7IFNlY3JldElkLCBTdGVwIH0gPSBldmVudDtcbiAgICAgICAgICBcbiAgICAgICAgICBzd2l0Y2ggKFN0ZXApIHtcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZVNlY3JldCc6XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTdGVwOiBDcmVhdGluZyBuZXcgc2VjcmV0IHZlcnNpb24nKTtcbiAgICAgICAgICAgICAgLy8gRm9yIGV4dGVybmFsIEFQSXMsIHRoaXMgd291bGQgdHlwaWNhbGx5IGludm9sdmUgZ2VuZXJhdGluZyBuZXcgQVBJIGtleXNcbiAgICAgICAgICAgICAgLy8gdGhyb3VnaCB0aGUgcHJvdmlkZXIncyBBUEkgb3Igbm90aWZ5aW5nIGFkbWluaXN0cmF0b3JzXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ3NldFNlY3JldCc6XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTdGVwOiBTZXR0aW5nIG5ldyBzZWNyZXQgaW4gcm90YXRpb24nKTtcbiAgICAgICAgICAgICAgLy8gVGhpcyBzdGVwIHdvdWxkIHVwZGF0ZSB0aGUgc2VjcmV0IHdpdGggbmV3IGNyZWRlbnRpYWxzXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ3Rlc3RTZWNyZXQnOlxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU3RlcDogVGVzdGluZyBuZXcgc2VjcmV0Jyk7XG4gICAgICAgICAgICAgIC8vIFRlc3QgdGhlIG5ldyBjcmVkZW50aWFscyBhZ2FpbnN0IHRoZSBBUElzXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ2ZpbmlzaFNlY3JldCc6XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTdGVwOiBGaW5pc2hpbmcgcm90YXRpb24nKTtcbiAgICAgICAgICAgICAgLy8gQ2xlYW51cCBhbmQgY29tcGxldGUgdGhlIHJvdGF0aW9uXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcXGBJbnZhbGlkIHN0ZXA6IFxcJHtTdGVwfVxcYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdSb3RhdGlvbiBzdGVwIGNvbXBsZXRlZCcsXG4gICAgICAgICAgICAgIHN0ZXA6IFN0ZXAsXG4gICAgICAgICAgICAgIHNlY3JldElkOiBTZWNyZXRJZCxcbiAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICAgIGApLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICBkZXNjcmlwdGlvbjogJ0hhbmRsZXMgcm90YXRpb24gb2YgZXh0ZXJuYWwgQVBJIGNyZWRlbnRpYWxzJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIExPR19MRVZFTDogJ0lORk8nXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgc2VjcmV0IGZvciBleHRlcm5hbCBBUEkgY3JlZGVudGlhbHNcbiAgICB0aGlzLmFwaUNyZWRlbnRpYWxzU2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnQXBpQ3JlZGVudGlhbHNTZWNyZXQnLCB7XG4gICAgICBzZWNyZXROYW1lOiAnc2lnbmFsOS1hZHZpc29yL2FwaS1jcmVkZW50aWFscycsXG4gICAgICBkZXNjcmlwdGlvbjogJ0V4dGVybmFsIEFQSSBjcmVkZW50aWFscyBmb3IgQWxwaGFWYW50YWdlIGFuZCBBbHBhY2EgQVBJcycsXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xuICAgICAgICBzZWNyZXRTdHJpbmdUZW1wbGF0ZTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIGFscGhhVmFudGFnZUFwaUtleTogJycsXG4gICAgICAgICAgYWxwYWNhQXBpS2V5OiAnJyxcbiAgICAgICAgICBhbHBhY2FBcGlTZWNyZXQ6ICcnLFxuICAgICAgICAgIGxhc3RVcGRhdGVkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgfSksXG4gICAgICAgIGdlbmVyYXRlU3RyaW5nS2V5OiAncGxhY2Vob2xkZXInLFxuICAgICAgICBleGNsdWRlQ2hhcmFjdGVyczogJ1wiQC9cXFxcJyxcbiAgICAgICAgcmVxdWlyZUVhY2hJbmNsdWRlZFR5cGU6IHRydWUsXG4gICAgICAgIGluY2x1ZGVTcGFjZTogZmFsc2VcbiAgICAgIH0sXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZIC8vIENoYW5nZSB0byBSRVRBSU4gZm9yIHByb2R1Y3Rpb25cbiAgICB9KTtcblxuICAgIC8vIENvbmZpZ3VyZSBhdXRvbWF0aWMgcm90YXRpb24gZXZlcnkgOTAgZGF5c1xuICAgIHRoaXMuYXBpQ3JlZGVudGlhbHNTZWNyZXQuYWRkUm90YXRpb25TY2hlZHVsZSgnUm90YXRpb25TY2hlZHVsZScsIHtcbiAgICAgIHJvdGF0aW9uTGFtYmRhOiB0aGlzLnJvdGF0aW9uTGFtYmRhLFxuICAgICAgYXV0b21hdGljYWxseUFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cyg5MCksXG4gICAgICByb3RhdGVJbW1lZGlhdGVseU9uVXBkYXRlOiBmYWxzZVxuICAgIH0pO1xuXG4gICAgLy8gQWRkIHJlc291cmNlIHRhZ3MgZm9yIGlkZW50aWZpY2F0aW9uIGFuZCBhY2Nlc3MgY29udHJvbFxuICAgIGNkay5UYWdzLm9mKHRoaXMuYXBpQ3JlZGVudGlhbHNTZWNyZXQpLmFkZCgnUHJvamVjdCcsICdTaWduYWw5QWR2aXNvcicpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMuYXBpQ3JlZGVudGlhbHNTZWNyZXQpLmFkZCgnQ29tcG9uZW50JywgJ1NlY3JldHNNYW5hZ2VyJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hcGlDcmVkZW50aWFsc1NlY3JldCkuYWRkKCdFbnZpcm9ubWVudCcsIGNkay5TdGFjay5vZih0aGlzKS5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50JykgfHwgJ2RldmVsb3BtZW50Jyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5yb3RhdGlvbkxhbWJkYSkuYWRkKCdQcm9qZWN0JywgJ1NpZ25hbDlBZHZpc29yJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5yb3RhdGlvbkxhbWJkYSkuYWRkKCdDb21wb25lbnQnLCAnU2VjcmV0Um90YXRpb24nKTtcbiAgfVxufSAiXX0=
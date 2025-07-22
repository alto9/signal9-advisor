import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class S3Construct extends Construct {
  public readonly analysisDataBucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
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
    this.analysisDataBucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.DENY,
        principals: [new cdk.aws_iam.AnyPrincipal()],
        actions: ['s3:*'],
        resources: [this.analysisDataBucket.arnForObjects('*')],
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false'
          }
        }
      })
    );
  }
} 
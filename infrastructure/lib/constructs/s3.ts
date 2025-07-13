import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface S3ConstructProps {
  config: EnvironmentConfig;
}

export class S3Construct extends Construct {
  public readonly staticAssetsBucket: s3.Bucket;
  public readonly apiCacheBucket: s3.Bucket;
  public readonly backupBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: S3ConstructProps) {
    super(scope, id);

    const { config } = props;

    this.staticAssetsBucket = new s3.Bucket(this, 'StaticAssetsBucket', {
      bucketName: `signal9-static-${config.stage}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{
        id: 'DeleteOldVersions',
        noncurrentVersionExpiration: cdk.Duration.days(30)
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    this.staticAssetsBucket.addCorsRule({
      allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
      allowedOrigins: ['https://app.signal9.com'],
      allowedHeaders: ['*'],
      maxAge: 3000
    });

    this.apiCacheBucket = new s3.Bucket(this, 'ApiCacheBucket', {
      bucketName: `signal9-api-cache-${config.stage}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(30)
        },
        {
          id: 'DeleteOldCacheData',
          expiration: cdk.Duration.days(90)
        }
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    this.backupBucket = new s3.Bucket(this, 'BackupBucket', {
      bucketName: `signal9-backup-${config.stage}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(90)
        },
        {
          id: 'TransitionToIA',
          transitions: [{
            storageClass: s3.StorageClass.INFREQUENT_ACCESS,
            transitionAfter: cdk.Duration.days(30)
          }]
        },
        {
          id: 'TransitionToGlacier',
          transitions: [{
            storageClass: s3.StorageClass.GLACIER,
            transitionAfter: cdk.Duration.days(90)
          }]
        }
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    cdk.Tags.of(this.staticAssetsBucket).add('Name', `Signal9-StaticAssets-${config.stage}`);
    cdk.Tags.of(this.staticAssetsBucket).add('Project', 'Signal9');
    cdk.Tags.of(this.staticAssetsBucket).add('Environment', config.stage);
    cdk.Tags.of(this.staticAssetsBucket).add('Purpose', 'StaticAssets');

    cdk.Tags.of(this.apiCacheBucket).add('Name', `Signal9-ApiCache-${config.stage}`);
    cdk.Tags.of(this.apiCacheBucket).add('Project', 'Signal9');
    cdk.Tags.of(this.apiCacheBucket).add('Environment', config.stage);
    cdk.Tags.of(this.apiCacheBucket).add('Purpose', 'ApiCache');

    cdk.Tags.of(this.backupBucket).add('Name', `Signal9-Backup-${config.stage}`);
    cdk.Tags.of(this.backupBucket).add('Project', 'Signal9');
    cdk.Tags.of(this.backupBucket).add('Environment', config.stage);
    cdk.Tags.of(this.backupBucket).add('Purpose', 'Backup');
  }
}

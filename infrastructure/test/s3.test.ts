import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { Signal9Stack } from '../lib/stacks/signal9-stack';
import { getConfig } from '../lib/config/environment';

describe('S3 Infrastructure', () => {
  let app: cdk.App;
  let stack: Signal9Stack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    const config = getConfig('dev');
    stack = new Signal9Stack(app, 'TestSignal9Stack', {
      env: config.env,
      config: config
    });
    template = Template.fromStack(stack);
  });

  test('Static Assets bucket is created with correct configuration', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'signal9-static-dev',
      VersioningConfiguration: {
        Status: 'Enabled'
      },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256'
            }
          }
        ]
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true
      },
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          {
            Id: 'DeleteOldVersions',
            Status: 'Enabled',
            NoncurrentVersionExpiration: {
              NoncurrentDays: 30
            }
          }
        ])
      }
    });
  });

  test('Static Assets bucket has CORS configuration', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'signal9-static-dev',
      CorsConfiguration: {
        CorsRules: [
          {
            AllowedMethods: ['GET', 'HEAD'],
            AllowedOrigins: ['https://app.signal9.com'],
            AllowedHeaders: ['*'],
            MaxAge: 3000
          }
        ]
      }
    });
  });

  test('API Cache bucket is created with correct configuration', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'signal9-api-cache-dev',
      VersioningConfiguration: {
        Status: 'Enabled'
      },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256'
            }
          }
        ]
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true
      },
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          {
            Id: 'DeleteOldVersions',
            Status: 'Enabled',
            NoncurrentVersionExpiration: {
              NoncurrentDays: 30
            }
          },
          {
            Id: 'DeleteOldCacheData',
            Status: 'Enabled',
            ExpirationInDays: 90
          }
        ])
      }
    });
  });

  test('Backup bucket is created with storage class transitions', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'signal9-backup-dev',
      VersioningConfiguration: {
        Status: 'Enabled'
      },
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          {
            Id: 'DeleteOldVersions',
            Status: 'Enabled',
            NoncurrentVersionExpiration: {
              NoncurrentDays: 90
            }
          },
          {
            Id: 'TransitionToIA',
            Status: 'Enabled',
            Transitions: [
              {
                StorageClass: 'STANDARD_IA',
                TransitionInDays: 30
              }
            ]
          },
          {
            Id: 'TransitionToGlacier',
            Status: 'Enabled',
            Transitions: [
              {
                StorageClass: 'GLACIER',
                TransitionInDays: 90
              }
            ]
          }
        ])
      }
    });
  });

  test('All buckets have encryption enabled', () => {
    template.resourceCountIs('AWS::S3::Bucket', 3);
    
    const buckets = template.findResources('AWS::S3::Bucket');
    Object.values(buckets).forEach(bucket => {
      expect(bucket.Properties.BucketEncryption.ServerSideEncryptionConfiguration).toBeDefined();
      expect(bucket.Properties.BucketEncryption.ServerSideEncryptionConfiguration[0].ServerSideEncryptionByDefault.SSEAlgorithm).toBe('AES256');
    });
  });

  test('All buckets block public access', () => {
    const buckets = template.findResources('AWS::S3::Bucket');
    Object.values(buckets).forEach(bucket => {
      expect(bucket.Properties.PublicAccessBlockConfiguration.BlockPublicAcls).toBe(true);
      expect(bucket.Properties.PublicAccessBlockConfiguration.BlockPublicPolicy).toBe(true);
      expect(bucket.Properties.PublicAccessBlockConfiguration.IgnorePublicAcls).toBe(true);
      expect(bucket.Properties.PublicAccessBlockConfiguration.RestrictPublicBuckets).toBe(true);
    });
  });

  test('All buckets have versioning enabled', () => {
    const buckets = template.findResources('AWS::S3::Bucket');
    Object.values(buckets).forEach(bucket => {
      expect(bucket.Properties.VersioningConfiguration.Status).toBe('Enabled');
    });
  });

  test('Buckets are tagged appropriately', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        { Key: 'Project', Value: 'Signal9' }
      ])
    });
    
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        { Key: 'Environment', Value: 'dev' }
      ])
    });

    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        { Key: 'Purpose', Value: 'StaticAssets' }
      ])
    });

    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        { Key: 'Purpose', Value: 'ApiCache' }
      ])
    });

    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        { Key: 'Purpose', Value: 'Backup' }
      ])
    });
  });

  test('S3 works across different environments', () => {
    const testApp = new cdk.App();
    const testConfig = getConfig('test');
    const testStack = new Signal9Stack(testApp, 'TestSignal9StackTest', {
      env: testConfig.env,
      config: testConfig
    });
    const testTemplate = Template.fromStack(testStack);

    testTemplate.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'signal9-static-test'
    });

    testTemplate.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'signal9-api-cache-test'
    });

    testTemplate.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'signal9-backup-test'
    });
  });

  test('Bucket count matches expected', () => {
    template.resourceCountIs('AWS::S3::Bucket', 3);
    
    const buckets = template.findResources('AWS::S3::Bucket');
    
    const staticBucket = Object.values(buckets).find(bucket => 
      bucket.Properties.BucketName === 'signal9-static-dev'
    );
    expect(staticBucket).toBeDefined();

    const cacheBucket = Object.values(buckets).find(bucket => 
      bucket.Properties.BucketName === 'signal9-api-cache-dev'
    );
    expect(cacheBucket).toBeDefined();

    const backupBucket = Object.values(buckets).find(bucket => 
      bucket.Properties.BucketName === 'signal9-backup-dev'
    );
    expect(backupBucket).toBeDefined();
  });

  test('Static Assets bucket does not have CORS on other buckets', () => {
    const buckets = template.findResources('AWS::S3::Bucket');
    
    const cacheBucket = Object.values(buckets).find(bucket => 
      bucket.Properties.BucketName === 'signal9-api-cache-dev'
    );
    expect(cacheBucket?.Properties.CorsConfiguration).toBeUndefined();

    const backupBucket = Object.values(buckets).find(bucket => 
      bucket.Properties.BucketName === 'signal9-backup-dev'
    );
    expect(backupBucket?.Properties.CorsConfiguration).toBeUndefined();
  });
});

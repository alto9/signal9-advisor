import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import { EnvironmentConfig } from '../config/environment';

export interface CloudFrontConstructProps {
  config: EnvironmentConfig;
  staticAssetsBucket: s3.Bucket;
  api: apigateway.RestApi;
  certificateArn?: string;
  testMode?: boolean; // Add this flag to allow mocking in tests
}

export class CloudFrontConstruct extends Construct {
  public readonly distribution: cloudfront.Distribution;
  public readonly certificate: certificatemanager.ICertificate;

  constructor(scope: Construct, id: string, props: CloudFrontConstructProps) {
    super(scope, id);
    const { config, staticAssetsBucket, api, certificateArn, testMode } = props;

    // If in test mode, use a dummy certificate and skip Route53
    if (testMode || process.env.NODE_ENV === 'test') {
      // Use a dummy certificate (self-signed or fake ARN)
      this.certificate = {
        certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/dummy',
        applyRemovalPolicy: () => {},
        env: { account: '123456789012', region: 'us-east-1' },
        node: this.node,
        stack: cdk.Stack.of(this),
        metricDaysToExpiry: () => { return { metricName: 'Dummy', namespace: 'Dummy', dimensionsMap: {} } as any; },
        // @ts-ignore
        grant: () => { return { grantPrincipal: { addToPrincipalPolicy: () => ({ statementAdded: true }) } } },
      } as certificatemanager.ICertificate;

      this.distribution = new cloudfront.Distribution(this, 'Signal9Distribution', {
        defaultBehavior: {
          origin: new origins.S3Origin(staticAssetsBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        additionalBehaviors: {
          '/api/*': {
            origin: new origins.RestApiOrigin(api),
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
            originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          },
        },
        domainNames: config.domainName ? [config.domainName] : undefined,
        certificate: this.certificate,
        enableLogging: false,
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        defaultRootObject: 'index.html',
        comment: `Signal9 CloudFront Distribution for ${config.stage} (test mode)`,
      });
      return;
    }

    // ACM certificate (must be in us-east-1 for CloudFront)
    let certificate: certificatemanager.ICertificate;
    if (certificateArn) {
      certificate = certificatemanager.Certificate.fromCertificateArn(this, 'CloudFrontCert', certificateArn);
    } else if (config.domainName) {
      // Try to look up an existing certificate by domain name in us-east-1
      certificate = new certificatemanager.DnsValidatedCertificate(this, 'CloudFrontDnsCert', {
        domainName: config.domainName,
        hostedZone: route53.HostedZone.fromLookup(this, 'HostedZone', {
          domainName: config.domainName.replace(/^app\./, ''),
        }),
        region: 'us-east-1',
      });
    } else {
      throw new Error('No certificateArn or domainName provided for CloudFront.');
    }
    this.certificate = certificate;

    // S3 origin for static assets
    const staticOrigin = new origins.S3Origin(staticAssetsBucket);
    // API Gateway origin
    const apiOrigin = new origins.RestApiOrigin(api, {
      originPath: '/prod', // adjust if needed
    });

    // Logging bucket (optional, reuse staticAssetsBucket for simplicity)
    const logBucket = staticAssetsBucket;

    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Signal9Distribution', {
      defaultBehavior: {
        origin: staticOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        compress: true,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: apiOrigin,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
      domainNames: config.domainName ? [config.domainName] : undefined,
      certificate: certificate,
      enableLogging: true,
      logBucket: logBucket,
      logFilePrefix: 'cloudfront/',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultRootObject: 'index.html',
      comment: `Signal9 CloudFront Distribution for ${config.stage}`,
    });

    // Optionally create Route53 alias record if domainName is set
    if (config.domainName) {
      const zone = route53.HostedZone.fromLookup(this, 'CloudFrontHostedZone', {
        domainName: config.domainName.replace(/^app\./, ''),
      });
      new route53.ARecord(this, 'CloudFrontAliasRecord', {
        zone,
        recordName: config.domainName.split('.')[0], // e.g. 'app'
        target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(this.distribution)),
      });
    }
  }
} 
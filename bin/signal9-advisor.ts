#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Signal9AdvisorStack } from '../lib/signal9-advisor-stack';

const app = new cdk.App();
new Signal9AdvisorStack(app, 'Signal9AdvisorStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
}); 
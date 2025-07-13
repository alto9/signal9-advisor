#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Signal9Stack } from '../lib/stacks/signal9-stack';
import { getConfig } from '../lib/config/environment';

const app = new cdk.App();

const environment = app.node.tryGetContext('environment') || 'dev';
const config = getConfig(environment);

new Signal9Stack(app, 'Signal9Stack', {
  env: config.env,
  config: config,
  description: `Signal9 Investment Advisor Platform - ${config.stage} environment`
});

app.synth();

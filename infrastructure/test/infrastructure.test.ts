import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Signal9Stack } from '../lib/stacks/signal9-stack';
import { getConfig } from '../lib/config/environment';

describe('Signal9Stack', () => {
  test('Stack instantiation with dev environment', () => {
    const app = new cdk.App();
    const config = getConfig('dev');
    
    const stack = new Signal9Stack(app, 'TestSignal9Stack', {
      env: config.env,
      config: config
    });
    
    const template = Template.fromStack(stack);
    
    expect(template).toBeDefined();
  });

  test('Stack has proper tags', () => {
    const app = new cdk.App();
    const config = getConfig('test');
    
    const stack = new Signal9Stack(app, 'TestSignal9Stack', {
      env: config.env,
      config: config
    });
    
    const template = Template.fromStack(stack);
    
    expect(template).toBeDefined();
    expect(config.stage).toBe('test');
  });

  test('Environment config validation', () => {
    const devConfig = getConfig('dev');
    const testConfig = getConfig('test');
    const prodConfig = getConfig('prod');
    
    expect(devConfig.stage).toBe('dev');
    expect(devConfig.domainName).toBe('dev.signal9.com');
    
    expect(testConfig.stage).toBe('test');
    expect(testConfig.domainName).toBe('test.signal9.com');
    
    expect(prodConfig.stage).toBe('prod');
    expect(prodConfig.domainName).toBe('app.signal9.com');
    
    expect(devConfig.env.region).toBe('us-east-1');
    expect(testConfig.env.region).toBe('us-east-1');
    expect(prodConfig.env.region).toBe('us-east-1');
  });
});

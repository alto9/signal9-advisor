export interface EnvironmentConfig {
  env: {
    account?: string;
    region: string;
  };
  stage: string;
  domainName?: string;
  certificateArn?: string;
}

export function getConfig(environment: string): EnvironmentConfig {
  switch (environment) {
    case 'dev':
      return {
        env: {
          region: 'us-east-1'
        },
        stage: 'dev',
        domainName: 'dev.signal9.com'
      };
    
    case 'test':
      return {
        env: {
          region: 'us-east-1'
        },
        stage: 'test',
        domainName: 'test.signal9.com'
      };
    
    case 'prod':
      return {
        env: {
          region: 'us-east-1'
        },
        stage: 'prod',
        domainName: 'app.signal9.com'
      };
    
    default:
      return {
        env: {
          region: 'us-east-1'
        },
        stage: 'dev',
        domainName: 'dev.signal9.com'
      };
  }
}

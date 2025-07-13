import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { Signal9Stack } from '../lib/stacks/signal9-stack';
import { getConfig } from '../lib/config/environment';

describe('DynamoDB Infrastructure', () => {
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

  test('Users table is created with correct configuration', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'Signal9-Users-dev',
      KeySchema: [
        {
          AttributeName: 'userId',
          KeyType: 'HASH'
        }
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'userId',
          AttributeType: 'S'
        }
      ],
      BillingMode: 'PAY_PER_REQUEST',
      SSESpecification: {
        SSEEnabled: true
      },
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true
      }
    });
  });

  test('Assets table is created with correct configuration and GSIs', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'Signal9-Assets-dev',
      KeySchema: [
        {
          AttributeName: 'ticker',
          KeyType: 'HASH'
        }
      ],
      AttributeDefinitions: Match.arrayWith([
        {
          AttributeName: 'ticker',
          AttributeType: 'S'
        },
        {
          AttributeName: 'companyName',
          AttributeType: 'S'
        },
        {
          AttributeName: 'sector',
          AttributeType: 'S'
        }
      ]),
      GlobalSecondaryIndexes: Match.arrayWith([
        {
          IndexName: 'CompanyNameIndex',
          KeySchema: [
            {
              AttributeName: 'companyName',
              KeyType: 'HASH'
            }
          ],
          Projection: {
            ProjectionType: 'ALL'
          }
        },
        {
          IndexName: 'SectorIndex',
          KeySchema: [
            {
              AttributeName: 'sector',
              KeyType: 'HASH'
            }
          ],
          Projection: {
            ProjectionType: 'ALL'
          }
        }
      ])
    });
  });

  test('Financials table is created with composite key and GSI', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'Signal9-Financials-dev',
      KeySchema: [
        {
          AttributeName: 'ticker',
          KeyType: 'HASH'
        },
        {
          AttributeName: 'reportTypeDate',
          KeyType: 'RANGE'
        }
      ],
      AttributeDefinitions: Match.arrayWith([
        {
          AttributeName: 'ticker',
          AttributeType: 'S'
        },
        {
          AttributeName: 'reportTypeDate',
          AttributeType: 'S'
        },
        {
          AttributeName: 'reportType',
          AttributeType: 'S'
        },
        {
          AttributeName: 'reportDate',
          AttributeType: 'S'
        }
      ]),
      GlobalSecondaryIndexes: Match.arrayWith([
        {
          IndexName: 'ReportTypeIndex',
          KeySchema: [
            {
              AttributeName: 'reportType',
              KeyType: 'HASH'
            },
            {
              AttributeName: 'reportDate',
              KeyType: 'RANGE'
            }
          ],
          Projection: {
            ProjectionType: 'ALL'
          }
        }
      ])
    });
  });

  test('News table is created with timestamp sort key and sentiment GSI', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'Signal9-News-dev',
      KeySchema: [
        {
          AttributeName: 'ticker',
          KeyType: 'HASH'
        },
        {
          AttributeName: 'timestamp',
          KeyType: 'RANGE'
        }
      ],
      GlobalSecondaryIndexes: Match.arrayWith([
        {
          IndexName: 'TimestampIndex',
          KeySchema: [
            {
              AttributeName: 'timestamp',
              KeyType: 'HASH'
            }
          ],
          Projection: {
            ProjectionType: 'ALL'
          }
        },
        {
          IndexName: 'SentimentIndex',
          KeySchema: [
            {
              AttributeName: 'sentiment',
              KeyType: 'HASH'
            },
            {
              AttributeName: 'timestamp',
              KeyType: 'RANGE'
            }
          ],
          Projection: {
            ProjectionType: 'ALL'
          }
        }
      ])
    });
  });

  test('TimeSeries table is created with composite partition key', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'Signal9-TimeSeries-dev',
      KeySchema: [
        {
          AttributeName: 'tickerDataType',
          KeyType: 'HASH'
        },
        {
          AttributeName: 'timestamp',
          KeyType: 'RANGE'
        }
      ],
      GlobalSecondaryIndexes: Match.arrayWith([
        {
          IndexName: 'DataTypeIndex',
          KeySchema: [
            {
              AttributeName: 'dataType',
              KeyType: 'HASH'
            },
            {
              AttributeName: 'timestamp',
              KeyType: 'RANGE'
            }
          ],
          Projection: {
            ProjectionType: 'ALL'
          }
        }
      ])
    });
  });

  test('All tables have encryption enabled', () => {
    template.resourceCountIs('AWS::DynamoDB::Table', 5);
    
    const tables = template.findResources('AWS::DynamoDB::Table');
    Object.values(tables).forEach(table => {
      expect(table.Properties.SSESpecification.SSEEnabled).toBe(true);
    });
  });

  test('All tables have point-in-time recovery enabled', () => {
    const tables = template.findResources('AWS::DynamoDB::Table');
    Object.values(tables).forEach(table => {
      expect(table.Properties.PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled).toBe(true);
    });
  });

  test('All tables use on-demand billing', () => {
    const tables = template.findResources('AWS::DynamoDB::Table');
    Object.values(tables).forEach(table => {
      expect(table.Properties.BillingMode).toBe('PAY_PER_REQUEST');
    });
  });

  test('Tables are tagged appropriately', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      Tags: Match.arrayWith([
        { Key: 'Project', Value: 'Signal9' }
      ])
    });
    
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      Tags: Match.arrayWith([
        { Key: 'Environment', Value: 'dev' }
      ])
    });
  });

  test('DynamoDB works across different environments', () => {
    const testApp = new cdk.App();
    const testConfig = getConfig('test');
    const testStack = new Signal9Stack(testApp, 'TestSignal9StackTest', {
      env: testConfig.env,
      config: testConfig
    });
    const testTemplate = Template.fromStack(testStack);

    testTemplate.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'Signal9-Users-test'
    });

    testTemplate.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'Signal9-Assets-test'
    });
  });

  test('GSI count matches expected for each table', () => {
    const tables = template.findResources('AWS::DynamoDB::Table');
    
    const usersTable = Object.values(tables).find(table => 
      table.Properties.TableName === 'Signal9-Users-dev'
    );
    expect(usersTable?.Properties.GlobalSecondaryIndexes).toBeUndefined();

    const assetsTable = Object.values(tables).find(table => 
      table.Properties.TableName === 'Signal9-Assets-dev'
    );
    expect(assetsTable?.Properties.GlobalSecondaryIndexes).toHaveLength(2);

    const financialsTable = Object.values(tables).find(table => 
      table.Properties.TableName === 'Signal9-Financials-dev'
    );
    expect(financialsTable?.Properties.GlobalSecondaryIndexes).toHaveLength(1);

    const newsTable = Object.values(tables).find(table => 
      table.Properties.TableName === 'Signal9-News-dev'
    );
    expect(newsTable?.Properties.GlobalSecondaryIndexes).toHaveLength(2);

    const timeSeriesTable = Object.values(tables).find(table => 
      table.Properties.TableName === 'Signal9-TimeSeries-dev'
    );
    expect(timeSeriesTable?.Properties.GlobalSecondaryIndexes).toHaveLength(1);
  });
});

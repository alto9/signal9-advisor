"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConstruct = void 0;
const cdk = require("aws-cdk-lib");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const constructs_1 = require("constructs");
class DatabaseConstruct extends constructs_1.Construct {
    constructor(scope, id) {
        super(scope, id);
        // Assets table with GSI for symbol lookups
        this.assetsTable = new dynamodb.Table(this, 'AssetsTable', {
            tableName: `${cdk.Stack.of(this).node.tryGetContext('environment') || 'dev'}-signal9-assets`,
            partitionKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
            removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            timeToLiveAttribute: 'ttl'
        });
        // Add GSI for symbol lookups
        this.assetsTable.addGlobalSecondaryIndex({
            indexName: 'SymbolIndex',
            partitionKey: { name: 'symbol', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'asset_id', type: dynamodb.AttributeType.STRING }
        });
        // Earnings Calendar table with date-based access patterns
        this.earningsCalendarTable = new dynamodb.Table(this, 'EarningsCalendarTable', {
            tableName: `${cdk.Stack.of(this).node.tryGetContext('environment') || 'dev'}-signal9-earnings-calendar`,
            partitionKey: { name: 'date', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'symbol', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
            removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            timeToLiveAttribute: 'ttl'
        });
        // Add GSI for symbol-based queries
        this.earningsCalendarTable.addGlobalSecondaryIndex({
            indexName: 'SymbolDateIndex',
            partitionKey: { name: 'symbol', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'date', type: dynamodb.AttributeType.STRING }
        });
        // Analysis Queue table with status tracking capabilities
        this.analysisQueueTable = new dynamodb.Table(this, 'AnalysisQueueTable', {
            tableName: `${cdk.Stack.of(this).node.tryGetContext('environment') || 'dev'}-signal9-analysis-queue`,
            partitionKey: { name: 'queue_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
            removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            timeToLiveAttribute: 'ttl'
        });
        // Add GSI for status-based queries
        this.analysisQueueTable.addGlobalSecondaryIndex({
            indexName: 'StatusIndex',
            partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING }
        });
        // Add GSI for symbol-based queries
        this.analysisQueueTable.addGlobalSecondaryIndex({
            indexName: 'SymbolIndex',
            partitionKey: { name: 'symbol', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING }
        });
        // Configure auto-scaling for all tables (for on-demand billing, this is handled automatically)
        // But we can still configure read/write capacity if needed for provisioned billing
        this.configureAutoScaling();
    }
    configureAutoScaling() {
        // For on-demand billing, DynamoDB automatically scales
        // This method is included for future reference if switching to provisioned billing
        // Example auto-scaling configuration for provisioned billing:
        /*
        this.assetsTable.autoScaleReadCapacity({
          minCapacity: 1,
          maxCapacity: 10
        }).scaleOnUtilization({
          targetUtilizationPercent: 70
        });
    
        this.assetsTable.autoScaleWriteCapacity({
          minCapacity: 1,
          maxCapacity: 10
        }).scaleOnUtilization({
          targetUtilizationPercent: 70
        });
        */
    }
}
exports.DatabaseConstruct = DatabaseConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWJhc2UtY29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL2NvbnN0cnVjdHMvZGF0YWJhc2UtY29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxxREFBcUQ7QUFDckQsMkNBQXVDO0FBRXZDLE1BQWEsaUJBQWtCLFNBQVEsc0JBQVM7SUFLOUMsWUFBWSxLQUFnQixFQUFFLEVBQVU7UUFDdEMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQiwyQ0FBMkM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUN6RCxTQUFTLEVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssaUJBQWlCO1lBQzVGLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3ZFLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsZ0NBQWdDLEVBQUUsRUFBRSwwQkFBMEIsRUFBRSxJQUFJLEVBQUU7WUFDdEUsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLGtDQUFrQztZQUM1RSxVQUFVLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXO1lBQ2hELG1CQUFtQixFQUFFLEtBQUs7U0FDM0IsQ0FBQyxDQUFDO1FBRUgsNkJBQTZCO1FBQzdCLElBQUksQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUM7WUFDdkMsU0FBUyxFQUFFLGFBQWE7WUFDeEIsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUs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QUFtQztRQUNuQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsdUJBQXVCLENBQUM7WUFDOUMsU0FBUyxFQUFFLGFBQWE7WUFDeEIsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDckUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7U0FDcEUsQ0FBQyxDQUFDO1FBRUgsK0ZBQStGO1FBQy9GLG1GQUFtRjtRQUNuRixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBRU8sb0JBQW9CO1FBQzFCLHVEQUF1RDtRQUN2RCxtRkFBbUY7UUFFbkYsOERBQThEO1FBQzlEOzs7Ozs7Ozs7Ozs7OztVQWNFO0lBQ0osQ0FBQztDQUNGO0FBakdELDhDQWlHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBjbGFzcyBEYXRhYmFzZUNvbnN0cnVjdCBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSBhc3NldHNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHB1YmxpYyByZWFkb25seSBlYXJuaW5nc0NhbGVuZGFyVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBwdWJsaWMgcmVhZG9ubHkgYW5hbHlzaXNRdWV1ZVRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIC8vIEFzc2V0cyB0YWJsZSB3aXRoIEdTSSBmb3Igc3ltYm9sIGxvb2t1cHNcbiAgICB0aGlzLmFzc2V0c1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdBc3NldHNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogYCR7Y2RrLlN0YWNrLm9mKHRoaXMpLm5vZGUudHJ5R2V0Q29udGV4dCgnZW52aXJvbm1lbnQnKSB8fCAnZGV2J30tc2lnbmFsOS1hc3NldHNgLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdhc3NldF9pZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeVNwZWNpZmljYXRpb246IHsgcG9pbnRJblRpbWVSZWNvdmVyeUVuYWJsZWQ6IHRydWUgfSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIENoYW5nZSB0byBSRVRBSU4gZm9yIHByb2R1Y3Rpb25cbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICAgIHRpbWVUb0xpdmVBdHRyaWJ1dGU6ICd0dGwnXG4gICAgfSk7XG4gICAgXG4gICAgLy8gQWRkIEdTSSBmb3Igc3ltYm9sIGxvb2t1cHNcbiAgICB0aGlzLmFzc2V0c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ1N5bWJvbEluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnc3ltYm9sJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2Fzc2V0X2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfVxuICAgIH0pO1xuXG4gICAgLy8gRWFybmluZ3MgQ2FsZW5kYXIgdGFibGUgd2l0aCBkYXRlLWJhc2VkIGFjY2VzcyBwYXR0ZXJuc1xuICAgIHRoaXMuZWFybmluZ3NDYWxlbmRhclRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdFYXJuaW5nc0NhbGVuZGFyVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGAke2Nkay5TdGFjay5vZih0aGlzKS5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50JykgfHwgJ2Rldid9LXNpZ25hbDktZWFybmluZ3MtY2FsZW5kYXJgLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdkYXRlJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3N5bWJvbCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeVNwZWNpZmljYXRpb246IHsgcG9pbnRJblRpbWVSZWNvdmVyeUVuYWJsZWQ6IHRydWUgfSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIENoYW5nZSB0byBSRVRBSU4gZm9yIHByb2R1Y3Rpb25cbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICAgIHRpbWVUb0xpdmVBdHRyaWJ1dGU6ICd0dGwnXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgR1NJIGZvciBzeW1ib2wtYmFzZWQgcXVlcmllc1xuICAgIHRoaXMuZWFybmluZ3NDYWxlbmRhclRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ1N5bWJvbERhdGVJbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3N5bWJvbCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdkYXRlJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfVxuICAgIH0pO1xuXG4gICAgLy8gQW5hbHlzaXMgUXVldWUgdGFibGUgd2l0aCBzdGF0dXMgdHJhY2tpbmcgY2FwYWJpbGl0aWVzXG4gICAgdGhpcy5hbmFseXNpc1F1ZXVlVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0FuYWx5c2lzUXVldWVUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogYCR7Y2RrLlN0YWNrLm9mKHRoaXMpLm5vZGUudHJ5R2V0Q29udGV4dCgnZW52aXJvbm1lbnQnKSB8fCAnZGV2J30tc2lnbmFsOS1hbmFseXNpcy1xdWV1ZWAsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3F1ZXVlX2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeVNwZWNpZmljYXRpb246IHsgcG9pbnRJblRpbWVSZWNvdmVyeUVuYWJsZWQ6IHRydWUgfSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIENoYW5nZSB0byBSRVRBSU4gZm9yIHByb2R1Y3Rpb25cbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICAgIHRpbWVUb0xpdmVBdHRyaWJ1dGU6ICd0dGwnXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgR1NJIGZvciBzdGF0dXMtYmFzZWQgcXVlcmllc1xuICAgIHRoaXMuYW5hbHlzaXNRdWV1ZVRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ1N0YXR1c0luZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnc3RhdHVzJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH1cbiAgICB9KTtcblxuICAgIC8vIEFkZCBHU0kgZm9yIHN5bWJvbC1iYXNlZCBxdWVyaWVzXG4gICAgdGhpcy5hbmFseXNpc1F1ZXVlVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnU3ltYm9sSW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdzeW1ib2wnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfVxuICAgIH0pO1xuXG4gICAgLy8gQ29uZmlndXJlIGF1dG8tc2NhbGluZyBmb3IgYWxsIHRhYmxlcyAoZm9yIG9uLWRlbWFuZCBiaWxsaW5nLCB0aGlzIGlzIGhhbmRsZWQgYXV0b21hdGljYWxseSlcbiAgICAvLyBCdXQgd2UgY2FuIHN0aWxsIGNvbmZpZ3VyZSByZWFkL3dyaXRlIGNhcGFjaXR5IGlmIG5lZWRlZCBmb3IgcHJvdmlzaW9uZWQgYmlsbGluZ1xuICAgIHRoaXMuY29uZmlndXJlQXV0b1NjYWxpbmcoKTtcbiAgfVxuXG4gIHByaXZhdGUgY29uZmlndXJlQXV0b1NjYWxpbmcoKTogdm9pZCB7XG4gICAgLy8gRm9yIG9uLWRlbWFuZCBiaWxsaW5nLCBEeW5hbW9EQiBhdXRvbWF0aWNhbGx5IHNjYWxlc1xuICAgIC8vIFRoaXMgbWV0aG9kIGlzIGluY2x1ZGVkIGZvciBmdXR1cmUgcmVmZXJlbmNlIGlmIHN3aXRjaGluZyB0byBwcm92aXNpb25lZCBiaWxsaW5nXG4gICAgXG4gICAgLy8gRXhhbXBsZSBhdXRvLXNjYWxpbmcgY29uZmlndXJhdGlvbiBmb3IgcHJvdmlzaW9uZWQgYmlsbGluZzpcbiAgICAvKlxuICAgIHRoaXMuYXNzZXRzVGFibGUuYXV0b1NjYWxlUmVhZENhcGFjaXR5KHtcbiAgICAgIG1pbkNhcGFjaXR5OiAxLFxuICAgICAgbWF4Q2FwYWNpdHk6IDEwXG4gICAgfSkuc2NhbGVPblV0aWxpemF0aW9uKHtcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogNzBcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXRzVGFibGUuYXV0b1NjYWxlV3JpdGVDYXBhY2l0eSh7XG4gICAgICBtaW5DYXBhY2l0eTogMSxcbiAgICAgIG1heENhcGFjaXR5OiAxMFxuICAgIH0pLnNjYWxlT25VdGlsaXphdGlvbih7XG4gICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IDcwXG4gICAgfSk7XG4gICAgKi9cbiAgfVxufSAiXX0=
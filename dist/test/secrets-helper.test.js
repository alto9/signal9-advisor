"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const secrets_helper_1 = require("../lib/utils/secrets-helper");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
// Mock the AWS SDK
jest.mock('@aws-sdk/client-secrets-manager');
const mockSecretsManagerClient = client_secrets_manager_1.SecretsManagerClient;
const mockSend = jest.fn();
describe('SecretsHelper', () => {
    let secretsHelper;
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        mockSend.mockReset();
        // Create a new instance each time to avoid cache persistence
        secretsHelper = new secrets_helper_1.SecretsHelper('test-secret-name');
        // Ensure our mock is properly set up for each test
        mockSecretsManagerClient.mockImplementation(() => ({
            send: mockSend,
        }));
    });
    describe('constructor', () => {
        test('should create instance with default parameters', () => {
            const helper = new secrets_helper_1.SecretsHelper();
            expect(helper).toBeInstanceOf(secrets_helper_1.SecretsHelper);
        });
        test('should create instance with custom parameters', () => {
            const helper = new secrets_helper_1.SecretsHelper('custom-secret', {
                region: 'us-west-2',
                cacheTimeoutMinutes: 10,
                maxRetries: 5,
                baseRetryDelayMs: 2000
            });
            expect(helper).toBeInstanceOf(secrets_helper_1.SecretsHelper);
        });
    });
    describe('getApiCredentials', () => {
        const validCredentials = {
            alphaVantageApiKey: 'test-alphavantage-key-12345',
            alpacaApiKey: 'test-alpaca-key-1234567890123456',
            alpacaApiSecret: 'test-alpaca-secret-1234567890123456',
            lastUpdated: '2024-01-01T00:00:00Z'
        };
        test('should successfully retrieve and validate API credentials', async () => {
            const mockResponse = {
                SecretString: JSON.stringify(validCredentials)
            };
            mockSend.mockResolvedValueOnce(mockResponse);
            const credentials = await secretsHelper.getApiCredentials();
            expect(credentials).toEqual(validCredentials);
            expect(mockSend).toHaveBeenCalledWith(expect.any(client_secrets_manager_1.GetSecretValueCommand));
        });
        test('should use cached credentials within cache period', async () => {
            const mockResponse = {
                SecretString: JSON.stringify(validCredentials)
            };
            mockSend.mockResolvedValueOnce(mockResponse);
            // First call should hit the API
            const credentials1 = await secretsHelper.getApiCredentials();
            expect(mockSend).toHaveBeenCalledTimes(1);
            // Second call should use cache
            const credentials2 = await secretsHelper.getApiCredentials();
            expect(mockSend).toHaveBeenCalledTimes(1);
            expect(credentials1).toEqual(credentials2);
        });
        test('should refresh cache after expiration', async () => {
            // Create helper with very short cache timeout for testing
            const shortCacheHelper = new secrets_helper_1.SecretsHelper('test-secret', {
                cacheTimeoutMinutes: 0.001 // ~60ms
            });
            const mockResponse = {
                SecretString: JSON.stringify(validCredentials)
            };
            mockSend.mockResolvedValue(mockResponse);
            // First call
            await shortCacheHelper.getApiCredentials();
            expect(mockSend).toHaveBeenCalledTimes(1);
            // Wait for cache to expire
            await new Promise(resolve => setTimeout(resolve, 100));
            // Second call should hit the API again
            await shortCacheHelper.getApiCredentials();
            expect(mockSend).toHaveBeenCalledTimes(2);
        });
        test('should throw error for empty secret string', async () => {
            const mockResponse = {
                SecretString: undefined
            };
            mockSend.mockResolvedValueOnce(mockResponse);
            await expect(secretsHelper.getApiCredentials()).rejects.toThrow('Secret string is empty or not found');
        });
        test('should throw error for invalid JSON', async () => {
            const mockResponse = {
                SecretString: 'invalid-json{'
            };
            mockSend.mockResolvedValueOnce(mockResponse);
            await expect(secretsHelper.getApiCredentials()).rejects.toThrow('Failed to parse secret JSON');
        });
        test('should throw error for missing alphaVantageApiKey', async () => {
            const incompleteCredentials = {
                alpacaApiKey: 'test-alpaca-key-1234567890123456',
                alpacaApiSecret: 'test-alpaca-secret-1234567890123456'
            };
            const mockResponse = {
                SecretString: JSON.stringify(incompleteCredentials)
            };
            mockSend.mockResolvedValueOnce(mockResponse);
            await expect(secretsHelper.getApiCredentials()).rejects.toThrow('Missing or empty required API credentials: alphaVantageApiKey');
        });
        test('should throw error for missing alpacaApiKey', async () => {
            const incompleteCredentials = {
                alphaVantageApiKey: 'test-alphavantage-key-12345',
                alpacaApiSecret: 'test-alpaca-secret-1234567890123456'
            };
            const mockResponse = {
                SecretString: JSON.stringify(incompleteCredentials)
            };
            mockSend.mockResolvedValueOnce(mockResponse);
            await expect(secretsHelper.getApiCredentials()).rejects.toThrow('Missing or empty required API credentials: alpacaApiKey');
        });
        test('should throw error for missing alpacaApiSecret', async () => {
            const incompleteCredentials = {
                alphaVantageApiKey: 'test-alphavantage-key-12345',
                alpacaApiKey: 'test-alpaca-key-1234567890123456'
            };
            const mockResponse = {
                SecretString: JSON.stringify(incompleteCredentials)
            };
            mockSend.mockResolvedValueOnce(mockResponse);
            await expect(secretsHelper.getApiCredentials()).rejects.toThrow('Missing or empty required API credentials: alpacaApiSecret');
        });
        test('should throw error for invalid alphaVantageApiKey format', async () => {
            const invalidCredentials = {
                alphaVantageApiKey: 'short',
                alpacaApiKey: 'test-alpaca-key-1234567890123456',
                alpacaApiSecret: 'test-alpaca-secret-1234567890123456'
            };
            const mockResponse = {
                SecretString: JSON.stringify(invalidCredentials)
            };
            mockSend.mockResolvedValueOnce(mockResponse);
            await expect(secretsHelper.getApiCredentials()).rejects.toThrow('Invalid AlphaVantage API key format');
        });
        test('should throw error for invalid alpacaApiKey format', async () => {
            const invalidCredentials = {
                alphaVantageApiKey: 'test-alphavantage-key-12345',
                alpacaApiKey: 'short',
                alpacaApiSecret: 'test-alpaca-secret-1234567890123456'
            };
            const mockResponse = {
                SecretString: JSON.stringify(invalidCredentials)
            };
            mockSend.mockResolvedValueOnce(mockResponse);
            await expect(secretsHelper.getApiCredentials()).rejects.toThrow('Invalid Alpaca API key format');
        });
        test('should throw error for invalid alpacaApiSecret format', async () => {
            const invalidCredentials = {
                alphaVantageApiKey: 'test-alphavantage-key-12345',
                alpacaApiKey: 'test-alpaca-key-1234567890123456',
                alpacaApiSecret: 'short'
            };
            const mockResponse = {
                SecretString: JSON.stringify(invalidCredentials)
            };
            mockSend.mockResolvedValueOnce(mockResponse);
            await expect(secretsHelper.getApiCredentials()).rejects.toThrow('Invalid Alpaca API secret format');
        });
        test('should trim whitespace from credentials', async () => {
            const credentialsWithWhitespace = {
                alphaVantageApiKey: '  test-alphavantage-key-12345  ',
                alpacaApiKey: '  test-alpaca-key-1234567890123456  ',
                alpacaApiSecret: '  test-alpaca-secret-1234567890123456  '
            };
            const mockResponse = {
                SecretString: JSON.stringify(credentialsWithWhitespace)
            };
            mockSend.mockResolvedValueOnce(mockResponse);
            const credentials = await secretsHelper.getApiCredentials();
            expect(credentials.alphaVantageApiKey).toBe('test-alphavantage-key-12345');
            expect(credentials.alpacaApiKey).toBe('test-alpaca-key-1234567890123456');
            expect(credentials.alpacaApiSecret).toBe('test-alpaca-secret-1234567890123456');
        });
        test('should retry on AWS API failures', async () => {
            const mockResponse = {
                SecretString: JSON.stringify(validCredentials)
            };
            // Mock first two calls to fail, third to succeed
            mockSend
                .mockRejectedValueOnce(new Error('Service temporarily unavailable'))
                .mockRejectedValueOnce(new Error('Service temporarily unavailable'))
                .mockResolvedValueOnce(mockResponse);
            const credentials = await secretsHelper.getApiCredentials();
            expect(credentials).toEqual(validCredentials);
            expect(mockSend).toHaveBeenCalledTimes(3);
        });
        test('should fail after max retries exceeded', async () => {
            mockSend.mockRejectedValue(new Error('Persistent service failure'));
            await expect(secretsHelper.getApiCredentials()).rejects.toThrow('Failed to get API credentials: Persistent service failure');
            expect(mockSend).toHaveBeenCalledTimes(3); // Default max retries
        });
    });
    describe('clearCache', () => {
        test('should clear cached credentials', async () => {
            const mockResponse = {
                SecretString: JSON.stringify({
                    alphaVantageApiKey: 'test-alphavantage-key-12345',
                    alpacaApiKey: 'test-alpaca-key-1234567890123456',
                    alpacaApiSecret: 'test-alpaca-secret-1234567890123456'
                })
            };
            mockSend.mockResolvedValue(mockResponse);
            // First call to populate cache
            await secretsHelper.getApiCredentials();
            expect(mockSend).toHaveBeenCalledTimes(1);
            // Clear cache
            secretsHelper.clearCache();
            // Second call should hit the API again
            await secretsHelper.getApiCredentials();
            expect(mockSend).toHaveBeenCalledTimes(2);
        });
    });
    describe('getCacheStats', () => {
        test('should return empty cache stats initially', () => {
            const stats = secretsHelper.getCacheStats();
            expect(stats.size).toBe(0);
            expect(stats.entries).toEqual([]);
        });
        test('should return cache stats after credentials are cached', async () => {
            const mockResponse = {
                SecretString: JSON.stringify({
                    alphaVantageApiKey: 'test-alphavantage-key-12345',
                    alpacaApiKey: 'test-alpaca-key-1234567890123456',
                    alpacaApiSecret: 'test-alpaca-secret-1234567890123456'
                })
            };
            mockSend.mockResolvedValueOnce(mockResponse);
            await secretsHelper.getApiCredentials();
            const stats = secretsHelper.getCacheStats();
            expect(stats.size).toBe(1);
            expect(stats.entries).toContain('test-secret-name');
        });
    });
    describe('testCredentials', () => {
        test('should return true for valid credentials', async () => {
            const mockResponse = {
                SecretString: JSON.stringify({
                    alphaVantageApiKey: 'test-alphavantage-key-12345',
                    alpacaApiKey: 'test-alpaca-key-1234567890123456',
                    alpacaApiSecret: 'test-alpaca-secret-1234567890123456'
                })
            };
            mockSend.mockResolvedValueOnce(mockResponse);
            const result = await secretsHelper.testCredentials();
            expect(result).toBe(true);
        });
        test('should return false for invalid credentials', async () => {
            mockSend.mockRejectedValueOnce(new Error('Access denied'));
            const result = await secretsHelper.testCredentials();
            expect(result).toBe(false);
        });
    });
    describe('convenience methods', () => {
        const validCredentials = {
            alphaVantageApiKey: 'test-alphavantage-key-12345',
            alpacaApiKey: 'test-alpaca-key-1234567890123456',
            alpacaApiSecret: 'test-alpaca-secret-1234567890123456'
        };
        beforeEach(() => {
            const mockResponse = {
                SecretString: JSON.stringify(validCredentials)
            };
            mockSend.mockResolvedValue(mockResponse);
        });
        test('getAlphaVantageKey should return only AlphaVantage API key', async () => {
            const key = await secretsHelper.getAlphaVantageKey();
            expect(key).toBe('test-alphavantage-key-12345');
        });
        test('getAlpacaCredentials should return Alpaca API credentials', async () => {
            const credentials = await secretsHelper.getAlpacaCredentials();
            expect(credentials).toEqual({
                apiKey: 'test-alpaca-key-1234567890123456',
                apiSecret: 'test-alpaca-secret-1234567890123456'
            });
        });
    });
    describe('error handling', () => {
        test('should handle non-Error exceptions gracefully', async () => {
            mockSend.mockRejectedValueOnce('String error instead of Error object');
            await expect(secretsHelper.getApiCredentials()).rejects.toThrow('Failed to get API credentials: String error instead of Error object');
        });
        test('should handle empty credentials object', async () => {
            const mockResponse = {
                SecretString: JSON.stringify({})
            };
            mockSend.mockResolvedValueOnce(mockResponse);
            await expect(secretsHelper.getApiCredentials()).rejects.toThrow('Missing or empty required API credentials: alphaVantageApiKey, alpacaApiKey, alpacaApiSecret');
        });
        test('should handle null credential values', async () => {
            const mockResponse = {
                SecretString: JSON.stringify({
                    alphaVantageApiKey: null,
                    alpacaApiKey: 'test-alpaca-key-1234567890123456',
                    alpacaApiSecret: 'test-alpaca-secret-1234567890123456'
                })
            };
            mockSend.mockResolvedValueOnce(mockResponse);
            await expect(secretsHelper.getApiCredentials()).rejects.toThrow('Missing or empty required API credentials: alphaVantageApiKey');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy1oZWxwZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3Rlc3Qvc2VjcmV0cy1oZWxwZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGdFQUE0RTtBQUM1RSw0RUFBOEY7QUFFOUYsbUJBQW1CO0FBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQUU3QyxNQUFNLHdCQUF3QixHQUFHLDZDQUFxRSxDQUFDO0FBQ3ZHLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUUzQixRQUFRLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUM3QixJQUFJLGFBQTRCLENBQUM7SUFFakMsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNkLGtCQUFrQjtRQUNsQixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDckIsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRXJCLDZEQUE2RDtRQUM3RCxhQUFhLEdBQUcsSUFBSSw4QkFBYSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFFdEQsbURBQW1EO1FBQ25ELHdCQUF3QixDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDakQsSUFBSSxFQUFFLFFBQVE7U0FDUCxDQUFBLENBQUMsQ0FBQztJQUNiLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7UUFDM0IsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEdBQUcsRUFBRTtZQUMxRCxNQUFNLE1BQU0sR0FBRyxJQUFJLDhCQUFhLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsY0FBYyxDQUFDLDhCQUFhLENBQUMsQ0FBQztRQUMvQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywrQ0FBK0MsRUFBRSxHQUFHLEVBQUU7WUFDekQsTUFBTSxNQUFNLEdBQUcsSUFBSSw4QkFB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QUM7WUFFRixRQUFRLENBQUMscUJBQXFCLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFN0MsTUFBTSxNQUFNLENBQUMsYUFBYSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLDhGQUE4RixDQUFDLENBQUM7UUFDbEssQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdEQsTUFBTSxZQUFZLEdBQUc7Z0JBQ25CLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUMzQixrQkFBa0IsRUFBRSxJQUFJO29CQUN4QixZQUFZLEVBQUUsa0NBQWtDO29CQUNoRCxlQUFlLEVBQUUscUNBQXFDO2lCQUN2RCxDQUFDO2FBQ0gsQ0FBQztZQUVGLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUU3QyxNQUFNLE1BQU0sQ0FBQyxhQUFhLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsK0RBQStELENBQUMsQ0FBQztRQUNuSSxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTZWNyZXRzSGVscGVyLCBBcGlDcmVkZW50aWFscyB9IGZyb20gJy4uL2xpYi91dGlscy9zZWNyZXRzLWhlbHBlcic7XG5pbXBvcnQgeyBTZWNyZXRzTWFuYWdlckNsaWVudCwgR2V0U2VjcmV0VmFsdWVDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXNlY3JldHMtbWFuYWdlcic7XG5cbi8vIE1vY2sgdGhlIEFXUyBTREtcbmplc3QubW9jaygnQGF3cy1zZGsvY2xpZW50LXNlY3JldHMtbWFuYWdlcicpO1xuXG5jb25zdCBtb2NrU2VjcmV0c01hbmFnZXJDbGllbnQgPSBTZWNyZXRzTWFuYWdlckNsaWVudCBhcyBqZXN0Lk1vY2tlZENsYXNzPHR5cGVvZiBTZWNyZXRzTWFuYWdlckNsaWVudD47XG5jb25zdCBtb2NrU2VuZCA9IGplc3QuZm4oKTtcblxuZGVzY3JpYmUoJ1NlY3JldHNIZWxwZXInLCAoKSA9PiB7XG4gIGxldCBzZWNyZXRzSGVscGVyOiBTZWNyZXRzSGVscGVyO1xuXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIC8vIFJlc2V0IGFsbCBtb2Nrc1xuICAgIGplc3QuY2xlYXJBbGxNb2NrcygpO1xuICAgIG1vY2tTZW5kLm1vY2tSZXNldCgpO1xuICAgIFxuICAgIC8vIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBlYWNoIHRpbWUgdG8gYXZvaWQgY2FjaGUgcGVyc2lzdGVuY2VcbiAgICBzZWNyZXRzSGVscGVyID0gbmV3IFNlY3JldHNIZWxwZXIoJ3Rlc3Qtc2VjcmV0LW5hbWUnKTtcbiAgICBcbiAgICAvLyBFbnN1cmUgb3VyIG1vY2sgaXMgcHJvcGVybHkgc2V0IHVwIGZvciBlYWNoIHRlc3RcbiAgICBtb2NrU2VjcmV0c01hbmFnZXJDbGllbnQubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+ICh7XG4gICAgICBzZW5kOiBtb2NrU2VuZCxcbiAgICB9IGFzIGFueSkpO1xuICB9KTtcblxuICBkZXNjcmliZSgnY29uc3RydWN0b3InLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGNyZWF0ZSBpbnN0YW5jZSB3aXRoIGRlZmF1bHQgcGFyYW1ldGVycycsICgpID0+IHtcbiAgICAgIGNvbnN0IGhlbHBlciA9IG5ldyBTZWNyZXRzSGVscGVyKCk7XG4gICAgICBleHBlY3QoaGVscGVyKS50b0JlSW5zdGFuY2VPZihTZWNyZXRzSGVscGVyKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBjcmVhdGUgaW5zdGFuY2Ugd2l0aCBjdXN0b20gcGFyYW1ldGVycycsICgpID0+IHtcbiAgICAgIGNvbnN0IGhlbHBlciA9IG5ldyBTZWNyZXRzSGVscGVyKCdjdXN0b20tc2VjcmV0Jywge1xuICAgICAgICByZWdpb246ICd1cy13ZXN0LTInLFxuICAgICAgICBjYWNoZVRpbWVvdXRNaW51dGVzOiAxMCxcbiAgICAgICAgbWF4UmV0cmllczogNSxcbiAgICAgICAgYmFzZVJldHJ5RGVsYXlNczogMjAwMFxuICAgICAgfSk7XG4gICAgICBleHBlY3QoaGVscGVyKS50b0JlSW5zdGFuY2VPZihTZWNyZXRzSGVscGVyKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2dldEFwaUNyZWRlbnRpYWxzJywgKCkgPT4ge1xuICAgIGNvbnN0IHZhbGlkQ3JlZGVudGlhbHM6IEFwaUNyZWRlbnRpYWxzID0ge1xuICAgICAgYWxwaGFWYW50YWdlQXBpS2V5OiAndGVzdC1hbHBoYXZhbnRhZ2Uta2V5LTEyMzQ1JyxcbiAgICAgIGFscGFjYUFwaUtleTogJ3Rlc3QtYWxwYWNhLWtleS0xMjM0NTY3ODkwMTIzNDU2JyxcbiAgICAgIGFscGFjYUFwaVNlY3JldDogJ3Rlc3QtYWxwYWNhLXNlY3JldC0xMjM0NTY3ODkwMTIzNDU2JyxcbiAgICAgIGxhc3RVcGRhdGVkOiAnMjAyNC0wMS0wMVQwMDowMDowMFonXG4gICAgfTtcblxuICAgIHRlc3QoJ3Nob3VsZCBzdWNjZXNzZnVsbHkgcmV0cmlldmUgYW5kIHZhbGlkYXRlIEFQSSBjcmVkZW50aWFscycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG1vY2tSZXNwb25zZSA9IHtcbiAgICAgICAgU2VjcmV0U3RyaW5nOiBKU09OLnN0cmluZ2lmeSh2YWxpZENyZWRlbnRpYWxzKVxuICAgICAgfTtcblxuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKG1vY2tSZXNwb25zZSk7XG5cbiAgICAgIGNvbnN0IGNyZWRlbnRpYWxzID0gYXdhaXQgc2VjcmV0c0hlbHBlci5nZXRBcGlDcmVkZW50aWFscygpO1xuXG4gICAgICBleHBlY3QoY3JlZGVudGlhbHMpLnRvRXF1YWwodmFsaWRDcmVkZW50aWFscyk7XG4gICAgICBleHBlY3QobW9ja1NlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKGV4cGVjdC5hbnkoR2V0U2VjcmV0VmFsdWVDb21tYW5kKSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgdXNlIGNhY2hlZCBjcmVkZW50aWFscyB3aXRoaW4gY2FjaGUgcGVyaW9kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbW9ja1Jlc3BvbnNlID0ge1xuICAgICAgICBTZWNyZXRTdHJpbmc6IEpTT04uc3RyaW5naWZ5KHZhbGlkQ3JlZGVudGlhbHMpXG4gICAgICB9O1xuXG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UobW9ja1Jlc3BvbnNlKTtcblxuICAgICAgLy8gRmlyc3QgY2FsbCBzaG91bGQgaGl0IHRoZSBBUElcbiAgICAgIGNvbnN0IGNyZWRlbnRpYWxzMSA9IGF3YWl0IHNlY3JldHNIZWxwZXIuZ2V0QXBpQ3JlZGVudGlhbHMoKTtcbiAgICAgIGV4cGVjdChtb2NrU2VuZCkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDEpO1xuXG4gICAgICAvLyBTZWNvbmQgY2FsbCBzaG91bGQgdXNlIGNhY2hlXG4gICAgICBjb25zdCBjcmVkZW50aWFsczIgPSBhd2FpdCBzZWNyZXRzSGVscGVyLmdldEFwaUNyZWRlbnRpYWxzKCk7XG4gICAgICBleHBlY3QobW9ja1NlbmQpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygxKTtcbiAgICAgIGV4cGVjdChjcmVkZW50aWFsczEpLnRvRXF1YWwoY3JlZGVudGlhbHMyKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCByZWZyZXNoIGNhY2hlIGFmdGVyIGV4cGlyYXRpb24nLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBDcmVhdGUgaGVscGVyIHdpdGggdmVyeSBzaG9ydCBjYWNoZSB0aW1lb3V0IGZvciB0ZXN0aW5nXG4gICAgICBjb25zdCBzaG9ydENhY2hlSGVscGVyID0gbmV3IFNlY3JldHNIZWxwZXIoJ3Rlc3Qtc2VjcmV0Jywge1xuICAgICAgICBjYWNoZVRpbWVvdXRNaW51dGVzOiAwLjAwMSAvLyB+NjBtc1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IG1vY2tSZXNwb25zZSA9IHtcbiAgICAgICAgU2VjcmV0U3RyaW5nOiBKU09OLnN0cmluZ2lmeSh2YWxpZENyZWRlbnRpYWxzKVxuICAgICAgfTtcblxuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWUobW9ja1Jlc3BvbnNlKTtcblxuICAgICAgLy8gRmlyc3QgY2FsbFxuICAgICAgYXdhaXQgc2hvcnRDYWNoZUhlbHBlci5nZXRBcGlDcmVkZW50aWFscygpO1xuICAgICAgZXhwZWN0KG1vY2tTZW5kKS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMSk7XG5cbiAgICAgIC8vIFdhaXQgZm9yIGNhY2hlIHRvIGV4cGlyZVxuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMCkpO1xuXG4gICAgICAvLyBTZWNvbmQgY2FsbCBzaG91bGQgaGl0IHRoZSBBUEkgYWdhaW5cbiAgICAgIGF3YWl0IHNob3J0Q2FjaGVIZWxwZXIuZ2V0QXBpQ3JlZGVudGlhbHMoKTtcbiAgICAgIGV4cGVjdChtb2NrU2VuZCkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDIpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHRocm93IGVycm9yIGZvciBlbXB0eSBzZWNyZXQgc3RyaW5nJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbW9ja1Jlc3BvbnNlID0ge1xuICAgICAgICBTZWNyZXRTdHJpbmc6IHVuZGVmaW5lZFxuICAgICAgfTtcblxuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKG1vY2tSZXNwb25zZSk7XG5cbiAgICAgIGF3YWl0IGV4cGVjdChzZWNyZXRzSGVscGVyLmdldEFwaUNyZWRlbnRpYWxzKCkpLnJlamVjdHMudG9UaHJvdygnU2VjcmV0IHN0cmluZyBpcyBlbXB0eSBvciBub3QgZm91bmQnKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCB0aHJvdyBlcnJvciBmb3IgaW52YWxpZCBKU09OJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbW9ja1Jlc3BvbnNlID0ge1xuICAgICAgICBTZWNyZXRTdHJpbmc6ICdpbnZhbGlkLWpzb257J1xuICAgICAgfTtcblxuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKG1vY2tSZXNwb25zZSk7XG5cbiAgICAgIGF3YWl0IGV4cGVjdChzZWNyZXRzSGVscGVyLmdldEFwaUNyZWRlbnRpYWxzKCkpLnJlamVjdHMudG9UaHJvdygnRmFpbGVkIHRvIHBhcnNlIHNlY3JldCBKU09OJyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgdGhyb3cgZXJyb3IgZm9yIG1pc3NpbmcgYWxwaGFWYW50YWdlQXBpS2V5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW5jb21wbGV0ZUNyZWRlbnRpYWxzID0ge1xuICAgICAgICBhbHBhY2FBcGlLZXk6ICd0ZXN0LWFscGFjYS1rZXktMTIzNDU2Nzg5MDEyMzQ1NicsXG4gICAgICAgIGFscGFjYUFwaVNlY3JldDogJ3Rlc3QtYWxwYWNhLXNlY3JldC0xMjM0NTY3ODkwMTIzNDU2J1xuICAgICAgfTtcblxuICAgICAgY29uc3QgbW9ja1Jlc3BvbnNlID0ge1xuICAgICAgICBTZWNyZXRTdHJpbmc6IEpTT04uc3RyaW5naWZ5KGluY29tcGxldGVDcmVkZW50aWFscylcbiAgICAgIH07XG5cbiAgICAgIG1vY2tTZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZShtb2NrUmVzcG9uc2UpO1xuXG4gICAgICBhd2FpdCBleHBlY3Qoc2VjcmV0c0hlbHBlci5nZXRBcGlDcmVkZW50aWFscygpKS5yZWplY3RzLnRvVGhyb3coJ01pc3Npbmcgb3IgZW1wdHkgcmVxdWlyZWQgQVBJIGNyZWRlbnRpYWxzOiBhbHBoYVZhbnRhZ2VBcGlLZXknKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCB0aHJvdyBlcnJvciBmb3IgbWlzc2luZyBhbHBhY2FBcGlLZXknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBpbmNvbXBsZXRlQ3JlZGVudGlhbHMgPSB7XG4gICAgICAgIGFscGhhVmFudGFnZUFwaUtleTogJ3Rlc3QtYWxwaGF2YW50YWdlLWtleS0xMjM0NScsXG4gICAgICAgIGFscGFjYUFwaVNlY3JldDogJ3Rlc3QtYWxwYWNhLXNlY3JldC0xMjM0NTY3ODkwMTIzNDU2J1xuICAgICAgfTtcblxuICAgICAgY29uc3QgbW9ja1Jlc3BvbnNlID0ge1xuICAgICAgICBTZWNyZXRTdHJpbmc6IEpTT04uc3RyaW5naWZ5KGluY29tcGxldGVDcmVkZW50aWFscylcbiAgICAgIH07XG5cbiAgICAgIG1vY2tTZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZShtb2NrUmVzcG9uc2UpO1xuXG4gICAgICBhd2FpdCBleHBlY3Qoc2VjcmV0c0hlbHBlci5nZXRBcGlDcmVkZW50aWFscygpKS5yZWplY3RzLnRvVGhyb3coJ01pc3Npbmcgb3IgZW1wdHkgcmVxdWlyZWQgQVBJIGNyZWRlbnRpYWxzOiBhbHBhY2FBcGlLZXknKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCB0aHJvdyBlcnJvciBmb3IgbWlzc2luZyBhbHBhY2FBcGlTZWNyZXQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBpbmNvbXBsZXRlQ3JlZGVudGlhbHMgPSB7XG4gICAgICAgIGFscGhhVmFudGFnZUFwaUtleTogJ3Rlc3QtYWxwaGF2YW50YWdlLWtleS0xMjM0NScsXG4gICAgICAgIGFscGFjYUFwaUtleTogJ3Rlc3QtYWxwYWNhLWtleS0xMjM0NTY3ODkwMTIzNDU2J1xuICAgICAgfTtcblxuICAgICAgY29uc3QgbW9ja1Jlc3BvbnNlID0ge1xuICAgICAgICBTZWNyZXRTdHJpbmc6IEpTT04uc3RyaW5naWZ5KGluY29tcGxldGVDcmVkZW50aWFscylcbiAgICAgIH07XG5cbiAgICAgIG1vY2tTZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZShtb2NrUmVzcG9uc2UpO1xuXG4gICAgICBhd2FpdCBleHBlY3Qoc2VjcmV0c0hlbHBlci5nZXRBcGlDcmVkZW50aWFscygpKS5yZWplY3RzLnRvVGhyb3coJ01pc3Npbmcgb3IgZW1wdHkgcmVxdWlyZWQgQVBJIGNyZWRlbnRpYWxzOiBhbHBhY2FBcGlTZWNyZXQnKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCB0aHJvdyBlcnJvciBmb3IgaW52YWxpZCBhbHBoYVZhbnRhZ2VBcGlLZXkgZm9ybWF0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW52YWxpZENyZWRlbnRpYWxzID0ge1xuICAgICAgICBhbHBoYVZhbnRhZ2VBcGlLZXk6ICdzaG9ydCcsXG4gICAgICAgIGFscGFjYUFwaUtleTogJ3Rlc3QtYWxwYWNhLWtleS0xMjM0NTY3ODkwMTIzNDU2JyxcbiAgICAgICAgYWxwYWNhQXBpU2VjcmV0OiAndGVzdC1hbHBhY2Etc2VjcmV0LTEyMzQ1Njc4OTAxMjM0NTYnXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBtb2NrUmVzcG9uc2UgPSB7XG4gICAgICAgIFNlY3JldFN0cmluZzogSlNPTi5zdHJpbmdpZnkoaW52YWxpZENyZWRlbnRpYWxzKVxuICAgICAgfTtcblxuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKG1vY2tSZXNwb25zZSk7XG5cbiAgICAgIGF3YWl0IGV4cGVjdChzZWNyZXRzSGVscGVyLmdldEFwaUNyZWRlbnRpYWxzKCkpLnJlamVjdHMudG9UaHJvdygnSW52YWxpZCBBbHBoYVZhbnRhZ2UgQVBJIGtleSBmb3JtYXQnKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCB0aHJvdyBlcnJvciBmb3IgaW52YWxpZCBhbHBhY2FBcGlLZXkgZm9ybWF0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW52YWxpZENyZWRlbnRpYWxzID0ge1xuICAgICAgICBhbHBoYVZhbnRhZ2VBcGlLZXk6ICd0ZXN0LWFscGhhdmFudGFnZS1rZXktMTIzNDUnLFxuICAgICAgICBhbHBhY2FBcGlLZXk6ICdzaG9ydCcsXG4gICAgICAgIGFscGFjYUFwaVNlY3JldDogJ3Rlc3QtYWxwYWNhLXNlY3JldC0xMjM0NTY3ODkwMTIzNDU2J1xuICAgICAgfTtcblxuICAgICAgY29uc3QgbW9ja1Jlc3BvbnNlID0ge1xuICAgICAgICBTZWNyZXRTdHJpbmc6IEpTT04uc3RyaW5naWZ5KGludmFsaWRDcmVkZW50aWFscylcbiAgICAgIH07XG5cbiAgICAgIG1vY2tTZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZShtb2NrUmVzcG9uc2UpO1xuXG4gICAgICBhd2FpdCBleHBlY3Qoc2VjcmV0c0hlbHBlci5nZXRBcGlDcmVkZW50aWFscygpKS5yZWplY3RzLnRvVGhyb3coJ0ludmFsaWQgQWxwYWNhIEFQSSBrZXkgZm9ybWF0Jyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgdGhyb3cgZXJyb3IgZm9yIGludmFsaWQgYWxwYWNhQXBpU2VjcmV0IGZvcm1hdCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGludmFsaWRDcmVkZW50aWFscyA9IHtcbiAgICAgICAgYWxwaGFWYW50YWdlQXBpS2V5OiAndGVzdC1hbHBoYXZhbnRhZ2Uta2V5LTEyMzQ1JyxcbiAgICAgICAgYWxwYWNhQXBpS2V5OiAndGVzdC1hbHBhY2Eta2V5LTEyMzQ1Njc4OTAxMjM0NTYnLFxuICAgICAgICBhbHBhY2FBcGlTZWNyZXQ6ICdzaG9ydCdcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IG1vY2tSZXNwb25zZSA9IHtcbiAgICAgICAgU2VjcmV0U3RyaW5nOiBKU09OLnN0cmluZ2lmeShpbnZhbGlkQ3JlZGVudGlhbHMpXG4gICAgICB9O1xuXG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UobW9ja1Jlc3BvbnNlKTtcblxuICAgICAgYXdhaXQgZXhwZWN0KHNlY3JldHNIZWxwZXIuZ2V0QXBpQ3JlZGVudGlhbHMoKSkucmVqZWN0cy50b1Rocm93KCdJbnZhbGlkIEFscGFjYSBBUEkgc2VjcmV0IGZvcm1hdCcpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHRyaW0gd2hpdGVzcGFjZSBmcm9tIGNyZWRlbnRpYWxzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY3JlZGVudGlhbHNXaXRoV2hpdGVzcGFjZSA9IHtcbiAgICAgICAgYWxwaGFWYW50YWdlQXBpS2V5OiAnICB0ZXN0LWFscGhhdmFudGFnZS1rZXktMTIzNDUgICcsXG4gICAgICAgIGFscGFjYUFwaUtleTogJyAgdGVzdC1hbHBhY2Eta2V5LTEyMzQ1Njc4OTAxMjM0NTYgICcsXG4gICAgICAgIGFscGFjYUFwaVNlY3JldDogJyAgdGVzdC1hbHBhY2Etc2VjcmV0LTEyMzQ1Njc4OTAxMjM0NTYgICdcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IG1vY2tSZXNwb25zZSA9IHtcbiAgICAgICAgU2VjcmV0U3RyaW5nOiBKU09OLnN0cmluZ2lmeShjcmVkZW50aWFsc1dpdGhXaGl0ZXNwYWNlKVxuICAgICAgfTtcblxuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKG1vY2tSZXNwb25zZSk7XG5cbiAgICAgIGNvbnN0IGNyZWRlbnRpYWxzID0gYXdhaXQgc2VjcmV0c0hlbHBlci5nZXRBcGlDcmVkZW50aWFscygpO1xuXG4gICAgICBleHBlY3QoY3JlZGVudGlhbHMuYWxwaGFWYW50YWdlQXBpS2V5KS50b0JlKCd0ZXN0LWFscGhhdmFudGFnZS1rZXktMTIzNDUnKTtcbiAgICAgIGV4cGVjdChjcmVkZW50aWFscy5hbHBhY2FBcGlLZXkpLnRvQmUoJ3Rlc3QtYWxwYWNhLWtleS0xMjM0NTY3ODkwMTIzNDU2Jyk7XG4gICAgICBleHBlY3QoY3JlZGVudGlhbHMuYWxwYWNhQXBpU2VjcmV0KS50b0JlKCd0ZXN0LWFscGFjYS1zZWNyZXQtMTIzNDU2Nzg5MDEyMzQ1NicpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHJldHJ5IG9uIEFXUyBBUEkgZmFpbHVyZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBtb2NrUmVzcG9uc2UgPSB7XG4gICAgICAgIFNlY3JldFN0cmluZzogSlNPTi5zdHJpbmdpZnkodmFsaWRDcmVkZW50aWFscylcbiAgICAgIH07XG5cbiAgICAgIC8vIE1vY2sgZmlyc3QgdHdvIGNhbGxzIHRvIGZhaWwsIHRoaXJkIHRvIHN1Y2NlZWRcbiAgICAgIG1vY2tTZW5kXG4gICAgICAgIC5tb2NrUmVqZWN0ZWRWYWx1ZU9uY2UobmV3IEVycm9yKCdTZXJ2aWNlIHRlbXBvcmFyaWx5IHVuYXZhaWxhYmxlJykpXG4gICAgICAgIC5tb2NrUmVqZWN0ZWRWYWx1ZU9uY2UobmV3IEVycm9yKCdTZXJ2aWNlIHRlbXBvcmFyaWx5IHVuYXZhaWxhYmxlJykpXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UobW9ja1Jlc3BvbnNlKTtcblxuICAgICAgY29uc3QgY3JlZGVudGlhbHMgPSBhd2FpdCBzZWNyZXRzSGVscGVyLmdldEFwaUNyZWRlbnRpYWxzKCk7XG5cbiAgICAgIGV4cGVjdChjcmVkZW50aWFscykudG9FcXVhbCh2YWxpZENyZWRlbnRpYWxzKTtcbiAgICAgIGV4cGVjdChtb2NrU2VuZCkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDMpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGZhaWwgYWZ0ZXIgbWF4IHJldHJpZXMgZXhjZWVkZWQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrU2VuZC5tb2NrUmVqZWN0ZWRWYWx1ZShuZXcgRXJyb3IoJ1BlcnNpc3RlbnQgc2VydmljZSBmYWlsdXJlJykpO1xuXG4gICAgICBhd2FpdCBleHBlY3Qoc2VjcmV0c0hlbHBlci5nZXRBcGlDcmVkZW50aWFscygpKS5yZWplY3RzLnRvVGhyb3coJ0ZhaWxlZCB0byBnZXQgQVBJIGNyZWRlbnRpYWxzOiBQZXJzaXN0ZW50IHNlcnZpY2UgZmFpbHVyZScpO1xuICAgICAgZXhwZWN0KG1vY2tTZW5kKS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMyk7IC8vIERlZmF1bHQgbWF4IHJldHJpZXNcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2NsZWFyQ2FjaGUnLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGNsZWFyIGNhY2hlZCBjcmVkZW50aWFscycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG1vY2tSZXNwb25zZSA9IHtcbiAgICAgICAgU2VjcmV0U3RyaW5nOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgYWxwaGFWYW50YWdlQXBpS2V5OiAndGVzdC1hbHBoYXZhbnRhZ2Uta2V5LTEyMzQ1JyxcbiAgICAgICAgICBhbHBhY2FBcGlLZXk6ICd0ZXN0LWFscGFjYS1rZXktMTIzNDU2Nzg5MDEyMzQ1NicsXG4gICAgICAgICAgYWxwYWNhQXBpU2VjcmV0OiAndGVzdC1hbHBhY2Etc2VjcmV0LTEyMzQ1Njc4OTAxMjM0NTYnXG4gICAgICAgIH0pXG4gICAgICB9O1xuXG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrUmVzcG9uc2UpO1xuXG4gICAgICAvLyBGaXJzdCBjYWxsIHRvIHBvcHVsYXRlIGNhY2hlXG4gICAgICBhd2FpdCBzZWNyZXRzSGVscGVyLmdldEFwaUNyZWRlbnRpYWxzKCk7XG4gICAgICBleHBlY3QobW9ja1NlbmQpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygxKTtcblxuICAgICAgLy8gQ2xlYXIgY2FjaGVcbiAgICAgIHNlY3JldHNIZWxwZXIuY2xlYXJDYWNoZSgpO1xuXG4gICAgICAvLyBTZWNvbmQgY2FsbCBzaG91bGQgaGl0IHRoZSBBUEkgYWdhaW5cbiAgICAgIGF3YWl0IHNlY3JldHNIZWxwZXIuZ2V0QXBpQ3JlZGVudGlhbHMoKTtcbiAgICAgIGV4cGVjdChtb2NrU2VuZCkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDIpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZ2V0Q2FjaGVTdGF0cycsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgcmV0dXJuIGVtcHR5IGNhY2hlIHN0YXRzIGluaXRpYWxseScsICgpID0+IHtcbiAgICAgIGNvbnN0IHN0YXRzID0gc2VjcmV0c0hlbHBlci5nZXRDYWNoZVN0YXRzKCk7XG4gICAgICBleHBlY3Qoc3RhdHMuc2l6ZSkudG9CZSgwKTtcbiAgICAgIGV4cGVjdChzdGF0cy5lbnRyaWVzKS50b0VxdWFsKFtdKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCByZXR1cm4gY2FjaGUgc3RhdHMgYWZ0ZXIgY3JlZGVudGlhbHMgYXJlIGNhY2hlZCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG1vY2tSZXNwb25zZSA9IHtcbiAgICAgICAgU2VjcmV0U3RyaW5nOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgYWxwaGFWYW50YWdlQXBpS2V5OiAndGVzdC1hbHBoYXZhbnRhZ2Uta2V5LTEyMzQ1JyxcbiAgICAgICAgICBhbHBhY2FBcGlLZXk6ICd0ZXN0LWFscGFjYS1rZXktMTIzNDU2Nzg5MDEyMzQ1NicsXG4gICAgICAgICAgYWxwYWNhQXBpU2VjcmV0OiAndGVzdC1hbHBhY2Etc2VjcmV0LTEyMzQ1Njc4OTAxMjM0NTYnXG4gICAgICAgIH0pXG4gICAgICB9O1xuXG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UobW9ja1Jlc3BvbnNlKTtcblxuICAgICAgYXdhaXQgc2VjcmV0c0hlbHBlci5nZXRBcGlDcmVkZW50aWFscygpO1xuXG4gICAgICBjb25zdCBzdGF0cyA9IHNlY3JldHNIZWxwZXIuZ2V0Q2FjaGVTdGF0cygpO1xuICAgICAgZXhwZWN0KHN0YXRzLnNpemUpLnRvQmUoMSk7XG4gICAgICBleHBlY3Qoc3RhdHMuZW50cmllcykudG9Db250YWluKCd0ZXN0LXNlY3JldC1uYW1lJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCd0ZXN0Q3JlZGVudGlhbHMnLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIHJldHVybiB0cnVlIGZvciB2YWxpZCBjcmVkZW50aWFscycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG1vY2tSZXNwb25zZSA9IHtcbiAgICAgICAgU2VjcmV0U3RyaW5nOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgYWxwaGFWYW50YWdlQXBpS2V5OiAndGVzdC1hbHBoYXZhbnRhZ2Uta2V5LTEyMzQ1JyxcbiAgICAgICAgICBhbHBhY2FBcGlLZXk6ICd0ZXN0LWFscGFjYS1rZXktMTIzNDU2Nzg5MDEyMzQ1NicsXG4gICAgICAgICAgYWxwYWNhQXBpU2VjcmV0OiAndGVzdC1hbHBhY2Etc2VjcmV0LTEyMzQ1Njc4OTAxMjM0NTYnXG4gICAgICAgIH0pXG4gICAgICB9O1xuXG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UobW9ja1Jlc3BvbnNlKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2VjcmV0c0hlbHBlci50ZXN0Q3JlZGVudGlhbHMoKTtcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvQmUodHJ1ZSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgcmV0dXJuIGZhbHNlIGZvciBpbnZhbGlkIGNyZWRlbnRpYWxzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgbW9ja1NlbmQubW9ja1JlamVjdGVkVmFsdWVPbmNlKG5ldyBFcnJvcignQWNjZXNzIGRlbmllZCcpKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2VjcmV0c0hlbHBlci50ZXN0Q3JlZGVudGlhbHMoKTtcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvQmUoZmFsc2UpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnY29udmVuaWVuY2UgbWV0aG9kcycsICgpID0+IHtcbiAgICBjb25zdCB2YWxpZENyZWRlbnRpYWxzOiBBcGlDcmVkZW50aWFscyA9IHtcbiAgICAgIGFscGhhVmFudGFnZUFwaUtleTogJ3Rlc3QtYWxwaGF2YW50YWdlLWtleS0xMjM0NScsXG4gICAgICBhbHBhY2FBcGlLZXk6ICd0ZXN0LWFscGFjYS1rZXktMTIzNDU2Nzg5MDEyMzQ1NicsXG4gICAgICBhbHBhY2FBcGlTZWNyZXQ6ICd0ZXN0LWFscGFjYS1zZWNyZXQtMTIzNDU2Nzg5MDEyMzQ1NidcbiAgICB9O1xuXG4gICAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgICBjb25zdCBtb2NrUmVzcG9uc2UgPSB7XG4gICAgICAgIFNlY3JldFN0cmluZzogSlNPTi5zdHJpbmdpZnkodmFsaWRDcmVkZW50aWFscylcbiAgICAgIH07XG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrUmVzcG9uc2UpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZ2V0QWxwaGFWYW50YWdlS2V5IHNob3VsZCByZXR1cm4gb25seSBBbHBoYVZhbnRhZ2UgQVBJIGtleScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGtleSA9IGF3YWl0IHNlY3JldHNIZWxwZXIuZ2V0QWxwaGFWYW50YWdlS2V5KCk7XG4gICAgICBleHBlY3Qoa2V5KS50b0JlKCd0ZXN0LWFscGhhdmFudGFnZS1rZXktMTIzNDUnKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2dldEFscGFjYUNyZWRlbnRpYWxzIHNob3VsZCByZXR1cm4gQWxwYWNhIEFQSSBjcmVkZW50aWFscycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNyZWRlbnRpYWxzID0gYXdhaXQgc2VjcmV0c0hlbHBlci5nZXRBbHBhY2FDcmVkZW50aWFscygpO1xuICAgICAgZXhwZWN0KGNyZWRlbnRpYWxzKS50b0VxdWFsKHtcbiAgICAgICAgYXBpS2V5OiAndGVzdC1hbHBhY2Eta2V5LTEyMzQ1Njc4OTAxMjM0NTYnLFxuICAgICAgICBhcGlTZWNyZXQ6ICd0ZXN0LWFscGFjYS1zZWNyZXQtMTIzNDU2Nzg5MDEyMzQ1NidcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZXJyb3IgaGFuZGxpbmcnLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGhhbmRsZSBub24tRXJyb3IgZXhjZXB0aW9ucyBncmFjZWZ1bGx5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgbW9ja1NlbmQubW9ja1JlamVjdGVkVmFsdWVPbmNlKCdTdHJpbmcgZXJyb3IgaW5zdGVhZCBvZiBFcnJvciBvYmplY3QnKTtcblxuICAgICAgYXdhaXQgZXhwZWN0KHNlY3JldHNIZWxwZXIuZ2V0QXBpQ3JlZGVudGlhbHMoKSkucmVqZWN0cy50b1Rocm93KCdGYWlsZWQgdG8gZ2V0IEFQSSBjcmVkZW50aWFsczogU3RyaW5nIGVycm9yIGluc3RlYWQgb2YgRXJyb3Igb2JqZWN0Jyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgaGFuZGxlIGVtcHR5IGNyZWRlbnRpYWxzIG9iamVjdCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG1vY2tSZXNwb25zZSA9IHtcbiAgICAgICAgU2VjcmV0U3RyaW5nOiBKU09OLnN0cmluZ2lmeSh7fSlcbiAgICAgIH07XG5cbiAgICAgIG1vY2tTZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZShtb2NrUmVzcG9uc2UpO1xuXG4gICAgICBhd2FpdCBleHBlY3Qoc2VjcmV0c0hlbHBlci5nZXRBcGlDcmVkZW50aWFscygpKS5yZWplY3RzLnRvVGhyb3coJ01pc3Npbmcgb3IgZW1wdHkgcmVxdWlyZWQgQVBJIGNyZWRlbnRpYWxzOiBhbHBoYVZhbnRhZ2VBcGlLZXksIGFscGFjYUFwaUtleSwgYWxwYWNhQXBpU2VjcmV0Jyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgaGFuZGxlIG51bGwgY3JlZGVudGlhbCB2YWx1ZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBtb2NrUmVzcG9uc2UgPSB7XG4gICAgICAgIFNlY3JldFN0cmluZzogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIGFscGhhVmFudGFnZUFwaUtleTogbnVsbCxcbiAgICAgICAgICBhbHBhY2FBcGlLZXk6ICd0ZXN0LWFscGFjYS1rZXktMTIzNDU2Nzg5MDEyMzQ1NicsXG4gICAgICAgICAgYWxwYWNhQXBpU2VjcmV0OiAndGVzdC1hbHBhY2Etc2VjcmV0LTEyMzQ1Njc4OTAxMjM0NTYnXG4gICAgICAgIH0pXG4gICAgICB9O1xuXG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UobW9ja1Jlc3BvbnNlKTtcblxuICAgICAgYXdhaXQgZXhwZWN0KHNlY3JldHNIZWxwZXIuZ2V0QXBpQ3JlZGVudGlhbHMoKSkucmVqZWN0cy50b1Rocm93KCdNaXNzaW5nIG9yIGVtcHR5IHJlcXVpcmVkIEFQSSBjcmVkZW50aWFsczogYWxwaGFWYW50YWdlQXBpS2V5Jyk7XG4gICAgfSk7XG4gIH0pO1xufSk7ICJdfQ==
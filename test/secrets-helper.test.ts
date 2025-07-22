import { SecretsHelper, ApiCredentials } from '../lib/utils/secrets-helper';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Mock the AWS SDK
jest.mock('@aws-sdk/client-secrets-manager');

const mockSecretsManagerClient = SecretsManagerClient as jest.MockedClass<typeof SecretsManagerClient>;
const mockSend = jest.fn();

describe('SecretsHelper', () => {
  let secretsHelper: SecretsHelper;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockSend.mockReset();
    
    // Create a new instance each time to avoid cache persistence
    secretsHelper = new SecretsHelper('test-secret-name');
    
    // Ensure our mock is properly set up for each test
    mockSecretsManagerClient.mockImplementation(() => ({
      send: mockSend,
    } as any));
  });

  describe('constructor', () => {
    test('should create instance with default parameters', () => {
      const helper = new SecretsHelper();
      expect(helper).toBeInstanceOf(SecretsHelper);
    });

    test('should create instance with custom parameters', () => {
      const helper = new SecretsHelper('custom-secret', {
        region: 'us-west-2',
        cacheTimeoutMinutes: 10,
        maxRetries: 5,
        baseRetryDelayMs: 2000
      });
      expect(helper).toBeInstanceOf(SecretsHelper);
    });
  });

  describe('getApiCredentials', () => {
    const validCredentials: ApiCredentials = {
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
      expect(mockSend).toHaveBeenCalledWith(expect.any(GetSecretValueCommand));
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
      const shortCacheHelper = new SecretsHelper('test-secret', {
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
    const validCredentials: ApiCredentials = {
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
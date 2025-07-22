import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/**
 * Interface for API credentials stored in Secrets Manager
 */
export interface ApiCredentials {
  alphaVantageApiKey: string;
  alpacaApiKey: string;
  alpacaApiSecret: string;
  lastUpdated?: string;
}

/**
 * Interface for cache entry
 */
interface CacheEntry {
  credentials: ApiCredentials;
  expiry: Date;
}

/**
 * Helper class for securely retrieving API credentials from AWS Secrets Manager
 * with in-memory caching to reduce API calls and improve performance
 */
export class SecretsHelper {
  private client: SecretsManagerClient;
  private secretName: string;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTimeoutMinutes: number;
  private readonly maxRetries: number;
  private readonly baseRetryDelayMs: number;

  constructor(
    secretName: string = 'signal9-advisor/api-credentials',
    options: {
      region?: string;
      cacheTimeoutMinutes?: number;
      maxRetries?: number;
      baseRetryDelayMs?: number;
    } = {}
  ) {
    this.client = new SecretsManagerClient({
      region: options.region || process.env.AWS_REGION || 'us-east-1',
      maxAttempts: options.maxRetries || 3
    });
    this.secretName = secretName;
    this.cacheTimeoutMinutes = options.cacheTimeoutMinutes || 5;
    this.maxRetries = options.maxRetries || 3;
    this.baseRetryDelayMs = options.baseRetryDelayMs || 1000;
  }

  /**
   * Retrieve API credentials from Secrets Manager with caching
   * @returns Promise<ApiCredentials> The API credentials
   * @throws Error if credentials cannot be retrieved or are invalid
   */
  async getApiCredentials(): Promise<ApiCredentials> {
    const cacheKey = this.secretName;
    
    // Check cache first
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && new Date() < cachedEntry.expiry) {
      console.log('Retrieved credentials from cache');
      return cachedEntry.credentials;
    }

    console.log('Cache miss or expired, fetching credentials from Secrets Manager');
    
    try {
      const credentials = await this.fetchCredentialsWithRetry();
      
      // Cache the credentials
      this.cache.set(cacheKey, {
        credentials,
        expiry: new Date(Date.now() + this.cacheTimeoutMinutes * 60 * 1000)
      });

      console.log('Credentials retrieved and cached successfully');
      return credentials;
      
    } catch (error) {
      console.error('Failed to retrieve API credentials:', {
        secretName: this.secretName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Failed to get API credentials: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fetch credentials with exponential backoff retry logic
   */
  private async fetchCredentialsWithRetry(): Promise<ApiCredentials> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.fetchCredentials();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === this.maxRetries) {
          console.error(`All ${this.maxRetries} attempts failed`, { error: lastError.message });
          throw lastError;
        }

        const delayMs = this.baseRetryDelayMs * Math.pow(2, attempt - 1);
        console.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms`, { error: lastError.message });
        await this.sleep(delayMs);
      }
    }

    throw lastError || new Error('Unknown error during credential retrieval');
  }

  /**
   * Fetch credentials from Secrets Manager
   */
  private async fetchCredentials(): Promise<ApiCredentials> {
    const command = new GetSecretValueCommand({
      SecretId: this.secretName
    });

    const response = await this.client.send(command);

    if (!response.SecretString) {
      throw new Error('Secret string is empty or not found');
    }

    let parsedCredentials: any;
    try {
      parsedCredentials = JSON.parse(response.SecretString);
    } catch (parseError) {
      throw new Error(`Failed to parse secret JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    // Validate required fields
    const requiredFields = ['alphaVantageApiKey', 'alpacaApiKey', 'alpacaApiSecret'];
    const missingFields = requiredFields.filter(field => !parsedCredentials[field] || parsedCredentials[field].trim() === '');

    if (missingFields.length > 0) {
      throw new Error(`Missing or empty required API credentials: ${missingFields.join(', ')}`);
    }

    // Validate field formats (basic validation)
    if (typeof parsedCredentials.alphaVantageApiKey !== 'string' || parsedCredentials.alphaVantageApiKey.length < 8) {
      throw new Error('Invalid AlphaVantage API key format');
    }

    if (typeof parsedCredentials.alpacaApiKey !== 'string' || parsedCredentials.alpacaApiKey.length < 16) {
      throw new Error('Invalid Alpaca API key format');
    }

    if (typeof parsedCredentials.alpacaApiSecret !== 'string' || parsedCredentials.alpacaApiSecret.length < 16) {
      throw new Error('Invalid Alpaca API secret format');
    }

    return {
      alphaVantageApiKey: parsedCredentials.alphaVantageApiKey.trim(),
      alpacaApiKey: parsedCredentials.alpacaApiKey.trim(),
      alpacaApiSecret: parsedCredentials.alpacaApiSecret.trim(),
      lastUpdated: parsedCredentials.lastUpdated || new Date().toISOString()
    };
  }

  /**
   * Clear cached credentials (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Credentials cache cleared');
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test credentials by attempting to retrieve them (useful for health checks)
   */
  async testCredentials(): Promise<boolean> {
    try {
      await this.getApiCredentials();
      return true;
    } catch (error) {
      console.error('Credential test failed:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Get just the AlphaVantage API key (convenience method)
   */
  async getAlphaVantageKey(): Promise<string> {
    const credentials = await this.getApiCredentials();
    return credentials.alphaVantageApiKey;
  }

  /**
   * Get Alpaca credentials (convenience method)
   */
  async getAlpacaCredentials(): Promise<{ apiKey: string; apiSecret: string }> {
    const credentials = await this.getApiCredentials();
    return {
      apiKey: credentials.alpacaApiKey,
      apiSecret: credentials.alpacaApiSecret
    };
  }
} 
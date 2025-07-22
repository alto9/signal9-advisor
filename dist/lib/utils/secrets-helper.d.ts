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
 * Helper class for securely retrieving API credentials from AWS Secrets Manager
 * with in-memory caching to reduce API calls and improve performance
 */
export declare class SecretsHelper {
    private client;
    private secretName;
    private cache;
    private readonly cacheTimeoutMinutes;
    private readonly maxRetries;
    private readonly baseRetryDelayMs;
    constructor(secretName?: string, options?: {
        region?: string;
        cacheTimeoutMinutes?: number;
        maxRetries?: number;
        baseRetryDelayMs?: number;
    });
    /**
     * Retrieve API credentials from Secrets Manager with caching
     * @returns Promise<ApiCredentials> The API credentials
     * @throws Error if credentials cannot be retrieved or are invalid
     */
    getApiCredentials(): Promise<ApiCredentials>;
    /**
     * Fetch credentials with exponential backoff retry logic
     */
    private fetchCredentialsWithRetry;
    /**
     * Fetch credentials from Secrets Manager
     */
    private fetchCredentials;
    /**
     * Clear cached credentials (useful for testing or forcing refresh)
     */
    clearCache(): void;
    /**
     * Get cache statistics for monitoring
     */
    getCacheStats(): {
        size: number;
        entries: string[];
    };
    /**
     * Sleep utility for retry delays
     */
    private sleep;
    /**
     * Test credentials by attempting to retrieve them (useful for health checks)
     */
    testCredentials(): Promise<boolean>;
    /**
     * Get just the AlphaVantage API key (convenience method)
     */
    getAlphaVantageKey(): Promise<string>;
    /**
     * Get Alpaca credentials (convenience method)
     */
    getAlpacaCredentials(): Promise<{
        apiKey: string;
        apiSecret: string;
    }>;
}

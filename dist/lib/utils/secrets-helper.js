"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretsHelper = void 0;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
/**
 * Helper class for securely retrieving API credentials from AWS Secrets Manager
 * with in-memory caching to reduce API calls and improve performance
 */
class SecretsHelper {
    constructor(secretName = 'signal9-advisor/api-credentials', options = {}) {
        this.cache = new Map();
        this.client = new client_secrets_manager_1.SecretsManagerClient({
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
    async getApiCredentials() {
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
        }
        catch (error) {
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
    async fetchCredentialsWithRetry() {
        let lastError;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await this.fetchCredentials();
            }
            catch (error) {
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
    async fetchCredentials() {
        const command = new client_secrets_manager_1.GetSecretValueCommand({
            SecretId: this.secretName
        });
        const response = await this.client.send(command);
        if (!response.SecretString) {
            throw new Error('Secret string is empty or not found');
        }
        let parsedCredentials;
        try {
            parsedCredentials = JSON.parse(response.SecretString);
        }
        catch (parseError) {
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
    clearCache() {
        this.cache.clear();
        console.log('Credentials cache cleared');
    }
    /**
     * Get cache statistics for monitoring
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }
    /**
     * Sleep utility for retry delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Test credentials by attempting to retrieve them (useful for health checks)
     */
    async testCredentials() {
        try {
            await this.getApiCredentials();
            return true;
        }
        catch (error) {
            console.error('Credential test failed:', error instanceof Error ? error.message : String(error));
            return false;
        }
    }
    /**
     * Get just the AlphaVantage API key (convenience method)
     */
    async getAlphaVantageKey() {
        const credentials = await this.getApiCredentials();
        return credentials.alphaVantageApiKey;
    }
    /**
     * Get Alpaca credentials (convenience method)
     */
    async getAlpacaCredentials() {
        const credentials = await this.getApiCredentials();
        return {
            apiKey: credentials.alpacaApiKey,
            apiSecret: credentials.alpacaApiSecret
        };
    }
}
exports.SecretsHelper = SecretsHelper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy1oZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvdXRpbHMvc2VjcmV0cy1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEVBQThGO0FBb0I5Rjs7O0dBR0c7QUFDSCxNQUFhLGFBQWE7SUFReEIsWUFDRSxhQUFxQixpQ0FBaUMsRUFDdEQsVUFLSSxFQUFFO1FBWkEsVUFBSyxHQUE0QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBY2pELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSw2Q0FBb0IsQ0FBQztZQUNyQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1lBQy9ELFdBQVcsRUFBRSxPQUFPLENBQUMsVUFBVSxJQUFJLENBQUM7U0FDckMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixJQUFJLElBQUksQ0FBQztJQUMzRCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxpQkFBaUI7UUFDckIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUVqQyxvQkFBb0I7UUFDcEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDN0MsSUFBSSxXQUFXLElBQUksSUFBSSxJQUFJLEVBQUUsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQ0FBa0MsQ0FB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T0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGVBQWU7UUFDbkIsSUFBSSxDQUFDO1lBQ0gsTUFBTSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUMvQixPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNqRyxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsa0JBQWtCO1FBQ3RCLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDbkQsT0FBTyxXQUFXLENBQUMsa0JBQWtCLENBQUM7SUFDeEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLG9CQUFvQjtRQUN4QixNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ25ELE9BQU87WUFDTCxNQUFNLEVBQUUsV0FBVyxDQUFDLFlBQVk7WUFDaEMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxlQUFlO1NBQ3ZDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFyTUQsc0NBcU1DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU2VjcmV0c01hbmFnZXJDbGllbnQsIEdldFNlY3JldFZhbHVlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zZWNyZXRzLW1hbmFnZXInO1xuXG4vKipcbiAqIEludGVyZmFjZSBmb3IgQVBJIGNyZWRlbnRpYWxzIHN0b3JlZCBpbiBTZWNyZXRzIE1hbmFnZXJcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcGlDcmVkZW50aWFscyB7XG4gIGFscGhhVmFudGFnZUFwaUtleTogc3RyaW5nO1xuICBhbHBhY2FBcGlLZXk6IHN0cmluZztcbiAgYWxwYWNhQXBpU2VjcmV0OiBzdHJpbmc7XG4gIGxhc3RVcGRhdGVkPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIEludGVyZmFjZSBmb3IgY2FjaGUgZW50cnlcbiAqL1xuaW50ZXJmYWNlIENhY2hlRW50cnkge1xuICBjcmVkZW50aWFsczogQXBpQ3JlZGVudGlhbHM7XG4gIGV4cGlyeTogRGF0ZTtcbn1cblxuLyoqXG4gKiBIZWxwZXIgY2xhc3MgZm9yIHNlY3VyZWx5IHJldHJpZXZpbmcgQVBJIGNyZWRlbnRpYWxzIGZyb20gQVdTIFNlY3JldHMgTWFuYWdlclxuICogd2l0aCBpbi1tZW1vcnkgY2FjaGluZyB0byByZWR1Y2UgQVBJIGNhbGxzIGFuZCBpbXByb3ZlIHBlcmZvcm1hbmNlXG4gKi9cbmV4cG9ydCBjbGFzcyBTZWNyZXRzSGVscGVyIHtcbiAgcHJpdmF0ZSBjbGllbnQ6IFNlY3JldHNNYW5hZ2VyQ2xpZW50O1xuICBwcml2YXRlIHNlY3JldE5hbWU6IHN0cmluZztcbiAgcHJpdmF0ZSBjYWNoZTogTWFwPHN0cmluZywgQ2FjaGVFbnRyeT4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgY2FjaGVUaW1lb3V0TWludXRlczogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IG1heFJldHJpZXM6IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBiYXNlUmV0cnlEZWxheU1zOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgc2VjcmV0TmFtZTogc3RyaW5nID0gJ3NpZ25hbDktYWR2aXNvci9hcGktY3JlZGVudGlhbHMnLFxuICAgIG9wdGlvbnM6IHtcbiAgICAgIHJlZ2lvbj86IHN0cmluZztcbiAgICAgIGNhY2hlVGltZW91dE1pbnV0ZXM/OiBudW1iZXI7XG4gICAgICBtYXhSZXRyaWVzPzogbnVtYmVyO1xuICAgICAgYmFzZVJldHJ5RGVsYXlNcz86IG51bWJlcjtcbiAgICB9ID0ge31cbiAgKSB7XG4gICAgdGhpcy5jbGllbnQgPSBuZXcgU2VjcmV0c01hbmFnZXJDbGllbnQoe1xuICAgICAgcmVnaW9uOiBvcHRpb25zLnJlZ2lvbiB8fCBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxuICAgICAgbWF4QXR0ZW1wdHM6IG9wdGlvbnMubWF4UmV0cmllcyB8fCAzXG4gICAgfSk7XG4gICAgdGhpcy5zZWNyZXROYW1lID0gc2VjcmV0TmFtZTtcbiAgICB0aGlzLmNhY2hlVGltZW91dE1pbnV0ZXMgPSBvcHRpb25zLmNhY2hlVGltZW91dE1pbnV0ZXMgfHwgNTtcbiAgICB0aGlzLm1heFJldHJpZXMgPSBvcHRpb25zLm1heFJldHJpZXMgfHwgMztcbiAgICB0aGlzLmJhc2VSZXRyeURlbGF5TXMgPSBvcHRpb25zLmJhc2VSZXRyeURlbGF5TXMgfHwgMTAwMDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBBUEkgY3JlZGVudGlhbHMgZnJvbSBTZWNyZXRzIE1hbmFnZXIgd2l0aCBjYWNoaW5nXG4gICAqIEByZXR1cm5zIFByb21pc2U8QXBpQ3JlZGVudGlhbHM+IFRoZSBBUEkgY3JlZGVudGlhbHNcbiAgICogQHRocm93cyBFcnJvciBpZiBjcmVkZW50aWFscyBjYW5ub3QgYmUgcmV0cmlldmVkIG9yIGFyZSBpbnZhbGlkXG4gICAqL1xuICBhc3luYyBnZXRBcGlDcmVkZW50aWFscygpOiBQcm9taXNlPEFwaUNyZWRlbnRpYWxzPiB7XG4gICAgY29uc3QgY2FjaGVLZXkgPSB0aGlzLnNlY3JldE5hbWU7XG4gICAgXG4gICAgLy8gQ2hlY2sgY2FjaGUgZmlyc3RcbiAgICBjb25zdCBjYWNoZWRFbnRyeSA9IHRoaXMuY2FjaGUuZ2V0KGNhY2hlS2V5KTtcbiAgICBpZiAoY2FjaGVkRW50cnkgJiYgbmV3IERhdGUoKSA8IGNhY2hlZEVudHJ5LmV4cGlyeSkge1xuICAgICAgY29uc29sZS5sb2coJ1JldHJpZXZlZCBjcmVkZW50aWFscyBmcm9tIGNhY2hlJyk7XG4gICAgICByZXR1cm4gY2FjaGVkRW50cnkuY3JlZGVudGlhbHM7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coJ0NhY2hlIG1pc3Mgb3IgZXhwaXJlZCwgZmV0Y2hpbmcgY3JlZGVudGlhbHMgZnJvbSBTZWNyZXRzIE1hbmFnZXInKTtcbiAgICBcbiAgICB0cnkge1xuICAgICAgY29uc3QgY3JlZGVudGlhbHMgPSBhd2FpdCB0aGlzLmZldGNoQ3JlZGVudGlhbHNXaXRoUmV0cnkoKTtcbiAgICAgIFxuICAgICAgLy8gQ2FjaGUgdGhlIGNyZWRlbnRpYWxzXG4gICAgICB0aGlzLmNhY2hlLnNldChjYWNoZUtleSwge1xuICAgICAgICBjcmVkZW50aWFscyxcbiAgICAgICAgZXhwaXJ5OiBuZXcgRGF0ZShEYXRlLm5vdygpICsgdGhpcy5jYWNoZVRpbWVvdXRNaW51dGVzICogNjAgKiAxMDAwKVxuICAgICAgfSk7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdDcmVkZW50aWFscyByZXRyaWV2ZWQgYW5kIGNhY2hlZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgIHJldHVybiBjcmVkZW50aWFscztcbiAgICAgIFxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcmV0cmlldmUgQVBJIGNyZWRlbnRpYWxzOicsIHtcbiAgICAgICAgc2VjcmV0TmFtZTogdGhpcy5zZWNyZXROYW1lLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXG4gICAgICB9KTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGdldCBBUEkgY3JlZGVudGlhbHM6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBGZXRjaCBjcmVkZW50aWFscyB3aXRoIGV4cG9uZW50aWFsIGJhY2tvZmYgcmV0cnkgbG9naWNcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZmV0Y2hDcmVkZW50aWFsc1dpdGhSZXRyeSgpOiBQcm9taXNlPEFwaUNyZWRlbnRpYWxzPiB7XG4gICAgbGV0IGxhc3RFcnJvcjogRXJyb3IgfCB1bmRlZmluZWQ7XG5cbiAgICBmb3IgKGxldCBhdHRlbXB0ID0gMTsgYXR0ZW1wdCA8PSB0aGlzLm1heFJldHJpZXM7IGF0dGVtcHQrKykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZmV0Y2hDcmVkZW50aWFscygpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbGFzdEVycm9yID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGF0dGVtcHQgPT09IHRoaXMubWF4UmV0cmllcykge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEFsbCAke3RoaXMubWF4UmV0cmllc30gYXR0ZW1wdHMgZmFpbGVkYCwgeyBlcnJvcjogbGFzdEVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgdGhyb3cgbGFzdEVycm9yO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZGVsYXlNcyA9IHRoaXMuYmFzZVJldHJ5RGVsYXlNcyAqIE1hdGgucG93KDIsIGF0dGVtcHQgLSAxKTtcbiAgICAgICAgY29uc29sZS53YXJuKGBBdHRlbXB0ICR7YXR0ZW1wdH0gZmFpbGVkLCByZXRyeWluZyBpbiAke2RlbGF5TXN9bXNgLCB7IGVycm9yOiBsYXN0RXJyb3IubWVzc2FnZSB9KTtcbiAgICAgICAgYXdhaXQgdGhpcy5zbGVlcChkZWxheU1zKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aHJvdyBsYXN0RXJyb3IgfHwgbmV3IEVycm9yKCdVbmtub3duIGVycm9yIGR1cmluZyBjcmVkZW50aWFsIHJldHJpZXZhbCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZldGNoIGNyZWRlbnRpYWxzIGZyb20gU2VjcmV0cyBNYW5hZ2VyXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGZldGNoQ3JlZGVudGlhbHMoKTogUHJvbWlzZTxBcGlDcmVkZW50aWFscz4ge1xuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0U2VjcmV0VmFsdWVDb21tYW5kKHtcbiAgICAgIFNlY3JldElkOiB0aGlzLnNlY3JldE5hbWVcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5jbGllbnQuc2VuZChjb21tYW5kKTtcblxuICAgIGlmICghcmVzcG9uc2UuU2VjcmV0U3RyaW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlY3JldCBzdHJpbmcgaXMgZW1wdHkgb3Igbm90IGZvdW5kJyk7XG4gICAgfVxuXG4gICAgbGV0IHBhcnNlZENyZWRlbnRpYWxzOiBhbnk7XG4gICAgdHJ5IHtcbiAgICAgIHBhcnNlZENyZWRlbnRpYWxzID0gSlNPTi5wYXJzZShyZXNwb25zZS5TZWNyZXRTdHJpbmcpO1xuICAgIH0gY2F0Y2ggKHBhcnNlRXJyb3IpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHBhcnNlIHNlY3JldCBKU09OOiAke3BhcnNlRXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IHBhcnNlRXJyb3IubWVzc2FnZSA6IFN0cmluZyhwYXJzZUVycm9yKX1gKTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICBjb25zdCByZXF1aXJlZEZpZWxkcyA9IFsnYWxwaGFWYW50YWdlQXBpS2V5JywgJ2FscGFjYUFwaUtleScsICdhbHBhY2FBcGlTZWNyZXQnXTtcbiAgICBjb25zdCBtaXNzaW5nRmllbGRzID0gcmVxdWlyZWRGaWVsZHMuZmlsdGVyKGZpZWxkID0+ICFwYXJzZWRDcmVkZW50aWFsc1tmaWVsZF0gfHwgcGFyc2VkQ3JlZGVudGlhbHNbZmllbGRdLnRyaW0oKSA9PT0gJycpO1xuXG4gICAgaWYgKG1pc3NpbmdGaWVsZHMubGVuZ3RoID4gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIG9yIGVtcHR5IHJlcXVpcmVkIEFQSSBjcmVkZW50aWFsczogJHttaXNzaW5nRmllbGRzLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgZmllbGQgZm9ybWF0cyAoYmFzaWMgdmFsaWRhdGlvbilcbiAgICBpZiAodHlwZW9mIHBhcnNlZENyZWRlbnRpYWxzLmFscGhhVmFudGFnZUFwaUtleSAhPT0gJ3N0cmluZycgfHwgcGFyc2VkQ3JlZGVudGlhbHMuYWxwaGFWYW50YWdlQXBpS2V5Lmxlbmd0aCA8IDgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBBbHBoYVZhbnRhZ2UgQVBJIGtleSBmb3JtYXQnKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHBhcnNlZENyZWRlbnRpYWxzLmFscGFjYUFwaUtleSAhPT0gJ3N0cmluZycgfHwgcGFyc2VkQ3JlZGVudGlhbHMuYWxwYWNhQXBpS2V5Lmxlbmd0aCA8IDE2KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQWxwYWNhIEFQSSBrZXkgZm9ybWF0Jyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBwYXJzZWRDcmVkZW50aWFscy5hbHBhY2FBcGlTZWNyZXQgIT09ICdzdHJpbmcnIHx8IHBhcnNlZENyZWRlbnRpYWxzLmFscGFjYUFwaVNlY3JldC5sZW5ndGggPCAxNikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEFscGFjYSBBUEkgc2VjcmV0IGZvcm1hdCcpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBhbHBoYVZhbnRhZ2VBcGlLZXk6IHBhcnNlZENyZWRlbnRpYWxzLmFscGhhVmFudGFnZUFwaUtleS50cmltKCksXG4gICAgICBhbHBhY2FBcGlLZXk6IHBhcnNlZENyZWRlbnRpYWxzLmFscGFjYUFwaUtleS50cmltKCksXG4gICAgICBhbHBhY2FBcGlTZWNyZXQ6IHBhcnNlZENyZWRlbnRpYWxzLmFscGFjYUFwaVNlY3JldC50cmltKCksXG4gICAgICBsYXN0VXBkYXRlZDogcGFyc2VkQ3JlZGVudGlhbHMubGFzdFVwZGF0ZWQgfHwgbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhciBjYWNoZWQgY3JlZGVudGlhbHMgKHVzZWZ1bCBmb3IgdGVzdGluZyBvciBmb3JjaW5nIHJlZnJlc2gpXG4gICAqL1xuICBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgIHRoaXMuY2FjaGUuY2xlYXIoKTtcbiAgICBjb25zb2xlLmxvZygnQ3JlZGVudGlhbHMgY2FjaGUgY2xlYXJlZCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjYWNoZSBzdGF0aXN0aWNzIGZvciBtb25pdG9yaW5nXG4gICAqL1xuICBnZXRDYWNoZVN0YXRzKCk6IHsgc2l6ZTogbnVtYmVyOyBlbnRyaWVzOiBzdHJpbmdbXSB9IHtcbiAgICByZXR1cm4ge1xuICAgICAgc2l6ZTogdGhpcy5jYWNoZS5zaXplLFxuICAgICAgZW50cmllczogQXJyYXkuZnJvbSh0aGlzLmNhY2hlLmtleXMoKSlcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFNsZWVwIHV0aWxpdHkgZm9yIHJldHJ5IGRlbGF5c1xuICAgKi9cbiAgcHJpdmF0ZSBzbGVlcChtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRlc3QgY3JlZGVudGlhbHMgYnkgYXR0ZW1wdGluZyB0byByZXRyaWV2ZSB0aGVtICh1c2VmdWwgZm9yIGhlYWx0aCBjaGVja3MpXG4gICAqL1xuICBhc3luYyB0ZXN0Q3JlZGVudGlhbHMoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuZ2V0QXBpQ3JlZGVudGlhbHMoKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdDcmVkZW50aWFsIHRlc3QgZmFpbGVkOicsIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBqdXN0IHRoZSBBbHBoYVZhbnRhZ2UgQVBJIGtleSAoY29udmVuaWVuY2UgbWV0aG9kKVxuICAgKi9cbiAgYXN5bmMgZ2V0QWxwaGFWYW50YWdlS2V5KCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgY3JlZGVudGlhbHMgPSBhd2FpdCB0aGlzLmdldEFwaUNyZWRlbnRpYWxzKCk7XG4gICAgcmV0dXJuIGNyZWRlbnRpYWxzLmFscGhhVmFudGFnZUFwaUtleTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgQWxwYWNhIGNyZWRlbnRpYWxzIChjb252ZW5pZW5jZSBtZXRob2QpXG4gICAqL1xuICBhc3luYyBnZXRBbHBhY2FDcmVkZW50aWFscygpOiBQcm9taXNlPHsgYXBpS2V5OiBzdHJpbmc7IGFwaVNlY3JldDogc3RyaW5nIH0+IHtcbiAgICBjb25zdCBjcmVkZW50aWFscyA9IGF3YWl0IHRoaXMuZ2V0QXBpQ3JlZGVudGlhbHMoKTtcbiAgICByZXR1cm4ge1xuICAgICAgYXBpS2V5OiBjcmVkZW50aWFscy5hbHBhY2FBcGlLZXksXG4gICAgICBhcGlTZWNyZXQ6IGNyZWRlbnRpYWxzLmFscGFjYUFwaVNlY3JldFxuICAgIH07XG4gIH1cbn0gIl19
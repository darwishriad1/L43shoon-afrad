/**
 * Resilient fetch wrapper with automatic retry capabilities and exponential backoff.
 * Helps prevent "Failed to fetch" errors caused by transient network glitches,
 * cold-starts, or temporary server restarts during deployment.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  delay = 1000
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // If we get a transient server error (500, 502, 503, 504), retry
    if (!response.ok && response.status >= 500 && retries > 0) {
      console.warn(`Server returned status ${response.status} for ${url}. Retrying... (${retries} left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    
    return response;
  } catch (error) {
    // If a network error occurs (e.g. TypeError: Failed to fetch), retry
    if (retries > 0) {
      console.warn(`Fetch failed for ${url} with error:`, error, `. Retrying in ${delay}ms... (${retries} left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

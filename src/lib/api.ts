/**
 * Resilient fetch wrapper with automatic retry capabilities and exponential backoff.
 * Helps prevent "Failed to fetch" or "Rate exceeded" errors caused by transient network glitches,
 * rate limits (429), cold-starts, or temporary server restarts during deployment.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 5,
  delay = 1000
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // If rate limited (429) or transient server error (500, 502, 503, 504), retry with backoff
    if ((response.status === 429 || (!response.ok && response.status >= 500)) && retries > 0) {
      console.warn(`Server returned status ${response.status} for ${url}. Retrying in ${delay}ms... (${retries} left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      console.warn(`Fetch failed for ${url} with error:`, error, `. Retrying in ${delay}ms... (${retries} left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

/**
 * Safely parses JSON response with error handling for non-JSON or rate limit text responses.
 */
export async function safeJson<T = any>(res: Response, fallback?: T): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (text.includes('Rate exceeded') || res.status === 429) {
      if (fallback !== undefined) return fallback;
      throw new Error('تجاوز عدد الطلبات المسموح بها مؤقتاً، يرجى إعادة المحاولة.');
    }
    if (fallback !== undefined) return fallback;
    throw new Error(`خطأ من الخادم (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  
  if (!text || text.trim() === '') {
    if (fallback !== undefined) return fallback;
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    if (fallback !== undefined) return fallback;
    throw new Error(`تعذر معالجة استجابة الخادم: ${text.slice(0, 100)}`);
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let unauthorizedListener: (() => void) | null = null;

export function setUnauthorizedListener(listener: (() => void) | null) {
  unauthorizedListener = listener;
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem('military_auth_token') || localStorage.getItem('authToken') || localStorage.getItem('token');
  } catch {
    return null;
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
  isRetryable = false,
  maxRetries = 2
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const { timeoutMs = 15000, ...fetchOptions } = options;

  let attempt = 0;
  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: response.statusText };
        }

        const errorMessage = errorData?.error || errorData?.message || `خطأ في الاتصال بالسيرفر (${response.status})`;

        if (response.status === 401) {
          if (unauthorizedListener) {
            unauthorizedListener();
          }
        }

        throw new ApiError(errorMessage, response.status, errorData);
      }

      // 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (error: any) {
      clearTimeout(timer);

      if (error instanceof ApiError) {
        throw error;
      }

      const isNetworkOrTimeout = error.name === 'AbortError' || error.message?.includes('fetch') || error.message?.includes('network');
      
      if (isRetryable && isNetworkOrTimeout && attempt < maxRetries) {
        attempt++;
        await new Promise((res) => setTimeout(res, 800 * attempt));
        continue;
      }

      throw new ApiError(
        error.name === 'AbortError' ? 'انتهت مهلة الطلب، يرجى المحاولة لاحقاً' : (error.message || 'فشل الاتصال بالشبكة'),
        0
      );
    }
  }

  throw new ApiError('فشل الاتصال بالشبكة بعد عدة محاولات', 0);
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions): Promise<T> =>
    request<T>(endpoint, { ...options, method: 'GET' }, true, 2),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }, false, 0),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }, false, 0),

  delete: <T>(endpoint: string, options?: RequestOptions): Promise<T> =>
    request<T>(endpoint, { ...options, method: 'DELETE' }, false, 0),
};

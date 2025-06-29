// API utility functions for better error handling

export const handleApiError = (error: any, context: string = 'API call') => {
  console.error(`${context} error:`, error);
  
  // Handle different types of errors
  if (error?.message?.includes('Unexpected token')) {
    console.error('JSON parsing error - likely received HTML instead of JSON');
    return {
      error: true,
      message: 'Server returned invalid response format',
      details: 'The server returned HTML instead of JSON. This might be a routing or server configuration issue.'
    };
  }
  
  if (error?.code === 'NETWORK_ERROR') {
    return {
      error: true,
      message: 'Network error',
      details: 'Unable to connect to the server. Please check your internet connection.'
    };
  }
  
  if (error?.status === 404) {
    return {
      error: true,
      message: 'Resource not found',
      details: 'The requested resource was not found on the server.'
    };
  }
  
  if (error?.status >= 500) {
    return {
      error: true,
      message: 'Server error',
      details: 'The server encountered an error. Please try again later.'
    };
  }
  
  return {
    error: true,
    message: error?.message || 'Unknown error occurred',
    details: error?.details || 'An unexpected error occurred'
  };
};

export const safeJsonParse = (response: Response) => {
  const contentType = response.headers.get('content-type');
  
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Response is not JSON');
  }
  
  return response.json();
};

export const createApiError = (message: string, status?: number, details?: string) => ({
  error: true,
  message,
  status,
  details,
  timestamp: new Date().toISOString()
});

// Enhanced fetch wrapper with better error handling
export const apiFetch = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await safeJsonParse(response);
  } catch (error) {
    throw handleApiError(error, `Fetch to ${url}`);
  }
}; 
// Configuration for different environments
export const config = {
  // Get the current environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Base URL for redirects
  getBaseUrl: () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    // Fallback for SSR - use environment variable if available
    const envUrl = import.meta.env.VITE_APP_URL;
    if (envUrl) {
      return envUrl;
    }
    return process.env.NODE_ENV === 'development' 
      ? 'http://localhost:8080' 
      : 'https://isplit.netlify.app';
  },
  
  // Auth redirect URLs
  getAuthRedirectUrl: () => `${config.getBaseUrl()}/reset-password`,
  getSignupRedirectUrl: () => `${config.getBaseUrl()}/auth/callback`,
  
  // Supabase settings
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  }
}; 
// Environment validation utility
export const validateEnvironment = () => {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];

  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    console.error('Please check your .env file and ensure all required variables are set.');
    return false;
  }

  return true;
};

// Validate environment on import
if (typeof window !== 'undefined') {
  validateEnvironment();
} 
// Production configuration and utilities

export const PRODUCTION_CONFIG = {
  // Security settings
  MAX_LOGIN_ATTEMPTS: 5,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  PASSWORD_MIN_LENGTH: 8,
  
  // Rate limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS_PER_WINDOW: 100,
  
  // File upload limits
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  
  // Error reporting
  ENABLE_ERROR_REPORTING: true,
  ERROR_SAMPLE_RATE: 0.1, // 10% of errors
  
  // Performance
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  DEBOUNCE_DELAY: 300, // 300ms
  
  // Feature flags
  ENABLE_ANALYTICS: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_REAL_TIME_UPDATES: true,
};

// Production error handler
export class ProductionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'ProductionError';
  }
}

// Rate limiting utility
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - PRODUCTION_CONFIG.RATE_LIMIT_WINDOW;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, [now]);
      return true;
    }

    const requests = this.requests.get(key)!;
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= PRODUCTION_CONFIG.MAX_REQUESTS_PER_WINDOW) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }

  cleanup(): void {
    const now = Date.now();
    const windowStart = now - PRODUCTION_CONFIG.RATE_LIMIT_WINDOW;
    
    for (const [key, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => time > windowStart);
      if (recentRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recentRequests);
      }
    }
  }
}

// Input validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < PRODUCTION_CONFIG.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PRODUCTION_CONFIG.PASSWORD_MIN_LENGTH} characters long`);
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

// Performance monitoring
export const performanceMonitor = {
  startTime: Date.now(),
  
  logPerformance(operation: string, duration: number): void {
    if (PRODUCTION_CONFIG.ENABLE_ANALYTICS) {
      console.log(`Performance: ${operation} took ${duration}ms`);
    }
  },
  
  getUptime(): number {
    return Date.now() - this.startTime;
  }
};

// Security utilities
export const securityUtils = {
  generateSecureToken(): string {
    return crypto.randomUUID();
  },
  
  hashPassword(password: string): Promise<string> {
    // In a real app, you'd use a proper hashing library
    return Promise.resolve(btoa(password)); // Base64 encoding (not secure, just for demo)
  },
  
  validateToken(token: string): boolean {
    // In a real app, you'd validate JWT tokens
    return token.length > 0;
  }
};

// Cache utility
export class Cache {
  private cache = new Map<string, { value: any; expiry: number }>();

  set(key: string, value: any, ttl: number = PRODUCTION_CONFIG.CACHE_TTL): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();

// Global cache instance
export const globalCache = new Cache();

// Cleanup intervals
setInterval(() => {
  globalRateLimiter.cleanup();
  globalCache.cleanup();
}, 60000); // Clean up every minute 
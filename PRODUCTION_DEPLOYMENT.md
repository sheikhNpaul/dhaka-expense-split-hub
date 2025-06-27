# Production Deployment Guide

## 🚀 Pre-Deployment Checklist

### 1. Environment Variables
Create a `.env.production` file with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key

# App Configuration
VITE_APP_NAME="Dhaka Expense Split Hub"
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production

# Security
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_NOTIFICATIONS=true

# Performance
VITE_CACHE_TTL=300000
VITE_RATE_LIMIT_WINDOW=900000
VITE_MAX_REQUESTS_PER_WINDOW=100
```

### 2. Database Setup
Run the production SQL script in your Supabase project:

```sql
-- Run the production_setup.sql script
-- This sets up proper RLS policies, indexes, and constraints
```

### 3. Supabase Configuration

#### Authentication Settings
- [ ] Enable email confirmations
- [ ] Set up proper redirect URLs
- [ ] Configure password policies
- [ ] Enable CAPTCHA protection
- [ ] Set up email templates

#### Security Settings
- [ ] Enable RLS on all tables
- [ ] Configure proper CORS settings
- [ ] Set up API rate limiting
- [ ] Enable audit logging

#### Storage Settings
- [ ] Configure storage buckets
- [ ] Set up storage policies
- [ ] Enable file upload restrictions

## 🏗️ Build Configuration

### 1. Update package.json
```json
{
  "scripts": {
    "build": "tsc && vite build",
    "build:production": "tsc && vite build --mode production",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix"
  }
}
```

### 2. Vite Configuration
Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@/components/ui'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
})
```

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

3. **Environment Variables:**
   - Go to Vercel Dashboard
   - Add all environment variables from `.env.production`

### Option 2: Netlify

1. **Build Command:**
   ```bash
   npm run build:production
   ```

2. **Publish Directory:**
   ```
   dist
   ```

3. **Environment Variables:**
   - Add in Netlify Dashboard under Site Settings > Environment Variables

### Option 3: GitHub Pages

1. **Add GitHub Actions workflow:**
   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - uses: actions/setup-node@v2
           with:
             node-version: '18'
         - run: npm ci
         - run: npm run build:production
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

## 🔒 Security Checklist

### Frontend Security
- [ ] Input validation on all forms
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Content Security Policy (CSP)
- [ ] HTTPS enforcement
- [ ] Secure cookie settings

### Backend Security (Supabase)
- [ ] RLS policies implemented
- [ ] API rate limiting
- [ ] Input sanitization
- [ ] SQL injection protection
- [ ] Authentication required for all endpoints
- [ ] Audit logging enabled

### Environment Security
- [ ] Environment variables secured
- [ ] API keys rotated regularly
- [ ] Access logs monitored
- [ ] Error reporting configured
- [ ] Backup strategy implemented

## 📊 Monitoring & Analytics

### 1. Error Monitoring
Integrate with Sentry or similar:

```typescript
// src/lib/monitoring.ts
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production",
  tracesSampleRate: 0.1,
});
```

### 2. Performance Monitoring
```typescript
// src/lib/analytics.ts
export const trackEvent = (event: string, properties?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'production') {
    // Send to analytics service
    console.log('Analytics:', event, properties);
  }
};
```

### 3. Health Checks
Create a health check endpoint:

```typescript
// src/pages/health.tsx
export const HealthCheck = () => {
  return (
    <div>
      <h1>Health Check</h1>
      <p>Status: OK</p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  );
};
```

## 🚀 Performance Optimization

### 1. Code Splitting
```typescript
// Lazy load components
const Dashboard = lazy(() => import('./components/Dashboard'));
const Auth = lazy(() => import('./components/Auth'));
```

### 2. Image Optimization
```typescript
// Use optimized images
import { Image } from '@/components/ui/image';
```

### 3. Caching Strategy
```typescript
// Implement caching
import { globalCache } from '@/lib/production';

const cachedData = globalCache.get('key');
if (!cachedData) {
  // Fetch and cache
  globalCache.set('key', data);
}
```

## 📱 PWA Configuration

### 1. Create manifest.json
```json
{
  "name": "Dhaka Expense Split Hub",
  "short_name": "ExpenseHub",
  "description": "Split expenses with roommates",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 2. Service Worker
```typescript
// public/sw.js
const CACHE_NAME = 'expense-hub-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/static/js/bundle.js',
        '/static/css/main.css',
      ]);
    })
  );
});
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build:production
      - uses: actions/upload-artifact@v2
        with:
          name: build
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/download-artifact@v2
        with:
          name: build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 📈 Post-Deployment

### 1. Testing Checklist
- [ ] Authentication flow
- [ ] Home creation and joining
- [ ] Expense management
- [ ] Payment requests
- [ ] Mobile responsiveness
- [ ] Performance metrics
- [ ] Error handling

### 2. Monitoring Setup
- [ ] Uptime monitoring
- [ ] Error tracking
- [ ] Performance monitoring
- [ ] User analytics
- [ ] Database monitoring

### 3. Backup Strategy
- [ ] Database backups
- [ ] File storage backups
- [ ] Configuration backups
- [ ] Recovery procedures

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript errors
   - Verify all dependencies are installed
   - Check environment variables

2. **Runtime Errors**
   - Check browser console
   - Verify Supabase connection
   - Check RLS policies

3. **Performance Issues**
   - Monitor bundle size
   - Check network requests
   - Optimize images and assets

### Support Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org)

## 📞 Contact

For production support:
- Email: support@yourdomain.com
- Documentation: https://docs.yourdomain.com
- Status Page: https://status.yourdomain.com 
# SplitIt - Smart Expense Tracking

A modern expense tracking and splitting application built for roommates, friends, and groups to manage shared expenses efficiently.

## Features

- **Smart Expense Tracking**: Monitor daily spending with intelligent categorization
- **Group Expense Splitting**: Easily split bills with roommates, friends, and family
- **Visual Analytics**: Get detailed insights into spending patterns with interactive charts
- **Real-time Sync**: Access your expenses across all devices instantly
- **Secure & Private**: Enterprise-grade security for your financial data
- **Mobile Optimized**: Full-featured mobile experience for tracking on the go

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Build Tool**: Vite
- **State Management**: TanStack Query
- **Routing**: React Router DOM

## Environment Setup

This project requires environment variables for Supabase configuration. Follow these steps to set up your environment:

### 1. Create Environment File
Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Get Supabase Credentials
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** and **anon public** key
5. Paste them in your `.env` file

### 3. Production Deployment
When deploying to production (Netlify, Vercel, etc.), make sure to:
1. Add the environment variables in your hosting platform's settings
2. Update the redirect URLs in your Supabase project:
   - Go to **Authentication** → **URL Configuration**
   - Add your production domain URLs to the **Redirect URLs** list

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd dhaka-expense-split-hub

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:8080`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── lib/           # Utility functions and configurations
├── integrations/  # External service integrations
└── ui/            # shadcn/ui components
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

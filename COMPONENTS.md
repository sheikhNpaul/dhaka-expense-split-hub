# Components Documentation

## Core Components

### Authentication Components

#### `Auth.tsx`
The main authentication component that handles user login and registration.
- Props: None
- Features: 
  - Email/Password authentication
  - Social authentication integration
  - Error handling and validation

#### `AuthGuard.tsx`
A wrapper component that protects routes requiring authentication.
- Props: 
  - `children`: React nodes to render when authenticated
- Features:
  - Redirects unauthenticated users
  - Loading state handling

### Dashboard Components

#### `Dashboard.tsx`
The main dashboard interface showing expenses and analytics.
- Features:
  - Expense overview
  - Charts and statistics
  - Navigation to other sections

#### `BalanceDashboard.tsx`
Shows user balances and payment status.
- Features:
  - Current balance display
  - Payment history
  - Settlement suggestions

### Expense Management

#### `ExpenseForm.tsx`
Form for adding and editing expenses.
- Features:
  - Multiple expense categories
  - Split options
  - File attachments
  - Real-time validation

#### `ExpenseList.tsx`
Displays list of expenses with filtering and sorting.
- Features:
  - Pagination
  - Search and filters
  - Sort by date/amount
  - Edit/delete actions

### User Interface Components

#### `AnimatedBackground.tsx`
Provides animated background effects.
- Props:
  - `variant`: Animation style
  - `intensity`: Animation intensity

#### `LoadingSpinner.tsx`
Loading indicator component.
- Props:
  - `size`: sm | md | lg
  - `color`: Primary color

#### `NotificationBell.tsx`
Notification indicator with badge.
- Features:
  - Real-time updates
  - Notification counter
  - Click to view details

### Meal Planning

#### `MealPlanner.tsx`
Calendar-based meal planning interface.
- Features:
  - Monthly view
  - Add/remove meals
  - Member totals
  - Real-time updates

### Theme and Layout

#### `ThemeProvider.tsx`
Manages application theming.
- Features:
  - Light/dark mode
  - Custom color schemes
  - Theme persistence

#### `NotionSidebar.tsx`
Navigation sidebar with Notion-like design.
- Features:
  - Collapsible sections
  - Search functionality
  - Keyboard shortcuts

## UI Components

All UI components are built using shadcn/ui and can be found in the `components/ui` directory. These include:

- `accordion.tsx`: Collapsible content sections
- `alert.tsx`: Alert messages
- `button.tsx`: Various button styles
- `card.tsx`: Content containers
- `dialog.tsx`: Modal dialogs
- `input.tsx`: Form inputs
- `select.tsx`: Dropdown selectors
- And many more...

## Hooks

### `useAuth.tsx`
Custom hook for authentication state and methods.
- Returns:
  - `user`: Current user object
  - `signIn`: Sign in method
  - `signOut`: Sign out method
  - `loading`: Authentication loading state

### `use-mobile.tsx`
Hook for responsive design and mobile detection.
- Returns:
  - `isMobile`: Boolean
  - `screenSize`: Current screen dimensions

## Best Practices

1. **Component Organization**
   - Keep components focused and single-responsibility
   - Use TypeScript interfaces for props
   - Implement error boundaries where needed

2. **State Management**
   - Use React Query for server state
   - Local state with useState/useReducer
   - Context for global state

3. **Performance**
   - Implement proper memoization
   - Lazy load components when possible
   - Optimize re-renders

4. **Accessibility**
   - Use ARIA attributes
   - Ensure keyboard navigation
   - Maintain proper contrast ratios

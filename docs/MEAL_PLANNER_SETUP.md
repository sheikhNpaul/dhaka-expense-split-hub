# Meal Planner Feature Setup

## Overview
The meal planner feature allows users to select how many meals they want to eat each day using a calendar interface. The dashboard shows the total number of meals ordered by all members for each day.

## Features
- 📅 Calendar view with month navigation
- ➕ Add/remove meals for specific days
- 👥 View total meals per day for all members
- 📊 Member meal summary with totals and averages
- 📱 Mobile-friendly interface
- 🔄 Real-time updates

## Database Setup

### 1. Create the meal_orders table
Run the following SQL commands in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of meal_orders_setup.sql
```

Or run the commands from the `meal_orders_setup.sql` file in your Supabase dashboard.

### 2. Verify the table structure
The `meal_orders` table should have the following columns:
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to profiles)
- `home_id` (UUID, Foreign Key to homes)
- `date` (DATE)
- `meal_count` (INTEGER)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## How to Use

### For Users:
1. **Navigate to the Meals tab** - Click on the "Meals" tab in the dashboard
2. **Select a home** - Make sure you have a home selected first
3. **Navigate months** - Use the arrow buttons to change months
4. **Add meals** - Click the "+" button on any day to add a meal
5. **Remove meals** - Click the "-" button to remove a meal
6. **View totals** - See the total meals for each day with the utensils icon
7. **Check member summary** - View how many meals each member has ordered

### Features:
- **Calendar View**: Full month calendar with day-by-day meal selection
- **Real-time Updates**: Changes are saved immediately
- **Member Summary**: See total and average meals per member
- **Mobile Optimized**: Touch-friendly interface for mobile devices
- **Visual Indicators**: 
  - Today's date is highlighted with a ring
  - Total meals per day shown with utensils icon
  - Your meal count shown with a badge

## Technical Details

### Components:
- `MealPlanner.tsx` - Main meal planner component
- Integrated into `Dashboard.tsx` as a new tab

### Database Operations:
- **Create**: Insert new meal orders
- **Read**: Fetch meal orders for current month and home
- **Update**: Modify existing meal counts
- **Delete**: Remove meal orders when count reaches 0

### Security:
- Row Level Security (RLS) enabled
- Users can only access meal orders for homes they're members of
- Users can only modify their own meal orders

### Performance:
- Indexed queries for fast retrieval
- Optimized for monthly data fetching
- Efficient member summary calculations

## Troubleshooting

### Common Issues:

1. **"Please select a home first" message**
   - Solution: Go to the Homes tab and select a home first

2. **Meal orders not saving**
   - Check if you're logged in
   - Verify you're a member of the home
   - Check browser console for errors

3. **Calendar not loading**
   - Ensure the database table is created
   - Check network connectivity
   - Verify Supabase connection

### Database Errors:
If you encounter database errors, ensure:
- The `meal_orders` table exists
- RLS policies are properly configured
- Foreign key relationships are correct
- User has proper permissions

## Future Enhancements
- Meal cost tracking
- Dietary preferences
- Meal planning templates
- Export functionality
- Notifications for meal changes 
-- Run this SQL in your Supabase SQL Editor to set up automatic profile creation
-- This script safely handles existing policies and triggers

-- Enable Row Level Security (RLS) on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create policy to allow users to read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policy to allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'username',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.homes TO anon, authenticated;
GRANT ALL ON public.home_members TO anon, authenticated;
GRANT ALL ON public.expenses TO anon, authenticated;
GRANT ALL ON public.expense_comments TO anon, authenticated;
GRANT ALL ON public.payment_requests TO anon, authenticated;
GRANT ALL ON public.meal_orders TO anon, authenticated;

-- Enable RLS on other tables
ALTER TABLE homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for homes table
DROP POLICY IF EXISTS "Users can view homes they are members of" ON homes;
DROP POLICY IF EXISTS "Users can create homes" ON homes;
DROP POLICY IF EXISTS "Home admins can update homes" ON homes;

-- Create policies for homes table
CREATE POLICY "Users can view homes they are members of" ON homes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM home_members 
      WHERE home_id = homes.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create homes" ON homes
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Home admins can update homes" ON homes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM home_members 
      WHERE home_id = homes.id AND user_id = auth.uid() AND is_admin = true
    )
  );

-- Drop existing policies for home_members table
DROP POLICY IF EXISTS "Users can view members of their homes" ON home_members;
DROP POLICY IF EXISTS "Home admins can manage members" ON home_members;

-- Create policies for home_members table
CREATE POLICY "Users can view members of their homes" ON home_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM home_members hm2
      WHERE hm2.home_id = home_members.home_id AND hm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Home admins can manage members" ON home_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM home_members hm2
      WHERE hm2.home_id = home_members.home_id AND hm2.user_id = auth.uid() AND hm2.is_admin = true
    )
  );

-- Drop existing policies for expenses table
DROP POLICY IF EXISTS "Users can view expenses in their homes" ON expenses;
DROP POLICY IF EXISTS "Users can create expenses in their homes" ON expenses;
DROP POLICY IF EXISTS "Users can update expenses they created" ON expenses;

-- Create policies for expenses table
CREATE POLICY "Users can view expenses in their homes" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM home_members 
      WHERE home_id = expenses.home_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create expenses in their homes" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM home_members 
      WHERE home_id = expenses.home_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update expenses they created" ON expenses
  FOR UPDATE USING (payer_id = auth.uid());

-- Drop existing policies for expense_comments table
DROP POLICY IF EXISTS "Users can view comments on expenses in their homes" ON expense_comments;
DROP POLICY IF EXISTS "Users can create comments on expenses in their homes" ON expense_comments;

-- Create policies for expense_comments table
CREATE POLICY "Users can view comments on expenses in their homes" ON expense_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM expenses e
      JOIN home_members hm ON e.home_id = hm.home_id
      WHERE e.id = expense_comments.expense_id AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on expenses in their homes" ON expense_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses e
      JOIN home_members hm ON e.home_id = hm.home_id
      WHERE e.id = expense_comments.expense_id AND hm.user_id = auth.uid()
    )
  );

-- Drop existing policies for payment_requests table
DROP POLICY IF EXISTS "Users can view payment requests in their homes" ON payment_requests;
DROP POLICY IF EXISTS "Users can create payment requests in their homes" ON payment_requests;

-- Create policies for payment_requests table
CREATE POLICY "Users can view payment requests in their homes" ON payment_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM home_members 
      WHERE home_id = payment_requests.home_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create payment requests in their homes" ON payment_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM home_members 
      WHERE home_id = payment_requests.home_id AND user_id = auth.uid()
    )
  );

-- Drop existing policies for meal_orders table
DROP POLICY IF EXISTS "Users can view meal orders in their homes" ON meal_orders;
DROP POLICY IF EXISTS "Users can manage their own meal orders" ON meal_orders;

-- Create policies for meal_orders table
CREATE POLICY "Users can view meal orders in their homes" ON meal_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM home_members 
      WHERE home_id = meal_orders.home_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own meal orders" ON meal_orders
  FOR ALL USING (user_id = auth.uid()); 
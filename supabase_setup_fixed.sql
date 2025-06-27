-- Fixed Supabase setup to resolve infinite recursion in RLS policies
-- Run this SQL in your Supabase SQL Editor

-- First, disable RLS temporarily to clean up
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE homes DISABLE ROW LEVEL SECURITY;
ALTER TABLE home_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE meal_orders DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (comprehensive cleanup)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view homes they are members of" ON homes;
DROP POLICY IF EXISTS "Users can create homes" ON homes;
DROP POLICY IF EXISTS "Home admins can update homes" ON homes;

DROP POLICY IF EXISTS "Users can view members of their homes" ON home_members;
DROP POLICY IF EXISTS "Home admins can manage members" ON home_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON home_members;
DROP POLICY IF EXISTS "Users can view members of homes they belong to" ON home_members;
DROP POLICY IF EXISTS "Users can join homes" ON home_members;
DROP POLICY IF EXISTS "Home admins can delete members" ON home_members;

DROP POLICY IF EXISTS "Users can view expenses in their homes" ON expenses;
DROP POLICY IF EXISTS "Users can create expenses in their homes" ON expenses;
DROP POLICY IF EXISTS "Users can update expenses they created" ON expenses;
DROP POLICY IF EXISTS "Users can delete expenses they created" ON expenses;

DROP POLICY IF EXISTS "Users can view comments on expenses in their homes" ON expense_comments;
DROP POLICY IF EXISTS "Users can create comments on expenses in their homes" ON expense_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON expense_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON expense_comments;

DROP POLICY IF EXISTS "Users can view payment requests in their homes" ON payment_requests;
DROP POLICY IF EXISTS "Users can create payment requests in their homes" ON payment_requests;
DROP POLICY IF EXISTS "Users can update payment requests they are involved in" ON payment_requests;

DROP POLICY IF EXISTS "Users can view meal orders in their homes" ON meal_orders;
DROP POLICY IF EXISTS "Users can manage their own meal orders" ON meal_orders;

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

-- Now enable RLS and create fixed policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_orders ENABLE ROW LEVEL SECURITY;

-- Profiles policies (simple)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Homes policies (fixed to avoid recursion)
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

-- Home members policies (fixed to avoid recursion)
CREATE POLICY "Users can view their own memberships" ON home_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view members of homes they belong to" ON home_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM home_members hm2
      WHERE hm2.home_id = home_members.home_id AND hm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join homes" ON home_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Home admins can manage members" ON home_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM home_members hm2
      WHERE hm2.home_id = home_members.home_id AND hm2.user_id = auth.uid() AND hm2.is_admin = true
    )
  );

CREATE POLICY "Home admins can delete members" ON home_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM home_members hm2
      WHERE hm2.home_id = home_members.home_id AND hm2.user_id = auth.uid() AND hm2.is_admin = true
    )
  );

-- Expenses policies
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

CREATE POLICY "Users can delete expenses they created" ON expenses
  FOR DELETE USING (payer_id = auth.uid());

-- Expense comments policies
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

CREATE POLICY "Users can update their own comments" ON expense_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON expense_comments
  FOR DELETE USING (user_id = auth.uid());

-- Payment requests policies
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

CREATE POLICY "Users can update payment requests they are involved in" ON payment_requests
  FOR UPDATE USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Meal orders policies
CREATE POLICY "Users can view meal orders in their homes" ON meal_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM home_members 
      WHERE home_id = meal_orders.home_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own meal orders" ON meal_orders
  FOR ALL USING (user_id = auth.uid());

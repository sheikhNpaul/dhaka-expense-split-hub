-- Run this SQL in your Supabase SQL Editor to create the meal_orders table

-- Create meal_orders table
CREATE TABLE IF NOT EXISTS public.meal_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_count INTEGER NOT NULL CHECK (meal_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, home_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meal_orders_user_id ON public.meal_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_orders_home_id ON public.meal_orders(home_id);
CREATE INDEX IF NOT EXISTS idx_meal_orders_date ON public.meal_orders(date);
CREATE INDEX IF NOT EXISTS idx_meal_orders_home_date ON public.meal_orders(home_id, date);

-- Enable RLS
ALTER TABLE public.meal_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view meal orders for their homes" ON public.meal_orders
    FOR SELECT USING (
        home_id IN (
            SELECT home_id FROM public.home_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can insert their own meal orders" ON public.meal_orders
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        home_id IN (
            SELECT home_id FROM public.home_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can update their own meal orders" ON public.meal_orders
    FOR UPDATE USING (
        user_id = auth.uid() AND
        home_id IN (
            SELECT home_id FROM public.home_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can delete their own meal orders" ON public.meal_orders
    FOR DELETE USING (
        user_id = auth.uid() AND
        home_id IN (
            SELECT home_id FROM public.home_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Create function to update updated_at timestamp (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS handle_meal_orders_updated_at ON public.meal_orders;
CREATE TRIGGER handle_meal_orders_updated_at
    BEFORE UPDATE ON public.meal_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 
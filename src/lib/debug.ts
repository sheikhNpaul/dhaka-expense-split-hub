import { supabase } from '@/integrations/supabase/client';

export const debugSupabase = async () => {
  console.log('🔍 Starting Supabase Debug...');
  
  try {
    // 1. Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('📋 Session Check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      error: sessionError?.message
    });

    if (!session?.user?.id) {
      console.log('❌ No authenticated user found');
      return;
    }

    // 2. Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    console.log('👤 Profile Check:', {
      hasProfile: !!profile,
      profileData: profile,
      error: profileError?.message
    });

    // 3. Check homes
    const { data: homes, error: homesError } = await supabase
      .from('homes')
      .select(`
        *,
        home_members!inner(user_id)
      `)
      .eq('home_members.user_id', session.user.id);

    console.log('🏠 Homes Check:', {
      homesCount: homes?.length || 0,
      homes: homes,
      error: homesError?.message
    });

    // 4. Check home members
    const { data: memberships, error: membershipsError } = await supabase
      .from('home_members')
      .select(`
        *,
        homes(*)
      `)
      .eq('user_id', session.user.id);

    console.log('👥 Memberships Check:', {
      membershipsCount: memberships?.length || 0,
      memberships: memberships,
      error: membershipsError?.message
    });

    // 5. Check expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .limit(5);

    console.log('💰 Expenses Check:', {
      expensesCount: expenses?.length || 0,
      expenses: expenses,
      error: expensesError?.message
    });

    // 6. Test RLS policies
    console.log('🔒 Testing RLS Policies...');
    
    // Test profiles table access
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('id, name')
      .limit(1);
    
    console.log('📊 All Profiles Access:', {
      canAccess: !allProfilesError,
      error: allProfilesError?.message
    });

  } catch (error) {
    console.error('💥 Debug Error:', error);
  }
};

// Function to create a profile for existing users
export const createProfileForUser = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user?.id) {
      console.log('❌ No authenticated user');
      return;
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (existingProfile) {
      console.log('✅ Profile already exists');
      return;
    }

    // Create profile
    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          username: session.user.user_metadata?.username || null,
          email: session.user.email,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create profile:', error);
    } else {
      console.log('✅ Profile created successfully:', newProfile);
    }
  } catch (error) {
    console.error('💥 Create profile error:', error);
  }
}; 

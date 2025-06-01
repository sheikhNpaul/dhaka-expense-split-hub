import { supabase } from '@/integrations/supabase/client';

export async function isEmailInUse(email: string): Promise<boolean> {
  try {
    // Check in auth.users table using Supabase's built-in function
    const { data, error } = await supabase.rpc('check_if_email_exists', {
      email_to_check: email
    });
    
    if (error) {
      console.error('Error checking email:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
} 
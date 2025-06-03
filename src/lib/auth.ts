import { supabase } from '@/integrations/supabase/client';

export async function isEmailInUse(email: string): Promise<boolean> {
  try {
    // Check in profiles table for existing email
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking email:', error);
      throw new Error('Unable to verify email availability');
    }

    return data !== null;
  } catch (error) {
    console.error('Error checking email:', error);
    throw error; // Propagate error to be handled by the caller
  }
}

// Helper function to validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate password strength
export function isValidPassword(password: string): boolean {
  // Minimum 6 characters
  if (password.length < 6) return false;
  
  // At least one number
  if (!/\d/.test(password)) return false;
  
  // At least one letter
  if (!/[a-zA-Z]/.test(password)) return false;
  
  return true;
}

// Helper function to validate username format
export function isValidUsername(username: string): boolean {
  // Only allow letters, numbers, and underscores
  // Must be between 3 and 20 characters
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
} 
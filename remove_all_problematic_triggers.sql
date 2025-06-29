-- Remove all problematic triggers that are causing the "updated_at" field error
-- This will clean up any triggers that reference non-existent fields

-- Drop the trigger that's causing the "updated_at" field error
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;

-- Drop the other problematic trigger we created earlier
DROP TRIGGER IF EXISTS prevent_unread_on_read_notifications ON notifications;

-- Drop the function we created
DROP FUNCTION IF EXISTS check_notification_read_status();

-- Verify all triggers are removed
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'notifications';

-- Expected result should be empty (no triggers) 
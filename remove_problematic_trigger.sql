-- Remove the problematic trigger that's causing the "updated_at" field error
-- This trigger is interfering with the notification read status updates

-- Drop the trigger that's causing issues
DROP TRIGGER IF EXISTS prevent_unread_on_read_notifications ON notifications;

-- Drop the function as well
DROP FUNCTION IF EXISTS check_notification_read_status();

-- Verify the trigger is removed
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'notifications'; 
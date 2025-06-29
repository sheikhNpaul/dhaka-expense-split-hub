-- Fixed constraint to prevent read notifications from being marked as unread
-- This version is simpler and more reliable

-- First, let's create a function to check if we're trying to mark a read notification as unread
CREATE OR REPLACE FUNCTION check_notification_read_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If the notification is currently read and we're trying to set it to unread, prevent it
    IF OLD.read = true AND NEW.read = false THEN
        RAISE EXCEPTION 'Cannot mark a read notification as unread';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS prevent_unread_on_read_notifications ON notifications;

-- Create the trigger to enforce this constraint
CREATE TRIGGER prevent_unread_on_read_notifications
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION check_notification_read_status();

-- Add a comment to document this constraint
COMMENT ON FUNCTION check_notification_read_status() IS 'Prevents read notifications from being marked as unread';

-- Let's also add an index to improve performance on read status queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- Test the constraint (optional - uncomment to test)
-- UPDATE notifications SET read = false WHERE read = true LIMIT 1; 
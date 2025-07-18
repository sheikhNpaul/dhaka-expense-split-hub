import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'expense' | 'payment' | 'system';
  read: boolean;
  created_at: string;
}

export const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Add a test notification if none exist
      addTestNotification();
    }
  }, [user]);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Only refresh on new notifications, not updates
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        // Fallback to sample data if database query fails
        setSampleNotifications();
        return;
      }
      
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setSampleNotifications();
    } finally {
      setLoading(false);
    }
  };

  const setSampleNotifications = () => {
    const sampleNotifications: Notification[] = [
      {
        id: '1',
        title: 'Database Test',
        message: 'This is a fallback notification - database might not be ready yet',
        type: 'system',
        read: false,
        created_at: new Date().toISOString(),
      },
    ];
    setNotifications(sampleNotifications);
  };

  const addTestNotification = async () => {
    if (!user) return;
    
    try {
      // Check if we already have notifications
      const { data: existingNotifications } = await (supabase as any)
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      // Only add test notification if none exist
      if (!existingNotifications || existingNotifications.length === 0) {
        const { error } = await (supabase as any)
          .from('notifications')
          .insert({
            user_id: user.id,
            title: 'Welcome! 🎉',
            message: 'Your notification system is now working! This is a test notification.',
            type: 'system',
            read: false,
          });

        if (error) {
          console.error('Error adding test notification:', error);
        } else {
          // Refresh notifications after adding test one
          fetchNotifications();
        }
      }
    } catch (error) {
      console.error('Error adding test notification:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    // Prevent multiple calls on the same notification
    if (markingAsRead === notificationId) {
      return;
    }

    try {
      setMarkingAsRead(notificationId);
      
      // Check if notification is already read to prevent unnecessary updates
      const notification = notifications.find(n => n.id === notificationId);
      if (notification?.read) {
        return;
      }
      
      // First, update local state immediately for better UX
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );

      // Simplified update without the problematic constraint
      const { data, error } = await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id) // Add user_id check for security
        .select();

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }
      
      // Only refresh if the database update was successful
      if (data && data.length > 0) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setMarkingAsRead(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Update local state immediately for better UX
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );

      const { data, error } = await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false)
        .select();

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }
      
      // Refresh notifications to get updated data from database
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'expense':
        return '💰';
      case 'payment':
        return '💳';
      case 'system':
        return '🔔';
      default:
        return '📢';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative touch-target ${
            isMobile 
              ? 'h-10 w-10 rounded-lg' 
              : 'h-9 w-9 sm:h-10 sm:w-10 rounded-full'
          } hover:scale-105 transition-transform`}
        >
          <Bell className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={`absolute -top-1 -right-1 rounded-full p-0 flex items-center justify-center text-xs font-bold ${
                isMobile ? 'h-6 w-6' : 'h-5 w-5'
              }`}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={`p-0 ${isMobile ? 'w-[calc(100vw-2rem)] max-w-sm' : 'w-80'}`} 
        align={isMobile ? "center" : "end"}
        side={isMobile ? "bottom" : "bottom"}
        sideOffset={isMobile ? 8 : 4}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold text-sm sm:text-base">Notifications</h4>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-muted-foreground hover:text-foreground touch-target"
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className={`${isMobile ? 'h-96' : 'h-80'}`}>
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors touch-target ${
                    notification.read 
                      ? 'bg-muted/50 hover:bg-muted' 
                      : 'bg-primary/10 hover:bg-primary/20'
                  } ${markingAsRead === notification.id ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (markingAsRead !== notification.id && !notification.read) {
                      markAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className={`font-medium text-sm ${!notification.read ? 'text-foreground' : 'text-muted-foreground'} truncate`}>
                          {notification.title}
                        </h5>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${!notification.read ? 'text-foreground' : 'text-muted-foreground'} line-clamp-2`}>
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}; 
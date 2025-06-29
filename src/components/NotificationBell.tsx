import { useState, useEffect } from 'react';
import { Bell, X, Check, Trash2 } from 'lucide-react';
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
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
}

export const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await (supabase as any)
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    // Optimistically update UI
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Update database
    const { error } = await (supabase as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error marking notification as read:', error);
      // Revert optimistic update on error
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;

    // Optimistically update UI
    setNotifications(prev => 
      prev.map(n => ({ ...n, is_read: true }))
    );
    setUnreadCount(0);

    // Update database
    const { error } = await (supabase as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      // Revert optimistic update on error
      fetchNotifications();
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return;

    // Optimistically update UI
    const notification = notifications.find(n => n.id === notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (notification && !notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Update database
    const { error } = await (supabase as any)
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting notification:', error);
      // Revert optimistic update on error
      fetchNotifications();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'expense_added':
        return '💰';
      case 'payment_request':
        return '💳';
      case 'payment_received':
        return '✅';
      case 'meal_planned':
        return '🍽️';
      case 'balance_updated':
        return '⚖️';
      default:
        return '🔔';
    }
  };

  const NotificationContent = () => (
    <div className="w-full">
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-border ${
        isMobile ? 'p-4' : 'p-3'
      }`}>
        <h3 className={`font-semibold ${
          isMobile ? 'text-lg' : 'text-base'
        }`}>
          Notifications
        </h3>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className={`text-muted-foreground hover:text-foreground ${
                isMobile ? 'h-10 px-3 text-sm' : 'h-8 px-2 text-xs'
              }`}
            >
              Mark all read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className={`h-8 w-8 p-0 ${
              isMobile ? 'h-10 w-10' : 'h-8 w-8'
            }`}
          >
            <X className={`${
              isMobile ? 'h-5 w-5' : 'h-4 w-4'
            }`} />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className={`${
        isMobile ? 'h-96' : 'h-80'
      }`}>
        {notifications.length === 0 ? (
          <div className={`flex flex-col items-center justify-center text-center ${
            isMobile ? 'p-8' : 'p-6'
          }`}>
            <div className={`rounded-full bg-muted flex items-center justify-center mb-4 ${
              isMobile ? 'h-16 w-16' : 'h-12 w-12'
            }`}>
              <Bell className={`text-muted-foreground ${
                isMobile ? 'h-8 w-8' : 'h-6 w-6'
              }`} />
            </div>
            <h4 className={`font-medium mb-2 ${
              isMobile ? 'text-lg' : 'text-base'
            }`}>
              No notifications
            </h4>
            <p className={`text-muted-foreground ${
              isMobile ? 'text-base' : 'text-sm'
            }`}>
              You're all caught up!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`group relative border-b border-border last:border-b-0 ${
                  !notification.is_read ? 'bg-muted/50' : ''
                }`}
              >
                <div className={`flex items-start space-x-3 ${
                  isMobile ? 'p-4' : 'p-3'
                }`}>
                  <div className={`flex-shrink-0 text-2xl ${
                    isMobile ? 'text-3xl' : 'text-2xl'
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${
                          isMobile ? 'text-base' : 'text-sm'
                        } ${
                          !notification.is_read ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {notification.title}
                        </p>
                        <p className={`text-muted-foreground mt-1 ${
                          isMobile ? 'text-sm' : 'text-xs'
                        }`}>
                          {notification.message}
                        </p>
                        <p className={`text-muted-foreground mt-2 ${
                          isMobile ? 'text-xs' : 'text-xs'
                        }`}>
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className={`w-2 h-2 bg-primary rounded-full flex-shrink-0 ${
                          isMobile ? 'mt-2' : 'mt-1'
                        }`} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className={`absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 ${
                  isMobile ? 'opacity-100' : ''
                }`}>
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className={`h-8 w-8 p-0 ${
                        isMobile ? 'h-10 w-10' : 'h-8 w-8'
                      }`}
                    >
                      <Check className={`${
                        isMobile ? 'h-4 w-4' : 'h-3 w-3'
                      }`} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNotification(notification.id)}
                    className={`h-8 w-8 p-0 text-destructive hover:text-destructive ${
                      isMobile ? 'h-10 w-10' : 'h-8 w-8'
                    }`}
                  >
                    <Trash2 className={`${
                      isMobile ? 'h-4 w-4' : 'h-3 w-3'
                    }`} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative ${
            isMobile ? 'h-12 w-12' : 'h-9 w-9'
          }`}
        >
          <Bell className={`${
            isMobile ? 'h-6 w-6' : 'h-4 w-4'
          }`} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={`absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-medium ${
                isMobile ? 'h-6 w-6 text-xs' : 'h-5 w-5 text-xs'
              }`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={`p-0 ${
          isMobile ? 'w-full max-w-sm' : 'w-80'
        }`}
        align="end"
      >
        <NotificationContent />
      </PopoverContent>
    </Popover>
  );
}; 
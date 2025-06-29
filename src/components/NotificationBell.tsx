import { useState, useEffect } from 'react';
import { Bell, Calendar, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'expense' | 'payment' | 'system';
  read: boolean;
  created_at: string;
}

type DateFilter = 'all' | 'today' | 'week' | 'month';

export const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const unreadCount = allNotifications.filter(n => !n.read).length;
  const filteredNotifications = notifications;

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchAllNotifications();
      // Add a test notification if none exist
      addTestNotification();
    }
  }, [user, dateFilter]);

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refresh notifications when there are changes
          fetchNotifications();
          fetchAllNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchAllNotifications = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching all notifications for user:', user.id);
      
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all notifications:', error);
        console.error('Error details:', error.message, error.details, error.hint);
        return;
      }
      
      console.log('Fetched all notifications:', data?.length || 0, 'notifications');
      const unreadCount = data?.filter((n: any) => !n.read).length || 0;
      console.log('Unread count:', unreadCount);
      
      setAllNotifications(data || []);
    } catch (error) {
      console.error('Error fetching all notifications:', error);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('Fetching notifications for user:', user.id, 'with filter:', dateFilter);
      
      let query = (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          default:
            startDate = new Date(0);
        }

        query = query.gte('created_at', startDate.toISOString());
        console.log('Applied date filter:', dateFilter, 'from:', startDate.toISOString());
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        console.error('Error details:', error.message, error.details, error.hint);
        // Fallback to sample data if database query fails
        setSampleNotifications();
        return;
      }
      
      console.log('Fetched notifications:', data?.length || 0, 'notifications');
      console.log('Sample notification:', data?.[0]);
      
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
    try {
      console.log('Marking notification as read:', notificationId);
      console.log('Current user:', user?.id);
      
      // First, update local state immediately for better UX
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setAllNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      
      const { data, error } = await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id) // Add user_id check for security
        .select();

      if (error) {
        console.error('Error marking notification as read:', error);
        console.error('Error details:', error.message, error.details, error.hint);
        return;
      }

      console.log('Successfully marked notification as read:', data);
      
      // Only refresh if the database update was successful
      if (data && data.length > 0) {
        console.log('Refreshing notifications from database...');
        await Promise.all([fetchNotifications(), fetchAllNotifications()]);
      } else {
        console.log('No rows updated, notification might not exist or already be read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('Marking all notifications as read for user:', user?.id);
      
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

      console.log('Successfully marked all notifications as read:', data);
      
      // Refresh both notification lists to get updated data from database
      await Promise.all([fetchNotifications(), fetchAllNotifications()]);
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

  const getFilteredNotifications = () => {
    return filteredNotifications;
  };

  const getFilterLabel = (filter: DateFilter) => {
    switch (filter) {
      case 'all': return 'All';
      case 'today': return 'Today';
      case 'week': return 'Week';
      case 'month': return 'Month';
      default: return 'All';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:scale-105 transition-transform"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>
        
        <Tabs value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)} className="w-full">
          <div className="px-4 pt-2">
            <TabsList className="grid w-full grid-cols-4 h-8">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="today" className="text-xs">Today</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value={dateFilter} className="mt-0">
            <ScrollArea className="h-80">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading notifications...
                </div>
              ) : getFilteredNotifications().length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No notifications in {getFilterLabel(dateFilter).toLowerCase()}
                </div>
              ) : (
                <div className="p-2">
                  {getFilteredNotifications().map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                        notification.read 
                          ? 'bg-muted/50 hover:bg-muted' 
                          : 'bg-primary/10 hover:bg-primary/20'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className={`font-medium text-sm ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.title}
                            </h5>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                          <p className={`text-sm mt-1 ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}; 
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Calendar, ChevronLeft, ChevronRight, Utensils, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

interface MealOrder {
  id: string;
  user_id: string;
  home_id: string;
  date: string;
  meal_count: number;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface MealPlannerProps {
  currentHomeId: string;
  selectedMonth: Date;
  refreshTrigger?: number;
}

export const MealPlanner = ({ currentHomeId, selectedMonth, refreshTrigger }: MealPlannerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(selectedMonth);
  const [mealOrders, setMealOrders] = useState<MealOrder[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (user && currentHomeId) {
      fetchMealOrders();
      fetchProfiles();
    }
  }, [user, currentHomeId, currentMonth, refreshTrigger]);

  const fetchMealOrders = async () => {
    if (!user || !currentHomeId) return;

    try {
      setLoading(true);
      
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const { data, error } = await supabase
        .from('meal_orders')
        .select('*')
        .eq('home_id', currentHomeId)
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      setMealOrders(data || []);
    } catch (error) {
      console.error('Error fetching meal orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch meal orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url');

    if (data) {
      const profileMap = data.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, Profile>);
      setProfiles(profileMap);
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const handleMealCountChange = async (date: Date, newCount: number) => {
    if (!user || !currentHomeId) return;

    const dateString = format(date, 'yyyy-MM-dd');
    const existingOrder = mealOrders.find(order => 
      order.user_id === user.id && order.date === dateString
    );

    setUpdating(dateString);

    try {
      if (existingOrder) {
        if (newCount === 0) {
          // Delete the order if count is 0
          const { error } = await supabase
            .from('meal_orders')
            .delete()
            .eq('id', existingOrder.id);

          if (error) throw error;
        } else {
          // Update existing order
          const { error } = await supabase
            .from('meal_orders')
            .update({ meal_count: newCount, updated_at: new Date().toISOString() })
            .eq('id', existingOrder.id);

          if (error) throw error;
        }
      } else if (newCount > 0) {
        // Create new order
        const { error } = await supabase
          .from('meal_orders')
          .insert({
            user_id: user.id,
            home_id: currentHomeId,
            date: dateString,
            meal_count: newCount,
          });

        if (error) throw error;
      }

      // Refresh meal orders
      fetchMealOrders();
    } catch (error: any) {
      console.error('Error updating meal order:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const getMealCountForDate = (date: Date, userId: string) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const order = mealOrders.find(order => 
      order.user_id === userId && order.date === dateString
    );
    return order?.meal_count || 0;
  };

  const getTotalMealsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return mealOrders
      .filter(order => order.date === dateString)
      .reduce((total, order) => total + order.meal_count, 0);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const calendarDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const homeMembers = Object.values(profiles).filter(profile => 
    mealOrders.some(order => order.user_id === profile.id)
  );

  return (
    <Card className="border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur shadow-xl">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Meal Planner
            </CardTitle>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleMonthChange('prev')}
                className="h-10 w-10 sm:h-8 sm:w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm sm:text-base font-medium">{format(currentMonth, 'MMMM yyyy')}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleMonthChange('next')}
                className="h-10 w-10 sm:h-8 sm:w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground">
            {homeMembers.length} member{homeMembers.length !== 1 ? 's' : ''} planning meals
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading meal planner...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map(day => {
                const totalMeals = getTotalMealsForDate(day);
                const userMeals = getMealCountForDate(day, user?.id || '');
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentMonth);
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      min-h-[80px] sm:min-h-[100px] p-2 border rounded-lg relative
                      ${isToday ? 'ring-2 ring-primary bg-primary/5' : 'bg-muted/30'}
                      ${!isCurrentMonth ? 'opacity-50' : ''}
                      ${updating === format(day, 'yyyy-MM-dd') ? 'animate-pulse' : ''}
                    `}
                  >
                    <div className="text-xs sm:text-sm font-medium mb-1">
                      {format(day, 'd')}
                    </div>
                    
                    {/* Total meals for the day */}
                    {totalMeals > 0 && (
                      <div className="flex items-center gap-1 mb-2">
                        <Utensils className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium text-primary">{totalMeals}</span>
                      </div>
                    )}
                    
                    {/* User's meal count */}
                    {userMeals > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        You: {userMeals}
                      </Badge>
                    )}
                    
                    {/* Meal count controls */}
                    <div className="flex flex-col gap-1 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMealCountChange(day, userMeals + 1)}
                        disabled={updating === format(day, 'yyyy-MM-dd')}
                        className="h-6 text-xs"
                      >
                        +
                      </Button>
                      {userMeals > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMealCountChange(day, userMeals - 1)}
                          disabled={updating === format(day, 'yyyy-MM-dd')}
                          className="h-6 text-xs"
                        >
                          -
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Member Summary */}
            {homeMembers.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Member Meal Summary
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {homeMembers.map(member => {
                    const memberOrders = mealOrders.filter(order => order.user_id === member.id);
                    const totalMeals = memberOrders.reduce((sum, order) => sum + order.meal_count, 0);
                    const averageMeals = memberOrders.length > 0 ? (totalMeals / memberOrders.length).toFixed(1) : '0';
                    
                    return (
                      <Card key={member.id} className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{member.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Total: {totalMeals}</span>
                              <span>Avg: {averageMeals}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">How to use:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Click + to add a meal for a specific day</li>
                <li>• Click - to remove a meal</li>
                <li>• The total meals for each day are shown with the utensils icon</li>
                <li>• Your meal count is shown with a badge</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 

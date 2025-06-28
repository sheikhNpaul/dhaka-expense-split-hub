import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Calendar, ChevronLeft, ChevronRight, Utensils, Users, Plus, Minus, CalendarDays, TrendingUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, isSameWeek } from 'date-fns';

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'summary'>('calendar');
  const calendarRef = useRef<HTMLDivElement>(null);

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
          const { error } = await supabase
            .from('meal_orders')
            .delete()
            .eq('id', existingOrder.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('meal_orders')
            .update({ meal_count: newCount, updated_at: new Date().toISOString() })
            .eq('id', existingOrder.id);

          if (error) throw error;
        }
      } else if (newCount > 0) {
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

  const selectedDateMeals = selectedDate ? getMealCountForDate(selectedDate, user?.id || '') : 0;
  const selectedDateTotal = selectedDate ? getTotalMealsForDate(selectedDate) : 0;

  return (
    <Card className="border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
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
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="h-9 px-3"
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Calendar
            </Button>
            <Button
              variant={viewMode === 'summary' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('summary')}
              className="h-9 px-3"
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Summary
            </Button>
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
        ) : viewMode === 'calendar' ? (
          <div className="space-y-6">
            {/* Selected Date Controls */}
            {selectedDate && (
              <Card className="border-0 bg-gradient-to-br from-background to-background/80 backdrop-blur shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {format(selectedDate, 'EEEE, MMMM d')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedDateTotal} total meals planned
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDate(null)}
                      className="h-8 w-8 p-0"
                    >
                      ×
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Your meals</p>
                        <p className="text-2xl font-bold text-primary">{selectedDateMeals}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">{selectedDateTotal}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMealCountChange(selectedDate, selectedDateMeals - 1)}
                        disabled={selectedDateMeals === 0 || updating === format(selectedDate, 'yyyy-MM-dd')}
                        className="h-10 w-10 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleMealCountChange(selectedDate, selectedDateMeals + 1)}
                        disabled={updating === format(selectedDate, 'yyyy-MM-dd')}
                        className="h-10 w-10 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map(day => {
                const totalMeals = getTotalMealsForDate(day);
                const userMeals = getMealCountForDate(day, user?.id || '');
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    disabled={!isCurrentMonth}
                    className={`
                      aspect-square p-2 rounded-lg border-2 transition-all duration-200
                      ${isSelected 
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20' 
                        : 'border-transparent hover:border-primary/30 hover:bg-primary/5'
                      }
                      ${isToday(day) ? 'ring-2 ring-primary/50' : ''}
                      ${!isCurrentMonth ? 'opacity-30' : ''}
                      ${updating === format(day, 'yyyy-MM-dd') ? 'animate-pulse' : ''}
                      focus:outline-none focus:ring-2 focus:ring-primary/50
                    `}
                  >
                    <div className="text-sm font-medium mb-1">
                      {format(day, 'd')}
                    </div>
                    
                    {totalMeals > 0 && (
                      <div className="flex items-center justify-center">
                        <Badge variant="secondary" className="text-xs px-1 py-0.5">
                          {totalMeals}
                        </Badge>
                      </div>
                    )}
                    
                    {userMeals > 0 && (
                      <div className="flex items-center justify-center mt-1">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Summary View */
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-0 bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur shadow-lg">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {mealOrders.filter(order => order.user_id === user?.id).reduce((sum, order) => sum + order.meal_count, 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">Your meals</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur shadow-lg">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {mealOrders.reduce((sum, order) => sum + order.meal_count, 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total meals</p>
                </CardContent>
              </Card>
            </div>

            {/* Member Summary */}
            {homeMembers.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Member Summary
                </h3>
                <div className="space-y-4">
                  {homeMembers.map(member => {
                    const memberOrders = mealOrders.filter(order => order.user_id === member.id);
                    const totalMeals = memberOrders.reduce((sum, order) => sum + order.meal_count, 0);
                    const averageMeals = memberOrders.length > 0 ? (totalMeals / memberOrders.length).toFixed(1) : '0';
                    
                    return (
                      <Card key={member.id} className="border-0 bg-gradient-to-br from-background to-background/80 backdrop-blur shadow-lg">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={member.avatar_url} />
                              <AvatarFallback className="text-sm">
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{member.name}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Utensils className="h-3 w-3" />
                                  {totalMeals} meals
                                </span>
                                <span>Avg: {averageMeals}/day</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 

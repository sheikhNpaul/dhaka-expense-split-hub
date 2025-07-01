import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow, startOfMonth, endOfMonth, format } from 'date-fns';
import { Edit, MessageCircle, Clock, Users, Calendar } from 'lucide-react';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import LocalDiningIcon from '@mui/icons-material/LocalDining';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import FlightIcon from '@mui/icons-material/Flight';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HomeIcon from '@mui/icons-material/Home';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import BookIcon from '@mui/icons-material/Book';
import ComputerIcon from '@mui/icons-material/Computer';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import CelebrationIcon from '@mui/icons-material/Celebration';
import MovieIcon from '@mui/icons-material/Movie';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import PetsIcon from '@mui/icons-material/Pets';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';

interface Expense {
  id: string;
  title: string;
  amount: number;
  description: string;
  split_type: string;
  participants: string[];
  created_at: string;
  payer_id: string;
  home_id: string;
  category_id?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface ExpenseListProps {
  refreshTrigger?: number;
  onEditExpense: (expense: Expense) => void;
  onViewComments: (expenseId: string) => void;
  currentHomeId: string;
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
}

const ICON_OPTIONS = [
  { name: 'Food', value: 'Fastfood', icon: FastfoodIcon },
  { name: 'Dining', value: 'LocalDining', icon: LocalDiningIcon },
  { name: 'Groceries', value: 'LocalGroceryStore', icon: LocalGroceryStoreIcon },
  { name: 'Transport', value: 'DirectionsCar', icon: DirectionsCarIcon },
  { name: 'Travel', value: 'Flight', icon: FlightIcon },
  { name: 'Shopping', value: 'ShoppingCart', icon: ShoppingCartIcon },
  { name: 'Home', value: 'Home', icon: HomeIcon },
  { name: 'Utilities', value: 'Lightbulb', icon: LightbulbIcon },
  { name: 'Health', value: 'LocalHospital', icon: LocalHospitalIcon },
  { name: 'Vacation', value: 'BeachAccess', icon: BeachAccessIcon },
  { name: 'Bills', value: 'Receipt', icon: ReceiptIcon },
  { name: 'Salary', value: 'AttachMoney', icon: AttachMoneyIcon },
  { name: 'Games', value: 'SportsEsports', icon: SportsEsportsIcon },
  { name: 'Books', value: 'Book', icon: BookIcon },
  { name: 'Tech', value: 'Computer', icon: ComputerIcon },
  { name: 'Mall', value: 'LocalMall', icon: LocalMallIcon },
  { name: 'Party', value: 'Celebration', icon: CelebrationIcon },
  { name: 'Movies', value: 'Movie', icon: MovieIcon },
  { name: 'Bar', value: 'LocalBar', icon: LocalBarIcon },
  { name: 'Cafe', value: 'LocalCafe', icon: LocalCafeIcon },
  { name: 'Pets', value: 'Pets', icon: PetsIcon },
  { name: 'Kids', value: 'ChildCare', icon: ChildCareIcon },
  { name: 'Fitness', value: 'FitnessCenter', icon: FitnessCenterIcon },
];

export const ExpenseList = ({ refreshTrigger, onEditExpense, onViewComments, currentHomeId, selectedMonth }: ExpenseListProps) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [loading, setLoading] = useState(true);
  const [monthlyTotal, setMonthlyTotal] = useState(0);

  // Filter: Only show expenses where user is payer or participant
  const visibleExpenses = expenses.filter(
    (expense) =>
      expense.payer_id === user?.id ||
      expense.participants.includes(user?.id)
  );

  useEffect(() => {
    if (user && currentHomeId) {
      fetchExpenses();
      fetchProfiles();
      fetchCategories();
    }
  }, [user, refreshTrigger, currentHomeId, selectedMonth]);

  // Calculate monthly total for visible expenses only
  useEffect(() => {
    setMonthlyTotal(visibleExpenses.reduce((sum, expense) => sum + expense.amount, 0));
  }, [visibleExpenses]);

  const fetchExpenses = async () => {
    if (!user || !currentHomeId) return;

    try {
      setLoading(true);
      
      // Get the start and end of the selected month
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('home_id', currentHomeId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setExpenses(data);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
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

  const fetchCategories = async () => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from('categories')
      .select('id, name, icon')
      .eq('user_id', user.id);
    if (!error && data) {
      const categoryMap = data.reduce((acc, category) => {
        acc[category.id] = category;
        return acc;
      }, {} as Record<string, Category>);
      setCategories(categoryMap);
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories[categoryId];
    if (!category) return FastfoodIcon;
    
    const iconOption = ICON_OPTIONS.find(opt => opt.value === category.icon);
    return iconOption?.icon || FastfoodIcon;
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories[categoryId];
    return category?.name || 'Uncategorized';
  };

  const getSplitTypeLabel = (participantCount: number) => {
    switch (participantCount) {
      case 1:
        return 'Personal';
      case 2:
        return '2 participants';
      case 3:
        return '3 participants';
      default:
        return `${participantCount} participants`;
    }
  };

  const getSplitTypeColor = (participantCount: number) => {
    switch (participantCount) {
      case 1:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/20 dark:text-purple-400';
      case 2:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400';
    }
  };

  const getAmountPerPerson = (amount: number, participantCount: number) => {
    return (amount / participantCount).toFixed(2);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Monthly total */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30 rounded-lg p-4">
        <div className="text-center sm:text-left">
          <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Monthly Total: ৳{monthlyTotal.toFixed(2)}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {format(selectedMonth, 'MMMM yyyy')}
          </p>
        </div>
      </div>

      {/* Expenses list */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading expenses...</p>
          </div>
        </div>
      ) : visibleExpenses.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base sm:text-lg font-medium mb-2">No expenses for {format(selectedMonth, 'MMMM yyyy')}</h3>
          <p className="text-muted-foreground mb-4">Add some expenses to start tracking</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {visibleExpenses.map((expense) => (
            <Card key={expense.id} className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-r from-card to-card/80 backdrop-blur">
              <CardContent className="p-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg truncate">{expense.title}</h3>
                    {expense.description && (
                      <p className="text-muted-foreground text-xs sm:text-sm mt-1 line-clamp-2">{expense.description}</p>
                    )}
                  </div>
                  <div className="text-right sm:text-right shrink-0">
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      ৳{expense.amount.toFixed(2)}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      ৳{getAmountPerPerson(expense.amount, expense.participants.length)} per person
                    </p>
                  </div>
                </div>
                
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {expense.category_id && (
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                      {(() => {
                        const Icon = getCategoryIcon(expense.category_id);
                        return <Icon style={{ fontSize: 12 }} />;
                      })()}
                      {getCategoryName(expense.category_id)}
                    </Badge>
                  )}
                  <Badge className={`${getSplitTypeColor(expense.participants.length)} text-xs`}>
                    {getSplitTypeLabel(expense.participants.length)}
                  </Badge>
                </div>

                {/* Payer and Time */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>Paid by:</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={profiles[expense.payer_id]?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {profiles[expense.payer_id]?.name ? getInitials(profiles[expense.payer_id].name) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {profiles[expense.payer_id]?.name || profiles[expense.payer_id]?.email || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(expense.created_at).toLocaleString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                      timeZone: 'Asia/Dhaka',
                      timeZoneName: 'short'
                    })}
                  </div>
                </div>

                {/* Participants */}
                <div className="mb-4">
                  <span className="text-xs sm:text-sm text-muted-foreground mb-2 block">Participants:</span>
                  <div className="flex flex-wrap gap-2">
                    {expense.participants.map((participantId) => (
                      <div key={participantId} className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={profiles[participantId]?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {profiles[participantId]?.name ? getInitials(profiles[participantId].name) : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs sm:text-sm font-medium">
                          {profiles[participantId]?.name || profiles[participantId]?.email || 'Unknown'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {expense.payer_id === user?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditExpense(expense)}
                      className="flex items-center justify-center gap-1 hover:bg-primary hover:text-primary-foreground transition-colors h-10 sm:h-9"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewComments(expense.id)}
                    className="flex items-center justify-center gap-1 hover:bg-secondary transition-colors h-10 sm:h-9"
                  >
                    <MessageCircle className="h-3 w-3" />
                    Comments
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

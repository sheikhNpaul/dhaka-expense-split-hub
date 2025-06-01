import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Edit, MessageCircle, User, Clock, Users } from 'lucide-react';

interface Expense {
  id: string;
  title: string;
  amount: number;
  description: string;
  split_type: string;
  participants: string[];
  created_at: string;
  payer_id: string;
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
}

export const ExpenseList = ({ refreshTrigger, onEditExpense, onViewComments }: ExpenseListProps) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchProfiles();
    }
  }, [user, refreshTrigger]);

  // Real-time subscription for new expenses
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses'
        },
        () => {
          fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchExpenses = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setExpenses(data);
    }
    setLoading(false);
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

  const getSplitTypeLabel = (splitType: string) => {
    switch (splitType) {
      case 'all_three':
        return 'All 3 roommates';
      case 'two_people':
        return '2 people';
      case 'one_person':
        return 'Personal';
      default:
        return splitType;
    }
  };

  const getSplitTypeColor = (splitType: string) => {
    switch (splitType) {
      case 'all_three':
        return 'bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400';
      case 'two_people':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400';
      case 'one_person':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-950/20 dark:text-gray-400';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading expenses...</p>
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No expenses yet</h3>
        <p className="text-muted-foreground mb-4">Start tracking expenses with your roommates</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {expenses.map((expense) => (
        <Card key={expense.id} className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-r from-card to-card/80 backdrop-blur">
          <CardContent className="p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{expense.title}</h3>
                {expense.description && (
                  <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{expense.description}</p>
                )}
              </div>
              <div className="text-right sm:text-right shrink-0">
                <p className="text-2xl font-bold text-green-600">
                  ৳{expense.amount.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  ৳{getAmountPerPerson(expense.amount, expense.participants.length)} per person
                </p>
              </div>
            </div>
            
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className={getSplitTypeColor(expense.split_type)}>
                {getSplitTypeLabel(expense.split_type)}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {expense.participants.length} participant{expense.participants.length > 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Payer and Time */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 text-sm text-muted-foreground">
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
                {formatDistanceToNow(new Date(expense.created_at), { addSuffix: true })}
              </div>
            </div>

            {/* Participants */}
            <div className="mb-4">
              <span className="text-sm text-muted-foreground mb-2 block">Participants:</span>
              <div className="flex flex-wrap gap-2">
                {expense.participants.map((participantId) => (
                  <div key={participantId} className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={profiles[participantId]?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {profiles[participantId]?.name ? getInitials(profiles[participantId].name) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {profiles[participantId]?.name || profiles[participantId]?.email || 'Unknown'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {expense.payer_id === user?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditExpense(expense)}
                  className="flex items-center gap-1 hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewComments(expense.id)}
                className="flex items-center gap-1 hover:bg-secondary transition-colors"
              >
                <MessageCircle className="h-3 w-3" />
                Comments
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

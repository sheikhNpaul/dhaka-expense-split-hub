import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Edit, MessageCircle } from 'lucide-react';

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

interface ExpenseListProps {
  refreshTrigger?: number;
  onEditExpense: (expense: Expense) => void;
  onViewComments: (expenseId: string) => void;
}

export const ExpenseList = ({ refreshTrigger, onEditExpense, onViewComments }: ExpenseListProps) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
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
      .select('id, name, email');

    if (data) {
      const profileMap = data.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
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
        return 'bg-green-100 text-green-800';
      case 'two_people':
        return 'bg-blue-100 text-blue-800';
      case 'one_person':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAmountPerPerson = (amount: number, participantCount: number) => {
    return (amount / participantCount).toFixed(2);
  };

  if (loading) {
    return <div>Loading expenses...</div>;
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No expenses recorded yet. Add your first expense to get started!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {expenses.map((expense) => (
        <Card key={expense.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{expense.title}</h3>
                {expense.description && (
                  <p className="text-gray-600 text-sm">{expense.description}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  ৳{expense.amount.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">
                  ৳{getAmountPerPerson(expense.amount, expense.participants.length)} per person
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge className={getSplitTypeColor(expense.split_type)}>
                {getSplitTypeLabel(expense.split_type)}
              </Badge>
              <Badge variant="outline">
                {expense.participants.length} participant{expense.participants.length > 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
              <div>
                Paid by: <span className="font-medium">
                  {profiles[expense.payer_id]?.name || profiles[expense.payer_id]?.email || 'Unknown'}
                </span>
              </div>
              <div>
                {formatDistanceToNow(new Date(expense.created_at), { addSuffix: true })}
              </div>
            </div>

            <div className="mb-3 text-sm">
              <span className="text-gray-600">Participants: </span>
              {expense.participants.map((participantId, index) => (
                <span key={participantId} className="font-medium">
                  {profiles[participantId]?.name || profiles[participantId]?.email || 'Unknown'}
                  {index < expense.participants.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              {expense.payer_id === user?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditExpense(expense)}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewComments(expense.id)}
                className="flex items-center gap-1"
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


import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Balance {
  userId: string;
  userName: string;
  owes: { [key: string]: number };
  isOwed: { [key: string]: number };
  netBalance: number;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  payer_id: string;
  participants: string[];
  split_type: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
}

export const BalanceDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBalances();
      
      // Set up real-time subscription for expenses changes
      const channel = supabase
        .channel('balance-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'expenses'
          },
          () => {
            console.log('Expense changed, recalculating balances...');
            fetchBalances();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchBalances = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch all expenses and profiles in parallel
      const [expensesResult, profilesResult] = await Promise.all([
        supabase.from('expenses').select('*'),
        supabase.from('profiles').select('id, name, email')
      ]);

      if (expensesResult.error) {
        console.error('Error fetching expenses:', expensesResult.error);
        toast({
          title: "Error",
          description: "Failed to fetch expenses",
          variant: "destructive",
        });
        return;
      }

      if (profilesResult.error) {
        console.error('Error fetching profiles:', profilesResult.error);
        toast({
          title: "Error",
          description: "Failed to fetch user profiles",
          variant: "destructive",
        });
        return;
      }

      const expenses = expensesResult.data as Expense[];
      const profilesData = profilesResult.data as Profile[];
      
      // Create profiles map
      const profileMap = profilesData.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, Profile>);
      setProfiles(profileMap);

      // Calculate balances
      const userBalances: Record<string, Balance> = {};

      // Initialize all users who have participated in expenses
      const allUserIds = new Set<string>();
      expenses.forEach(expense => {
        allUserIds.add(expense.payer_id);
        expense.participants.forEach(participantId => allUserIds.add(participantId));
      });

      // Initialize balance objects for all users
      allUserIds.forEach(userId => {
        const profile = profileMap[userId];
        userBalances[userId] = {
          userId,
          userName: profile?.name || profile?.email || 'Unknown User',
          owes: {},
          isOwed: {},
          netBalance: 0
        };
      });

      // Process each expense to calculate who owes whom
      expenses.forEach(expense => {
        const { payer_id, participants, amount } = expense;
        const splitAmount = amount / participants.length;

        participants.forEach(participantId => {
          if (participantId !== payer_id) {
            // This participant owes the payer
            if (!userBalances[participantId].owes[payer_id]) {
              userBalances[participantId].owes[payer_id] = 0;
            }
            userBalances[participantId].owes[payer_id] += splitAmount;

            // The payer is owed by this participant
            if (!userBalances[payer_id].isOwed[participantId]) {
              userBalances[payer_id].isOwed[participantId] = 0;
            }
            userBalances[payer_id].isOwed[participantId] += splitAmount;
          }
        });
      });

      // Calculate net balances and simplify debts
      Object.values(userBalances).forEach(balance => {
        const totalOwed = Object.values(balance.isOwed).reduce((sum, amount) => sum + amount, 0);
        const totalOwes = Object.values(balance.owes).reduce((sum, amount) => sum + amount, 0);
        balance.netBalance = totalOwed - totalOwes;
      });

      // Simplify mutual debts (if A owes B $10 and B owes A $6, then A owes B $4)
      Object.keys(userBalances).forEach(userId1 => {
        Object.keys(userBalances).forEach(userId2 => {
          if (userId1 !== userId2) {
            const user1OwesUser2 = userBalances[userId1].owes[userId2] || 0;
            const user2OwesUser1 = userBalances[userId2].owes[userId1] || 0;
            
            if (user1OwesUser2 > 0 && user2OwesUser1 > 0) {
              const netDebt = user1OwesUser2 - user2OwesUser1;
              
              if (netDebt > 0) {
                // User1 still owes User2
                userBalances[userId1].owes[userId2] = netDebt;
                delete userBalances[userId2].owes[userId1];
                userBalances[userId2].isOwed[userId1] = netDebt;
                delete userBalances[userId1].isOwed[userId2];
              } else if (netDebt < 0) {
                // User2 owes User1
                userBalances[userId2].owes[userId1] = Math.abs(netDebt);
                delete userBalances[userId1].owes[userId2];
                userBalances[userId1].isOwed[userId2] = Math.abs(netDebt);
                delete userBalances[userId2].isOwed[userId1];
              } else {
                // They're even
                delete userBalances[userId1].owes[userId2];
                delete userBalances[userId2].owes[userId1];
                delete userBalances[userId1].isOwed[userId2];
                delete userBalances[userId2].isOwed[userId1];
              }
            }
          }
        });
      });

      // Recalculate net balances after simplification
      Object.values(userBalances).forEach(balance => {
        const totalOwed = Object.values(balance.isOwed).reduce((sum, amount) => sum + amount, 0);
        const totalOwes = Object.values(balance.owes).reduce((sum, amount) => sum + amount, 0);
        balance.netBalance = totalOwed - totalOwes;
      });

      setBalances(Object.values(userBalances));
    } catch (error) {
      console.error('Error in fetchBalances:', error);
      toast({
        title: "Error",
        description: "Failed to calculate balances",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Calculating balances...</p>
        </div>
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No expenses found. Add some expenses to see balance calculations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Balance Summary</h2>
      
      {balances.map(balance => (
        <Card key={balance.userId}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{balance.userName}</span>
              <Badge variant={balance.netBalance >= 0 ? "default" : "destructive"}>
                {balance.netBalance >= 0 ? `+৳${balance.netBalance.toFixed(2)}` : `-৳${Math.abs(balance.netBalance).toFixed(2)}`}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(balance.owes).length > 0 && (
              <div className="mb-3">
                <h4 className="font-medium text-red-600 mb-2">Owes:</h4>
                {Object.entries(balance.owes).map(([userId, amount]) => (
                  <div key={userId} className="flex justify-between text-sm">
                    <span>{profiles[userId]?.name || profiles[userId]?.email || 'Unknown User'}</span>
                    <span className="text-red-600">৳{amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            
            {Object.keys(balance.isOwed).length > 0 && (
              <div>
                <h4 className="font-medium text-green-600 mb-2">Is owed:</h4>
                {Object.entries(balance.isOwed).map(([userId, amount]) => (
                  <div key={userId} className="flex justify-between text-sm">
                    <span>{profiles[userId]?.name || profiles[userId]?.email || 'Unknown User'}</span>
                    <span className="text-green-600">৳{amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            
            {Object.keys(balance.owes).length === 0 && Object.keys(balance.isOwed).length === 0 && (
              <p className="text-gray-500 text-sm">No outstanding balances</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

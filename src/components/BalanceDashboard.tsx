
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Balance {
  userId: string;
  userName: string;
  owes: { [key: string]: number };
  isOwed: { [key: string]: number };
  netBalance: number;
}

export const BalanceDashboard = () => {
  const { user } = useAuth();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBalances();
    }
  }, [user]);

  const fetchBalances = async () => {
    if (!user) return;

    // Fetch all expenses and profiles
    const [expensesResult, profilesResult] = await Promise.all([
      supabase.from('expenses').select('*'),
      supabase.from('profiles').select('id, name, email')
    ]);

    if (!expensesResult.data || !profilesResult.data) return;

    const expenses = expensesResult.data;
    const profilesData = profilesResult.data;
    
    const profileMap = profilesData.reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});
    setProfiles(profileMap);

    // Calculate balances
    const userBalances: Record<string, Balance> = {};

    // Initialize all users
    profilesData.forEach(profile => {
      userBalances[profile.id] = {
        userId: profile.id,
        userName: profile.name || profile.email,
        owes: {},
        isOwed: {},
        netBalance: 0
      };
    });

    // Process each expense
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

    // Calculate net balances
    Object.values(userBalances).forEach(balance => {
      const totalOwed = Object.values(balance.isOwed).reduce((sum, amount) => sum + amount, 0);
      const totalOwes = Object.values(balance.owes).reduce((sum, amount) => sum + amount, 0);
      balance.netBalance = totalOwed - totalOwes;
    });

    setBalances(Object.values(userBalances));
    setLoading(false);
  };

  if (loading) {
    return <div>Calculating balances...</div>;
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
                    <span>{profiles[userId]?.name || profiles[userId]?.email}</span>
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
                    <span>{profiles[userId]?.name || profiles[userId]?.email}</span>
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

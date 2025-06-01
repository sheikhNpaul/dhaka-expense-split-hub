import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  avatar_url?: string;
}

interface PaymentRequest {
  id: string;
  amount: number;
  from_user_id: string;
  to_user_id: string;
  home_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface BalanceDashboardProps {
  currentHomeId: string;
}

export const BalanceDashboard = ({ currentHomeId }: BalanceDashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<{
    toUserId: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    if (user && currentHomeId) {
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
  }, [user, currentHomeId]);

  const fetchBalances = async () => {
    if (!user || !currentHomeId) return;

    try {
      setLoading(true);

      // Fetch expenses for this home and profiles in parallel
      const [expensesResult, profilesResult] = await Promise.all([
        supabase.from('expenses').select('*').eq('home_id', currentHomeId),
        supabase.from('profiles').select('id, name, email, avatar_url')
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
        const participantCount = participants.length;
        
        // Calculate split amount based on number of participants
        const splitAmount = amount / participantCount;

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

      // Simplify mutual debts
      Object.keys(userBalances).forEach(userId1 => {
        Object.keys(userBalances).forEach(userId2 => {
          if (userId1 !== userId2) {
            const user1OwesUser2 = userBalances[userId1].owes[userId2] || 0;
            const user2OwesUser1 = userBalances[userId2].owes[userId1] || 0;
            
            if (user1OwesUser2 > 0 && user2OwesUser1 > 0) {
              const netDebt = user1OwesUser2 - user2OwesUser1;
              
              if (netDebt > 0) {
                userBalances[userId1].owes[userId2] = netDebt;
                delete userBalances[userId2].owes[userId1];
                userBalances[userId2].isOwed[userId1] = netDebt;
                delete userBalances[userId1].isOwed[userId2];
              } else if (netDebt < 0) {
                userBalances[userId2].owes[userId1] = Math.abs(netDebt);
                delete userBalances[userId1].owes[userId2];
                userBalances[userId1].isOwed[userId2] = Math.abs(netDebt);
                delete userBalances[userId2].isOwed[userId1];
              } else {
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRequestPayment = async (toUserId: string, amount: number) => {
    if (!user || !currentHomeId) return;

    try {
      const { error } = await supabase
        .from('payment_requests')
        .insert({
          amount,
          from_user_id: user.id,
          to_user_id: toUserId,
          home_id: currentHomeId,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment request sent successfully",
      });
    } catch (error) {
      console.error('Error sending payment request:', error);
      toast({
        title: "Error",
        description: "Failed to send payment request",
        variant: "destructive",
      });
    }
  };

  const handlePayment = async () => {
    if (!selectedPayment || !user) return;

    try {
      // Create a payment request
      const { error: requestError } = await supabase
        .from('payment_requests')
        .insert({
          amount: selectedPayment.amount,
          from_user_id: user.id,
          to_user_id: selectedPayment.toUserId,
          home_id: currentHomeId,
          status: 'pending'
        });

      if (requestError) throw requestError;

      toast({
        title: "Success",
        description: "Payment request sent successfully",
      });

      setShowPaymentDialog(false);
      setSelectedPayment(null);
      fetchBalances();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to send payment request",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Calculating balances...</p>
        </div>
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <Card className="border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur shadow-xl">
        <CardContent className="text-center p-8">
          <p className="text-muted-foreground">No expenses found for this home. Add some expenses to see balance calculations.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-6">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Balance Summary
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {balances.length} participant{balances.length > 1 ? 's' : ''}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {balances.map(balance => (
              <Card key={balance.userId} className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-background to-background/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                        <AvatarImage src={profiles[balance.userId]?.avatar_url} alt={balance.userName} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                          {balance.userName ? getInitials(balance.userName) : <User className="h-5 w-5" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm md:text-base truncate">{balance.userName}</span>
                    </div>
                    <Badge variant={balance.netBalance >= 0 ? "default" : "destructive"} className="ml-2">
                      {balance.netBalance >= 0 ? `+৳${balance.netBalance.toFixed(2)}` : `-৳${Math.abs(balance.netBalance).toFixed(2)}`}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {Object.keys(balance.owes).length > 0 && (
                    <div className="mb-3">
                      <h4 className="font-medium text-destructive mb-2 text-sm">Owes:</h4>
                      <div className="space-y-1">
                        {Object.entries(balance.owes).map(([userId, amount]) => (
                          <div key={userId} className="flex justify-between text-sm bg-destructive/5 rounded-lg p-2">
                            <span className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={profiles[userId]?.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {profiles[userId]?.name ? getInitials(profiles[userId].name) : '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{profiles[userId]?.name || profiles[userId]?.email || 'Unknown User'}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-destructive font-medium">৳{amount.toFixed(2)}</span>
                              {balance.userId === user?.id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 hover:bg-primary hover:text-primary-foreground"
                                  onClick={() => {
                                    setSelectedPayment({ toUserId: userId, amount });
                                    setShowPaymentDialog(true);
                                  }}
                                >
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  Pay
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {Object.keys(balance.isOwed).length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-600 mb-2 text-sm">Is owed:</h4>
                      <div className="space-y-1">
                        {Object.entries(balance.isOwed).map(([userId, amount]) => (
                          <div key={userId} className="flex justify-between text-sm bg-green-50 dark:bg-green-950/20 rounded-lg p-2">
                            <span className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={profiles[userId]?.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {profiles[userId]?.name ? getInitials(profiles[userId].name) : '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{profiles[userId]?.name || profiles[userId]?.email || 'Unknown User'}</span>
                            </span>
                            <span className="text-green-600 font-medium">৳{amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {Object.keys(balance.owes).length === 0 && Object.keys(balance.isOwed).length === 0 && (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-950/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-green-600 text-lg">✓</span>
                      </div>
                      <p className="text-muted-foreground text-sm">All settled up!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <span>Amount to Pay:</span>
              <span className="text-lg font-bold">৳{selectedPayment?.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>To:</span>
              <span className="font-medium">
                {selectedPayment ? (profiles[selectedPayment.toUserId]?.name || profiles[selectedPayment.toUserId]?.email || 'Unknown User') : ''}
              </span>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handlePayment}>
                Confirm Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

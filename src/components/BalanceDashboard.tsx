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
import { format } from 'date-fns';

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

interface PaymentStatus {
  isSettled: boolean;
  lastPaymentAmount: number;
}

interface BalanceDashboardProps {
  currentHomeId: string;
  selectedMonth?: Date;
  refreshTrigger?: number;
}

export const BalanceDashboard = ({ currentHomeId, selectedMonth, refreshTrigger }: BalanceDashboardProps) => {
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
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user || !currentHomeId) return;

    console.log('Setting up real-time subscriptions for home:', currentHomeId);

    const channel = supabase
      .channel('realtime-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `home_id=eq.${currentHomeId}`
        },
        (payload) => {
          console.log('Expense change detected:', payload);
          setRefreshKey(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_requests',
          filter: `home_id=eq.${currentHomeId}`
        },
        (payload) => {
          console.log('Payment request change detected:', payload);
          setRefreshKey(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up subscriptions');
      supabase.removeChannel(channel);
    };
  }, [currentHomeId, user]);

  useEffect(() => {
    if (user && currentHomeId) {
      console.log('Fetching balances due to change in:', { refreshKey, currentHomeId, selectedMonth, refreshTrigger });
      fetchBalances();
    }
  }, [user, currentHomeId, refreshKey, selectedMonth, refreshTrigger]);

  // Helper function to check if a date is in the selected month
  const isInSelectedMonth = (dateStr: string) => {
    if (!selectedMonth) return true; // If no month selected, show all
    const date = new Date(dateStr);
    // Convert to local timezone for comparison
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    return localDate.getMonth() === selectedMonth.getMonth() && 
           localDate.getFullYear() === selectedMonth.getFullYear();
  };

  const fetchBalances = async () => {
    if (!user || !currentHomeId) return;

    try {
      setLoading(true);
      console.log('Starting balance calculation for home:', currentHomeId);

      // Get all data ordered by creation date
      const [expensesResult, profilesResult, paymentsResult] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .eq('home_id', currentHomeId)
          .order('created_at', { ascending: true }),
        supabase
          .from('profiles')
          .select('id, name, email, avatar_url'),
        supabase
          .from('payment_requests')
          .select('*')
          .eq('home_id', currentHomeId)
          .eq('status', 'approved')
          .order('created_at', { ascending: true })
      ]);

      if (expensesResult.error) throw expensesResult.error;
      if (profilesResult.error) throw profilesResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      const allExpenses = expensesResult.data || [];
      const profilesData = profilesResult.data || [];
      const allPayments = paymentsResult.data || [];

      // Filter expenses and payments by selected month
      const expenses = selectedMonth 
        ? allExpenses.filter(e => isInSelectedMonth(e.created_at))
        : allExpenses;

      const approvedPayments = selectedMonth
        ? allPayments.filter(p => isInSelectedMonth(p.created_at))
        : allPayments;

      // Create profiles map
      const profileMap = profilesData.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, Profile>);
      setProfiles(profileMap);

      // Create a timeline of all events (expenses and payments) sorted by date
      const timeline = [
        ...expenses.map(e => ({ type: 'expense' as const, data: e, date: e.created_at })),
        ...approvedPayments.map(p => ({ type: 'payment' as const, data: p, date: p.created_at }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Initialize balances
      const userBalances: Record<string, Balance> = {};
      const allUserIds = new Set<string>();

      // Collect all user IDs
      expenses.forEach(expense => {
        allUserIds.add(expense.payer_id);
        expense.participants.forEach(participantId => allUserIds.add(participantId));
      });

      // Initialize balance objects
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

      // Process timeline events in chronological order
      timeline.forEach(event => {
        if (event.type === 'expense') {
          const expense = event.data;
          const splitAmount = expense.amount / expense.participants.length;

          expense.participants.forEach(participantId => {
            if (participantId !== expense.payer_id) {
              // Initialize or add to existing balance
              if (!userBalances[participantId].owes[expense.payer_id]) {
                userBalances[participantId].owes[expense.payer_id] = 0;
              }
              if (!userBalances[expense.payer_id].isOwed[participantId]) {
                userBalances[expense.payer_id].isOwed[participantId] = 0;
              }

              userBalances[participantId].owes[expense.payer_id] += splitAmount;
              userBalances[expense.payer_id].isOwed[participantId] += splitAmount;
            }
          });
        } else if (event.type === 'payment') {
          const payment = event.data;
          
          // When a payment is made, clear the entire debt between these users
          if (userBalances[payment.from_user_id]) {
            delete userBalances[payment.from_user_id].owes[payment.to_user_id];
          }
          if (userBalances[payment.to_user_id]) {
            delete userBalances[payment.to_user_id].isOwed[payment.from_user_id];
          }
        }

        // Calculate net balances after each event
        Object.values(userBalances).forEach(balance => {
          balance.netBalance = 
            Object.values(balance.isOwed).reduce((sum, amount) => sum + amount, 0) -
            Object.values(balance.owes).reduce((sum, amount) => sum + amount, 0);
        });
      });

      // Remove users with no balances
      const activeBalances = Object.values(userBalances).filter(balance => 
        Object.keys(balance.owes).length > 0 || 
        Object.keys(balance.isOwed).length > 0 ||
        balance.netBalance !== 0
      );

      console.log('Final balances:', JSON.parse(JSON.stringify(activeBalances)));
      setBalances(activeBalances);

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Balance Summary
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {selectedMonth ? format(selectedMonth, 'MMMM yyyy') : 'All Time'}
                </span>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {balances.length} participant{balances.length > 1 ? 's' : ''}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {balances.map(balance => (
              <Card key={balance.userId} className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-background to-background/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-primary/20">
                        <AvatarImage src={profiles[balance.userId]?.avatar_url} alt={balance.userName} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs sm:text-sm">
                          {balance.userName ? getInitials(balance.userName) : <User className="h-3 w-3 sm:h-5 sm:w-5" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm truncate">{balance.userName}</span>
                    </div>
                    <Badge variant={balance.netBalance >= 0 ? "default" : "destructive"} className="text-xs sm:text-sm">
                      {balance.netBalance >= 0 ? `+৳${balance.netBalance.toFixed(2)}` : `-৳${Math.abs(balance.netBalance).toFixed(2)}`}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {Object.keys(balance.owes).length > 0 && (
                    <div className="mb-3">
                      <h4 className="font-medium text-destructive mb-2 text-xs sm:text-sm">Owes:</h4>
                      <div className="space-y-2">
                        {Object.entries(balance.owes).map(([userId, amount]) => (
                          <div key={userId} className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm bg-destructive/5 rounded-lg p-2 gap-2">
                            <span className="flex items-center gap-2">
                              <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
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
                                  className="h-8 sm:h-7 px-2 hover:bg-primary hover:text-primary-foreground text-xs"
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
                      <h4 className="font-medium text-green-600 mb-2 text-xs sm:text-sm">Is owed:</h4>
                      <div className="space-y-2">
                        {Object.entries(balance.isOwed).map(([userId, amount]) => (
                          <div key={userId} className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm bg-green-50 dark:bg-green-950/20 rounded-lg p-2 gap-2">
                            <span className="flex items-center gap-2">
                              <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
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
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-950/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-green-600 text-base sm:text-lg">✓</span>
                      </div>
                      <p className="text-muted-foreground text-xs sm:text-sm">All settled up!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Confirm Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base">Amount to Pay:</span>
              <span className="text-base sm:text-lg font-bold">৳{selectedPayment?.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base">To:</span>
              <span className="font-medium text-sm sm:text-base">
                {selectedPayment ? (profiles[selectedPayment.toUserId]?.name || profiles[selectedPayment.toUserId]?.email || 'Unknown User') : ''}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="h-10 sm:h-9">
                Cancel
              </Button>
              <Button onClick={handlePayment} className="h-10 sm:h-9">
                Confirm Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow, format } from 'date-fns';

interface PaymentRequest {
  id: string;
  amount: number;
  from_user_id: string;
  to_user_id: string;
  home_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  from_user: { name: string; email: string; avatar_url: string };
  to_user: { name: string; email: string; avatar_url: string };
}

interface PaymentRequestsProps {
  currentHomeId: string;
  onPaymentStatusChange?: () => void;
  selectedMonth?: Date;
}

export const PaymentRequests = ({ currentHomeId, onPaymentStatusChange, selectedMonth }: PaymentRequestsProps) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to check if a date is in the selected month
  const isInSelectedMonth = (dateStr: string) => {
    if (!selectedMonth) return true; // If no month selected, show all
    const date = new Date(dateStr);
    return date.getMonth() === selectedMonth.getMonth() && 
           date.getFullYear() === selectedMonth.getFullYear();
  };

  const fetchPaymentRequests = async () => {
    if (!user || !currentHomeId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_requests')
        .select(`
          *,
          from_user:profiles!payment_requests_from_user_id_fkey(name, email, avatar_url),
          to_user:profiles!payment_requests_to_user_id_fkey(name, email, avatar_url)
        `)
        .eq('home_id', currentHomeId)
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter by selected month if specified
      const filteredData = selectedMonth
        ? (data || []).filter(request => isInSelectedMonth(request.created_at))
        : (data || []);

      setRequests(filteredData);
    } catch (error) {
      console.error('Error fetching payment requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payment requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentRequests();
  }, [user, currentHomeId, selectedMonth]);

  // Set up real-time subscription for payment requests
  useEffect(() => {
    if (!user || !currentHomeId) return;

    const channel = supabase
      .channel('payment-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_requests',
          filter: `home_id=eq.${currentHomeId}`
        },
        () => {
          fetchPaymentRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentHomeId, selectedMonth]);

  const handleUpdateRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: status === 'approved' ? "Payment marked as settled" : "Payment request rejected",
      });
      
      // Refresh payment requests
      fetchPaymentRequests();
      
      // Notify parent component to refresh balances and payment statuses
      onPaymentStatusChange?.();
    } catch (error) {
      console.error('Error updating payment request:', error);
      toast({
        title: "Error",
        description: "Failed to update payment request",
        variant: "destructive",
      });
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

  return (
    <Card className="border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur shadow-xl">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="text-lg sm:text-xl">Payment Requests</span>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {selectedMonth ? format(selectedMonth, 'MMMM yyyy') : 'All Time'}
            </div>
          </CardTitle>
          <Badge variant="outline" className="text-xs sm:text-sm">
            {requests.length} request{requests.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No payment requests</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={request.from_user.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {getInitials(request.from_user.name || request.from_user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">
                            {request.from_user.name || request.from_user.email}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            wants to pay
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-10">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={request.to_user.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {getInitials(request.to_user.name || request.to_user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">
                            {request.to_user.name || request.to_user.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right sm:text-left">
                      <p className="text-xl sm:text-2xl font-bold text-green-600">
                        ৳{request.amount.toFixed(2)}
                      </p>
                      <Badge 
                        variant={
                          request.status === 'approved' 
                            ? 'default' 
                            : request.status === 'rejected' 
                            ? 'destructive' 
                            : 'outline'
                        }
                        className="text-xs mt-1"
                      >
                        {request.status}
                      </Badge>
                    </div>
                  </div>
                  {user?.id === request.to_user_id && request.status === 'pending' && (
                    <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateRequest(request.id, 'rejected')}
                        className="h-10 sm:h-9"
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateRequest(request.id, 'approved')}
                        className="h-10 sm:h-9"
                      >
                        Approve
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 
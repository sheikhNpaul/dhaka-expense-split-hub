import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

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

export const PaymentRequests = ({ currentHomeId }: { currentHomeId: string }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

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
      setRequests(data || []);
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
  }, [user, currentHomeId]);

  useEffect(() => {
    fetchPaymentRequests();
  }, [user, currentHomeId]);

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
        description: `Payment request ${status}`,
      });
      fetchPaymentRequests();
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
        <CardTitle className="flex items-center justify-between">
          <span>Payment Requests</span>
          <Badge variant="outline" className="ml-2">
            {requests.length} request{requests.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
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
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={request.from_user.avatar_url} />
                          <AvatarFallback>
                            {getInitials(request.from_user.name || request.from_user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {request.from_user.name || request.from_user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            wants to pay
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-10">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={request.to_user.avatar_url} />
                          <AvatarFallback>
                            {getInitials(request.to_user.name || request.to_user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {request.to_user.name || request.to_user.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
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
                      >
                        {request.status}
                      </Badge>
                    </div>
                  </div>
                  {user?.id === request.to_user_id && request.status === 'pending' && (
                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateRequest(request.id, 'rejected')}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateRequest(request.id, 'approved')}
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
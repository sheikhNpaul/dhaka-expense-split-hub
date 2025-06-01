import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { X, Users } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  email: string;
}

interface HomeMember {
  id: string;
  user_id: string;
  profile: Profile;
}

interface AddExpenseProps {
  onClose: () => void;
  onExpenseAdded: () => void;
  currentHomeId: string;
}

export const AddExpense = ({ onClose, onExpenseAdded, currentHomeId }: AddExpenseProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [homeMembers, setHomeMembers] = useState<HomeMember[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    description: '',
    selectedParticipants: [] as string[],
  });

  useEffect(() => {
    if (currentHomeId) {
      fetchHomeMembers();
    }
  }, [currentHomeId]);

  const fetchHomeMembers = async () => {
    try {
      // First get home members
      const { data: membersData, error: membersError } = await supabase
        .from('home_members')
        .select('id, user_id')
        .eq('home_id', currentHomeId)
        .eq('is_active', true);

      if (membersError) {
        console.error('Error fetching home members:', membersError);
        throw membersError;
      }

      if (membersData && membersData.length > 0) {
        // Then get profiles for these users
        const userIds = membersData.map(member => member.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }

        // Combine the data
        const combinedData = membersData.map(member => {
          const profile = profilesData?.find(p => p.id === member.user_id);
          return {
            id: member.id,
            user_id: member.user_id,
            profile: profile || { id: member.user_id, name: 'Unknown', email: '' }
          };
        });

        setHomeMembers(combinedData);
        
        // Pre-select current user
        if (user) {
          setFormData(prev => ({
            ...prev,
            selectedParticipants: [user.id]
          }));
        }
      }
    } catch (error: any) {
      console.error('Error fetching home members:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleParticipantToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedParticipants: prev.selectedParticipants.includes(userId)
        ? prev.selectedParticipants.filter(id => id !== userId)
        : [...prev.selectedParticipants, userId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentHomeId) return;

    if (formData.selectedParticipants.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one participant",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          title: formData.title,
          amount: parseFloat(formData.amount),
          description: formData.description,
          payer_id: user.id,
          participants: formData.selectedParticipants,
          home_id: currentHomeId,
          split_type: formData.selectedParticipants.length === 1 ? 'one_person' : 
                     formData.selectedParticipants.length === 2 ? 'two_people' : 'all_three'
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Expense added successfully.",
      });
      
      onExpenseAdded();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Add New Expense</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Groceries, Utilities"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (BDT)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details..."
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Split with home members
              </Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {homeMembers.map(member => (
                  <div key={member.user_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={member.user_id}
                      checked={formData.selectedParticipants.includes(member.user_id)}
                      onCheckedChange={() => handleParticipantToggle(member.user_id)}
                    />
                    <Label 
                      htmlFor={member.user_id} 
                      className="flex-1 cursor-pointer"
                    >
                      {member.profile.name || member.profile.email}
                      {member.user_id === user?.id && " (You)"}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Selected: {formData.selectedParticipants.length} member{formData.selectedParticipants.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Adding...' : 'Add Expense'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

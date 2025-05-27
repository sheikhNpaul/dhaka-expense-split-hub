
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

interface AddExpenseProps {
  onClose: () => void;
  onExpenseAdded: () => void;
}

export const AddExpense = ({ onClose, onExpenseAdded }: AddExpenseProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    description: '',
    splitType: 'all_three' as 'all_three' | 'two_people' | 'one_person',
    selectedParticipants: [] as string[],
  });

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email');
    
    if (data) {
      setAllUsers(data);
      // Pre-select all users for 'all_three' option
      if (formData.splitType === 'all_three') {
        setFormData(prev => ({
          ...prev,
          selectedParticipants: data.map(u => u.id)
        }));
      }
    }
  };

  const handleSplitTypeChange = (splitType: typeof formData.splitType) => {
    setFormData(prev => ({
      ...prev,
      splitType,
      selectedParticipants: splitType === 'all_three' 
        ? allUsers.map(u => u.id)
        : splitType === 'one_person' 
        ? [user?.id || '']
        : []
    }));
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
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          title: formData.title,
          amount: parseFloat(formData.amount),
          description: formData.description,
          payer_id: user.id,
          split_type: formData.splitType,
          participants: formData.selectedParticipants,
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
      <Card className="w-full max-w-md">
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
                placeholder="e.g., Kitchen oil, Groceries"
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
              <Label>Split Type</Label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={formData.splitType === 'all_three'}
                    onChange={() => handleSplitTypeChange('all_three')}
                  />
                  <span>Split between all 3 roommates</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={formData.splitType === 'two_people'}
                    onChange={() => handleSplitTypeChange('two_people')}
                  />
                  <span>Split between 2 people</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={formData.splitType === 'one_person'}
                    onChange={() => handleSplitTypeChange('one_person')}
                  />
                  <span>Personal expense (bill one person)</span>
                </label>
              </div>
            </div>

            {(formData.splitType === 'two_people' || formData.splitType === 'one_person') && (
              <div className="space-y-2">
                <Label>Select Participants</Label>
                <div className="space-y-2">
                  {allUsers.map(user => (
                    <label key={user.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.selectedParticipants.includes(user.id)}
                        onChange={() => handleParticipantToggle(user.id)}
                      />
                      <span>{user.name || user.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

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

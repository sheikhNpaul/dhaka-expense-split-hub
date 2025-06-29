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
import Tooltip from '@mui/material/Tooltip';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import LocalDiningIcon from '@mui/icons-material/LocalDining';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import FlightIcon from '@mui/icons-material/Flight';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HomeIcon from '@mui/icons-material/Home';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import BookIcon from '@mui/icons-material/Book';
import ComputerIcon from '@mui/icons-material/Computer';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import CelebrationIcon from '@mui/icons-material/Celebration';
import MovieIcon from '@mui/icons-material/Movie';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import PetsIcon from '@mui/icons-material/Pets';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';

const ICON_OPTIONS = [
  { name: 'Food', value: 'Fastfood', icon: FastfoodIcon },
  { name: 'Dining', value: 'LocalDining', icon: LocalDiningIcon },
  { name: 'Groceries', value: 'LocalGroceryStore', icon: LocalGroceryStoreIcon },
  { name: 'Transport', value: 'DirectionsCar', icon: DirectionsCarIcon },
  { name: 'Travel', value: 'Flight', icon: FlightIcon },
  { name: 'Shopping', value: 'ShoppingCart', icon: ShoppingCartIcon },
  { name: 'Home', value: 'Home', icon: HomeIcon },
  { name: 'Utilities', value: 'Lightbulb', icon: LightbulbIcon },
  { name: 'Health', value: 'LocalHospital', icon: LocalHospitalIcon },
  { name: 'Vacation', value: 'BeachAccess', icon: BeachAccessIcon },
  { name: 'Bills', value: 'Receipt', icon: ReceiptIcon },
  { name: 'Salary', value: 'AttachMoney', icon: AttachMoneyIcon },
  { name: 'Games', value: 'SportsEsports', icon: SportsEsportsIcon },
  { name: 'Books', value: 'Book', icon: BookIcon },
  { name: 'Tech', value: 'Computer', icon: ComputerIcon },
  { name: 'Mall', value: 'LocalMall', icon: LocalMallIcon },
  { name: 'Party', value: 'Celebration', icon: CelebrationIcon },
  { name: 'Movies', value: 'Movie', icon: MovieIcon },
  { name: 'Bar', value: 'LocalBar', icon: LocalBarIcon },
  { name: 'Cafe', value: 'LocalCafe', icon: LocalCafeIcon },
  { name: 'Pets', value: 'Pets', icon: PetsIcon },
  { name: 'Kids', value: 'ChildCare', icon: ChildCareIcon },
  { name: 'Fitness', value: 'FitnessCenter', icon: FitnessCenterIcon },
];

interface Expense {
  id: string;
  title: string;
  amount: number;
  description: string;
  split_type: string;
  participants: string[];
  home_id: string;
  category_id?: string;
}

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

interface EditExpenseProps {
  expense: Expense;
  onClose: () => void;
  onExpenseUpdated: () => void;
}

export const EditExpense = ({ expense, onClose, onExpenseUpdated }: EditExpenseProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [homeMembers, setHomeMembers] = useState<HomeMember[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string }[]>([]);
  
  const [formData, setFormData] = useState({
    title: expense.title,
    amount: expense.amount.toString(),
    description: expense.description,
    selectedParticipants: expense.participants,
    category_id: expense.category_id || '',
  });

  useEffect(() => {
    if (expense.home_id) {
      fetchHomeMembers();
    }
    if (user) {
      fetchCategories();
    }
  }, [expense.home_id, user]);

  const fetchHomeMembers = async () => {
    try {
      // First get home members
      const { data: membersData, error: membersError } = await supabase
        .from('home_members')
        .select('id, user_id')
        .eq('home_id', expense.home_id)
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

  const fetchCategories = async () => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from('categories')
      .select('id, name, icon')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setCategories(data);
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
        .update({
          title: formData.title,
          amount: parseFloat(formData.amount),
          description: formData.description,
          participants: formData.selectedParticipants,
          category_id: formData.category_id || null,
          split_type: formData.selectedParticipants.length === 1 ? 'one_person' : 
                     formData.selectedParticipants.length === 2 ? 'two_people' : 'all_three',
          updated_at: new Date().toISOString(),
        })
        .eq('id', expense.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Expense updated successfully.",
      });
      
      onExpenseUpdated();
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expense.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Expense deleted successfully.",
      });
      
      onExpenseUpdated();
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <Card className="w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg sm:text-xl">Edit Expense</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-10 w-10 sm:h-8 sm:w-8">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Groceries, Utilities"
                required
                className="h-11 sm:h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">Amount (BDT)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                required
                className="h-11 sm:h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details..."
                className="min-h-[80px] sm:min-h-[60px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <div className="flex gap-3 overflow-x-auto pb-4 pt-2">
                {categories.map(cat => {
                  const Icon = ICON_OPTIONS.find(opt => opt.value === cat.icon)?.icon || FastfoodIcon;
                  return (
                    <Tooltip title={cat.name} key={cat.id} arrow>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, category_id: cat.id }))}
                        className={`flex flex-col items-center justify-center w-20 h-20 rounded-lg border transition-all duration-200 text-lg focus:outline-none bg-muted/40
                          ${formData.category_id === cat.id ? 'border-primary bg-primary/10' : 'border-muted'}
                        `}
                        style={{ minWidth: 80, minHeight: 80 }}
                      >
                        <Icon style={{ fontSize: 32 }} />
                        <span className="text-xs mt-2 w-full overflow-hidden text-ellipsis whitespace-nowrap block max-w-[64px] text-center">{cat.name}</span>
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
              {categories.length === 0 && (
                <p className="text-xs text-muted-foreground">No categories available. Create categories in the Add Expense page.</p>
              )}
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                Split with home members
              </Label>
              <div className="space-y-3 max-h-40 sm:max-h-32 overflow-y-auto p-2 bg-muted/30 rounded-lg">
                {homeMembers.map(member => (
                  <div key={member.user_id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={member.user_id}
                      checked={formData.selectedParticipants.includes(member.user_id)}
                      onCheckedChange={() => handleParticipantToggle(member.user_id)}
                      className="h-5 w-5 sm:h-4 sm:w-4"
                    />
                    <Label 
                      htmlFor={member.user_id} 
                      className="flex-1 cursor-pointer text-sm"
                    >
                      {member.profile.name || member.profile.email}
                      {member.user_id === user?.id && " (You)"}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Selected: {formData.selectedParticipants.length} member{formData.selectedParticipants.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-11 sm:h-10">
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete} 
                disabled={loading}
                className="flex-1 h-11 sm:h-10"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 h-11 sm:h-10">
                {loading ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

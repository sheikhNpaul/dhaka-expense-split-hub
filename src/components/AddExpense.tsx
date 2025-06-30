import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { X, Users, Plus, Check, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';

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
  defaultDate?: Date;
}

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

export const AddExpense = ({ onClose, onExpenseAdded, currentHomeId, defaultDate }: AddExpenseProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [homeMembers, setHomeMembers] = useState<HomeMember[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', icon: '' });
  const [categoryGlow, setCategoryGlow] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; icon: string } | null>(null);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const glowTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    description: '',
    selectedParticipants: [] as string[],
    category_id: '',
  });

  useEffect(() => {
    if (currentHomeId) {
      fetchHomeMembers();
    }
    if (user) {
      fetchCategories();
    }
  }, [currentHomeId, user]);

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

  const fetchCategories = async () => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from('categories')
      .select('id, name, icon')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setCategories(data);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCategory.name || !newCategory.icon) {
      toast({ 
        title: 'Error', 
        description: 'Please provide both name and select an icon', 
        variant: 'destructive' 
      });
      return;
    }
    try {
      const { data, error } = await (supabase as any)
        .from('categories')
        .insert({ user_id: user.id, name: newCategory.name, icon: newCategory.icon })
        .select('id, name, icon')
        .single();
      if (!error && data) {
        setCategories([data, ...categories]);
        setFormData(prev => ({ ...prev, category_id: data.id }));
        setShowCategoryModal(false);
        setNewCategory({ name: '', icon: '' });
        toast({ title: 'Category created!' });
      } else {
        toast({ title: 'Error', description: error?.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingCategory || !editingCategory.name || !editingCategory.icon) {
      toast({ 
        title: 'Error', 
        description: 'Please provide both name and select an icon', 
        variant: 'destructive' 
      });
      return;
    }
    try {
      const { data, error } = await (supabase as any)
        .from('categories')
        .update({ name: editingCategory.name, icon: editingCategory.icon })
        .eq('id', editingCategory.id)
        .eq('user_id', user.id)
        .select('id, name, icon')
        .single();
      if (!error && data) {
        setCategories(categories.map(cat => cat.id === data.id ? data : cat));
        setShowEditCategoryModal(false);
        setEditingCategory(null);
        toast({ title: 'Category updated!' });
      } else {
        toast({ title: 'Error', description: error?.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This will remove it from all expenses.')) return;
    
    try {
      const { error } = await (supabase as any)
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', user.id);
      
      if (!error) {
        setCategories(categories.filter(cat => cat.id !== categoryId));
        if (formData.category_id === categoryId) {
          setFormData(prev => ({ ...prev, category_id: '' }));
        }
        toast({ title: 'Category deleted!' });
      } else {
        toast({ title: 'Error', description: error?.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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

  const handleCategorySelect = (id: string) => {
    setFormData(prev => ({ ...prev, category_id: id }));
    setCategoryGlow(id);
    if (glowTimeout.current) clearTimeout(glowTimeout.current);
    glowTimeout.current = setTimeout(() => setCategoryGlow(null), 350);
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
          created_at: defaultDate ? new Date(defaultDate).toISOString() : new Date().toISOString(),
          split_type: formData.selectedParticipants.length === 1 ? 'one_person' : 
                     formData.selectedParticipants.length === 2 ? 'two_people' : 'all_three',
          category_id: formData.category_id,
        });

      if (error) throw error;

      // Send notifications to all participants except the payer
      const participantsToNotify = formData.selectedParticipants.filter(participantId => participantId !== user.id);
      
      if (participantsToNotify.length > 0) {
        const payerName = homeMembers.find(member => member.user_id === user.id)?.profile.name || user.email || 'Someone';
        const amount = parseFloat(formData.amount);
        
        // Create notifications for all participants
        const notificationPromises = participantsToNotify.map(participantId => 
          (supabase as any)
            .from('notifications')
            .insert({
              user_id: participantId,
              title: 'New Expense Added',
              message: `${payerName} added a new expense: "${formData.title}" for ৳${amount.toFixed(2)}`,
              type: 'expense',
              read: false,
            })
        );

        // Send all notifications in parallel
        await Promise.all(notificationPromises);
      }

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <Card className="w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg sm:text-xl">Add New Expense</CardTitle>
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
              <Label className="text-sm font-medium">Category</Label>
              <div className="flex gap-3 overflow-x-auto pb-4 pt-2">
                {categories.map(cat => {
                  const Icon = ICON_OPTIONS.find(opt => opt.value === cat.icon)?.icon || FastfoodIcon;
                  return (
                    <Tooltip title={cat.name} key={cat.id} arrow>
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => handleCategorySelect(cat.id)}
                          className={`flex flex-col items-center justify-center w-20 h-20 rounded-lg border transition-all duration-200 text-lg focus:outline-none bg-muted/40
                            ${formData.category_id === cat.id ? 'border-primary bg-primary/10' : 'border-muted'}
                            ${categoryGlow === cat.id ? 'border-2 border-dotted border-blue-500 animate-fade-glow' : ''}
                          `}
                          style={{ minWidth: 80, minHeight: 80 }}
                        >
                          <Icon style={{ fontSize: 32 }} />
                          <span className="text-xs mt-2 w-full overflow-hidden text-ellipsis whitespace-nowrap block max-w-[64px] text-center">{cat.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategory(cat);
                            setShowEditCategoryModal(true);
                          }}
                          className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-primary/80"
                          style={{ width: 20, height: 20 }}
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                      </div>
                    </Tooltip>
                  );
                })}
                <Tooltip title="Add Category" arrow>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="flex flex-col items-center justify-center w-20 h-20 rounded-lg border border-dashed border-muted text-muted-foreground hover:text-primary hover:border-primary bg-muted/40 transition-all duration-200 p-0"
                    style={{ minWidth: 80, minHeight: 80 }}
                    aria-label="Create new category"
                  >
                    <Plus className="h-6 w-6" />
                    <span className="text-xs mt-2 w-full overflow-hidden text-ellipsis whitespace-nowrap block max-w-[64px] text-center">Add</span>
                  </button>
                </Tooltip>
              </div>
              <style>{`
                @keyframes fadeGlow {
                  0% { box-shadow: 0 0 0 0 #3b82f6; border-color: #3b82f6; }
                  50% { box-shadow: 0 0 8px 4px #3b82f6; border-color: #3b82f6; }
                  100% { box-shadow: 0 0 0 0 #3b82f6; border-color: #3b82f6; }
                }
                .animate-fade-glow {
                  animation: fadeGlow 0.4s;
                  border-style: dotted !important;
                  border-width: 2px !important;
                  border-color: #3b82f6 !important;
                }
              `}</style>
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

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                Split with all home members
                <Switch
                  checked={formData.selectedParticipants.length === homeMembers.length && homeMembers.length > 0}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({
                      ...prev,
                      selectedParticipants: checked
                        ? homeMembers.map(m => m.user_id)
                        : user ? [user.id] : []
                    }));
                  }}
                  className="ml-3"
                />
              </Label>
              <div className="space-y-1 max-h-40 sm:max-h-32 overflow-y-auto p-2 bg-muted/30 rounded-lg">
                {homeMembers.map(member => (
                  <div key={member.user_id} className="flex items-center justify-between p-1 rounded hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0 text-sm truncate">
                      {member.profile.name || member.profile.email}
                      {member.user_id === user?.id && " (You)"}
                    </div>
                    <Switch
                      checked={formData.selectedParticipants.includes(member.user_id)}
                      onCheckedChange={() => {
                        setFormData(prev => ({
                          ...prev,
                          selectedParticipants: prev.selectedParticipants.includes(member.user_id)
                            ? prev.selectedParticipants.filter(id => id !== member.user_id)
                            : [...prev.selectedParticipants, member.user_id]
                        }));
                      }}
                      className="ml-2"
                    />
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
              <Button type="submit" disabled={loading} className="flex-1 h-11 sm:h-10">
                {loading ? 'Adding...' : 'Add Expense'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={newCategory.name}
                onChange={e => setNewCategory(c => ({ ...c, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-5 gap-3 mt-4 mb-2">
                {ICON_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-lg border transition-all duration-200
                        ${newCategory.icon === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-muted bg-muted/40 text-muted-foreground hover:text-primary hover:border-primary'}
                      `}
                      onClick={() => setNewCategory(c => ({ ...c, icon: opt.value }))}
                    >
                      {newCategory.icon === opt.value && (
                        <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <Icon style={{ fontSize: 28 }} />
                      <span className="text-xs mt-1 w-full overflow-hidden text-ellipsis whitespace-nowrap block max-w-[48px] text-center">{opt.name}</span>
                    </button>
                  );
                })}
              </div>
              {!newCategory.icon && (
                <p className="text-xs text-muted-foreground">Please select an icon for your category</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCategoryModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditCategoryModal} onOpenChange={setShowEditCategoryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cat-name">Name</Label>
              <Input
                id="edit-cat-name"
                value={editingCategory?.name || ''}
                onChange={e => setEditingCategory(c => c ? { ...c, name: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-5 gap-3 mt-4 mb-2">
                {ICON_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-lg border transition-all duration-200
                        ${editingCategory?.icon === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-muted bg-muted/40 text-muted-foreground hover:text-primary hover:border-primary'}
                      `}
                      onClick={() => setEditingCategory(c => c ? { ...c, icon: opt.value } : null)}
                    >
                      {editingCategory?.icon === opt.value && (
                        <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <Icon style={{ fontSize: 28 }} />
                      <span className="text-xs mt-1 w-full overflow-hidden text-ellipsis whitespace-nowrap block max-w-[48px] text-center">{opt.name}</span>
                    </button>
                  );
                })}
              </div>
              {!editingCategory?.icon && (
                <p className="text-xs text-muted-foreground">Please select an icon for your category</p>
              )}
            </div>
            <div className="flex justify-between gap-2">
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => editingCategory && handleDeleteCategory(editingCategory.id)}
                className="flex-1"
              >
                Delete
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditCategoryModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

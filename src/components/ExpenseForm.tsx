import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { X, Users, Plus, Check, Edit, MoreHorizontal, Calendar } from 'lucide-react';
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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

export interface ExpenseFormProps {
  mode: 'add' | 'edit';
  initialValues?: any;
  currentHomeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExpenseForm = ({ mode, initialValues, currentHomeId, onClose, onSuccess }: ExpenseFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [homeMembers, setHomeMembers] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', icon: '' });
  const [categoryGlow, setCategoryGlow] = useState<string | null>(null);
  const [memberGlow, setMemberGlow] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; icon: string } | null>(null);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const glowTimeout = useRef<NodeJS.Timeout | null>(null);
  const memberGlowTimeout = useRef<NodeJS.Timeout | null>(null);
  const [userEditedCategoryName, setUserEditedCategoryName] = useState(false);
  const [showCategoryActionModal, setShowCategoryActionModal] = useState(false);
  const [categoryActionTarget, setCategoryActionTarget] = useState(null);
  const longPressTimeout = useRef(null);

  const [formData, setFormData] = useState({
    title: initialValues?.title || '',
    amount: initialValues?.amount?.toString() || '',
    description: initialValues?.description || '',
    selectedParticipants: initialValues?.selectedParticipants || initialValues?.participants || (user ? [user.id] : []),
    category_id: initialValues?.category_id || '',
    date: initialValues?.date || (initialValues?.created_at ? new Date(initialValues.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
    split_type: initialValues?.split_type || 'custom'
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
      const { data: membersData, error: membersError } = await supabase
        .from('home_members')
        .select('id, user_id')
        .eq('home_id', currentHomeId)
        .eq('is_active', true);
      if (membersError) throw membersError;
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(member => member.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url')
          .in('id', userIds);
        if (profilesError) throw profilesError;
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
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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

  const handleCategorySelect = (id: string) => {
    setFormData(prev => ({ ...prev, category_id: id }));
    setCategoryGlow(id);
    if (glowTimeout.current) clearTimeout(glowTimeout.current);
    glowTimeout.current = setTimeout(() => setCategoryGlow(null), 350);
  };

  const handleMemberSelect = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedParticipants: prev.selectedParticipants.includes(userId)
        ? prev.selectedParticipants.filter(id => id !== userId)
        : [...prev.selectedParticipants, userId]
    }));
    setMemberGlow(userId);
    if (memberGlowTimeout.current) clearTimeout(memberGlowTimeout.current);
    memberGlowTimeout.current = setTimeout(() => setMemberGlow(null), 350);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.title || !formData.amount || !formData.category_id) {
        toast({ title: 'Missing fields', description: 'Please fill all required fields.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      
      // If split_type is 'custom' (Split with All), ensure all members are selected
      if (formData.split_type === 'custom') {
        const allMemberIds = homeMembers.map(m => m.user_id);
        if (!formData.selectedParticipants.every(id => allMemberIds.includes(id))) {
          setFormData(prev => ({
            ...prev,
            selectedParticipants: allMemberIds
          }));
        }
      }

      if (mode === 'add') {
        const { error } = await supabase.from('expenses').insert([
          {
            title: formData.title,
            amount: parseFloat(formData.amount),
            description: formData.description,
            payer_id: user?.id,
            participants: formData.selectedParticipants,
            split_type: formData.split_type,
            category_id: formData.category_id,
            home_id: currentHomeId,
            created_at: formData.date,
          },
        ]);
        if (error) throw error;
        toast({ title: 'Expense added!' });
      } else {
        const { error } = await supabase.from('expenses').update({
          title: formData.title,
          amount: parseFloat(formData.amount),
          description: formData.description,
          participants: formData.selectedParticipants,
          split_type: formData.split_type,
          category_id: formData.category_id,
          created_at: formData.date,
        }).eq('id', initialValues.id);
        if (error) throw error;
        toast({ title: 'Expense updated!' });
      }
      setLoading(false);
      onSuccess();
    } catch (error: any) {
      setLoading(false);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <h2 className="text-lg font-semibold mb-4">{mode === 'add' ? 'Add Expense' : 'Edit Expense'}</h2>
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
        <Label htmlFor="date" className="text-sm font-medium">Date</Label>
        <div className="relative">
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
            required
            className="h-11 sm:h-10 pr-10"
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-600 pointer-events-none" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Category</Label>
        <div className="flex gap-3 overflow-x-auto touch-pan-x pb-4 pt-2">
          {categories.map(cat => {
            const Icon = ICON_OPTIONS.find(opt => opt.value === cat.icon)?.icon || FastfoodIcon;
            return (
              <Tooltip title={cat.name} key={cat.id} arrow>
                <div
                  className={`relative group flex flex-col sm:flex-col items-stretch sm:items-center justify-center w-20 h-20 sm:w-20 sm:h-20 rounded-lg border transition-all duration-200 text-lg focus:outline-none bg-muted/40
                    ${formData.category_id === cat.id ? 'border-primary bg-primary/10' : 'border-muted'}
                    ${categoryGlow === cat.id ? 'border-2 border-dotted border-blue-500 animate-fade-glow' : ''}
                    sm:w-20 sm:h-20
                  `}
                  style={{ minWidth: 80, minHeight: 80 }}
                  onClick={() => handleCategorySelect(cat.id)}
                >
                  <div className="flex flex-col items-center justify-center w-full h-full">
                    <Icon style={{ fontSize: 32 }} />
                  </div>
                </div>
              </Tooltip>
            );
          })}
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
      <div className="space-y-2">
        <Label className="text-sm font-medium">Split Type</Label>
        <div className="flex items-center gap-2">
          <Switch
            id="split-all"
            checked={formData.split_type === 'custom'}
            onCheckedChange={(checked) => {
              setFormData(prev => ({
                ...prev,
                split_type: checked ? 'custom' : 'one_person',
                selectedParticipants: checked ? homeMembers.map(m => m.user_id) : []
              }));
            }}
          />
          <Label htmlFor="split-all" className="ml-2">Split with All Members</Label>
        </div>
      </div>
      <div className="space-y-3">
        <div className="block sm:hidden">
          <div className="flex gap-3 overflow-x-auto p-2 bg-muted/30 rounded-lg">
            {homeMembers.map(member => {
              const selected = formData.selectedParticipants.includes(member.user_id);
              const initials = (member.profile.name || member.profile.email || '?')
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
              return (
                <button
                  key={member.user_id}
                  type="button"
                  onClick={() => handleMemberSelect(member.user_id)}
                  className={`relative focus:outline-none ${selected ? 'ring-4 ring-primary/80 ring-offset-2' : ''} ${memberGlow === member.user_id ? 'animate-fade-glow' : ''}`}
                  style={{ borderRadius: '50%' }}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.profile.avatar_url || undefined} alt={member.profile.name || member.profile.email} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  {member.user_id === user?.id && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs bg-primary text-primary-foreground rounded px-1">You</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Tap avatars to select members. Selected: {formData.selectedParticipants.length}
          </p>
        </div>
        <div className="hidden sm:block space-y-1 max-h-40 sm:max-h-32 overflow-y-auto p-2 bg-muted/30 rounded-lg">
          {homeMembers.map(member => (
            <div key={member.user_id} className="flex items-center gap-2 h-10 rounded hover:bg-muted/50 transition-colors px-2">
              <div className="flex-1 min-w-0 text-sm truncate">
                {member.profile.name || member.profile.email}
                {member.user_id === user?.id && " (You)"}
              </div>
              <Switch
                checked={formData.selectedParticipants.includes(member.user_id)}
                onCheckedChange={() => handleMemberSelect(member.user_id)}
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
          {loading ? (mode === 'add' ? 'Adding...' : 'Updating...') : (mode === 'add' ? 'Add Expense' : 'Update')}
        </Button>
      </div>
    </form>
  );
} 
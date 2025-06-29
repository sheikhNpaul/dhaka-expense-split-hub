import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Home, 
  Plus, 
  Users, 
  Copy, 
  Check, 
  Building2, 
  MapPin, 
  Key, 
  UserPlus, 
  Settings,
  Sparkles,
  ArrowRight,
  Crown,
  User,
  MoreHorizontal,
  Shield,
  UserX,
  Trash2,
  Edit,
  Share
} from 'lucide-react';
import { HomeAdmin } from './HomeAdmin';

interface Home {
  id: string;
  name: string;
  address: string;
  home_code: string;
  created_by: string;
  created_at: string;
}

interface HomeMember {
  id: string;
  user_id: string;
  is_admin: boolean;
  is_active: boolean;
  profile: {
    name: string;
    email: string;
  };
}

interface HomeManagerProps {
  onHomeSelected: (homeId: string) => void;
  currentHomeId?: string;
}

export const HomeManager = ({ onHomeSelected, currentHomeId }: HomeManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [homes, setHomes] = useState<Home[]>([]);
  const [members, setMembers] = useState<Record<string, HomeMember[]>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState<string | null>(null);
  
  const [createForm, setCreateForm] = useState({
    name: '',
    address: ''
  });
  
  const [joinCode, setJoinCode] = useState('');

  // Fix: useCallback for fetchUserHomes to avoid missing dependency warning
  const fetchUserHomes = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('home_members')
      .select(`
        home_id,
        homes (
          id,
          name,
          address,
          home_code,
          created_by,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching homes:', error);
      return;
    }

    if (data) {
      const userHomes = data.map(item => item.homes).filter(Boolean) as Home[];
      setHomes(userHomes);
      
      // Clear existing members data before fetching new data
      setMembers({});
      
      // Fetch members for each home
      userHomes.forEach(home => {
        fetchHomeMembers(home.id);
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserHomes();
    }
  }, [user, currentHomeId, fetchUserHomes]);
  // ^^^ Fix: add fetchUserHomes to dependency array

  const fetchHomeMembers = async (homeId: string) => {
    try {
      // First get home members
      const { data: membersData, error: membersError } = await supabase
        .from('home_members')
        .select('id, user_id, is_admin, is_active')
        .eq('home_id', homeId)
        .eq('is_active', true);

      if (membersError) {
        console.error('Error fetching home members:', membersError);
        return;
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
          return;
        }

        // Combine the data
        const transformedData = membersData.map(member => {
          const profile = profilesData?.find(p => p.id === member.user_id);
          return {
            ...member,
            profile: profile || { name: 'Unknown', email: '' }
          };
        });

        setMembers(prev => ({
          ...prev,
          [homeId]: transformedData as HomeMember[]
        }));
      }
    } catch (error) {
      console.error('Error in fetchHomeMembers:', error);
    }
  };

  const refreshHomeMembers = async (homeId: string) => {
    await fetchHomeMembers(homeId);
  };

  const generateHomeCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleCreateHome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Generate a unique home code
      let homeCode = generateHomeCode();
      let codeExists = true;
      
      // Check if code already exists and generate a new one if needed
      while (codeExists) {
        const { data: existingHome } = await supabase
          .from('homes')
          .select('id')
          .eq('home_code', homeCode)
          .single();
        
        if (!existingHome) {
          codeExists = false;
        } else {
          homeCode = generateHomeCode();
        }
      }

      // Create the home with the generated home_code
      const { data: homeData, error: homeError } = await supabase
        .from('homes')
        .insert({
          name: createForm.name,
          address: createForm.address,
          created_by: user.id,
          home_code: homeCode
        })
        .select()
        .single();

      if (homeError) throw homeError;

      // Add creator as a member and admin
      const { error: memberError } = await supabase
        .from('home_members')
        .insert({
          home_id: homeData.id,
          user_id: user.id,
          is_admin: true
        });

      if (memberError) throw memberError;

      // Update user's current home
      await supabase
        .from('profiles')
        .update({ current_home_id: homeData.id })
        .eq('id', user.id);

      toast({
        title: "Success!",
        description: `Home "${createForm.name}" created successfully!`,
      });

      setCreateForm({ name: '', address: '' });
      setShowCreateForm(false);
      fetchUserHomes();
      onHomeSelected(homeData.id);
    } catch (error: unknown) {
      // Fix: Remove 'any' type, use 'unknown' and check for Error
      let message = 'Unknown error';
      if (error instanceof Error) {
        message = error.message;
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinHome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Find home by code
      const { data: homeData, error: homeError } = await supabase
        .from('homes')
        .select('*')
        .eq('home_code', joinCode.toUpperCase())
        .single();

      if (homeError) {
        if (homeError.code === 'PGRST116') {
          throw new Error('Home not found with this code. The home may have been deleted.');
        }
        throw new Error('Home not found with this code');
      }

      if (!homeData) {
        throw new Error('Home not found with this code. The home may have been deleted.');
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('home_members')
        .select('*')
        .eq('home_id', homeData.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        // Reactivate membership if inactive
        await supabase
          .from('home_members')
          .update({ is_active: true })
          .eq('home_id', homeData.id)
          .eq('user_id', user.id);
      } else {
        // Add as new member (not admin)
        await supabase
          .from('home_members')
          .insert({
            home_id: homeData.id,
            user_id: user.id,
            is_admin: false
          });

        // Get current user's profile for notification
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', user.id)
          .single();

        const userName = userProfile?.name || userProfile?.email || 'Someone';

        // Notify existing home members about the new member
        const { data: existingMembers } = await supabase
          .from('home_members')
          .select('user_id')
          .eq('home_id', homeData.id)
          .eq('is_active', true)
          .neq('user_id', user.id); // Don't notify the new member themselves

        if (existingMembers && existingMembers.length > 0) {
          const notificationPromises = existingMembers.map(member => 
            (supabase as any)
              .from('notifications')
              .insert({
                user_id: member.user_id,
                title: 'New Home Member',
                message: `${userName} joined your home: "${homeData.name}"`,
                type: 'system',
                read: false,
              })
          );

          await Promise.all(notificationPromises);
        }
      }

      // Update user's current home
      await supabase
        .from('profiles')
        .update({ current_home_id: homeData.id })
        .eq('id', user.id);

      toast({
        title: "Success!",
        description: `Joined home "${homeData.name}" successfully!`,
      });

      setJoinCode('');
      setShowJoinForm(false);
      fetchUserHomes();
      onHomeSelected(homeData.id);
    } catch (error: unknown) {
      // Fix: Remove 'any' type, use 'unknown' and check for Error
      let message = 'Unknown error';
      if (error instanceof Error) {
        message = error.message;
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchHome = async (homeId: string) => {
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ current_home_id: homeId })
      .eq('id', user.id);

    onHomeSelected(homeId);
    toast({
      title: "Switched!",
      description: "Current home updated successfully!",
    });
  };

  const copyHomeCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copied!",
      description: "Home code copied to clipboard",
    });
  };

  const handleEditHome = (home: Home) => {
    toast({
      title: "Coming Soon",
      description: "Edit home functionality will be available soon!",
    });
  };

  const handleShareHome = (home: Home) => {
    const shareText = `Join my home "${home.name}" using code: ${home.home_code}`;
    if (navigator.share) {
      navigator.share({
        title: `Join ${home.name}`,
        text: shareText,
      });
    } else {
      copyHomeCode(home.home_code);
      toast({
        title: "Home Code Copied",
        description: "Share this code with others to invite them to your home",
      });
    }
  };

  const handleDeleteHome = (home: Home) => {
    // This will be handled by the HomeAdmin component
    setShowAdminPanel(home.id);
  };

  const handleManageMembers = (home: Home) => {
    setShowAdminPanel(showAdminPanel === home.id ? null : home.id);
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Homes</h1>
            <p className="text-muted-foreground">Manage your shared living spaces</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="h-12 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Create New Home
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowJoinForm(!showJoinForm)}
            className="h-12 px-6 border-2 hover:bg-muted/50 transition-all duration-200"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Join Home
          </Button>
        </div>
      </div>

      {/* Create Home Form */}
      {showCreateForm && (
        <Card className="border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Plus className="h-4 w-4 text-white" />
              </div>
              Create New Home
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateHome} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="home-name" className="text-sm font-medium flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Home Name
                </Label>
                <Input
                  id="home-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Our Apartment, Student House, Family Home"
                  required
                  className="h-12 text-base border-2 focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="home-address" className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address (Optional)
                </Label>
                <Input
                  id="home-address"
                  value={createForm.address}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="e.g., 123 Main St, City, State"
                  className="h-12 text-base border-2 focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="h-12 px-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {loading ? 'Creating...' : 'Create Home'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateForm(false)} 
                  className="h-12 px-8 border-2 hover:bg-muted/50 transition-all duration-200"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Join Home Form */}
      {showJoinForm && (
        <Card className="border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-white" />
              </div>
              Join Existing Home
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinHome} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="join-code" className="text-sm font-medium flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Home Code
                </Label>
                <Input
                  id="join-code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter 8-character home code"
                  maxLength={8}
                  required
                  className="h-12 text-base border-2 focus:border-green-500 transition-colors font-mono text-center tracking-widest"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="h-12 px-8 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {loading ? 'Joining...' : 'Join Home'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowJoinForm(false)} 
                  className="h-12 px-8 border-2 hover:bg-muted/50 transition-all duration-200"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Homes Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {homes.map((home) => (
          <Card 
            key={home.id} 
            className={`group border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur shadow-xl hover:shadow-2xl transition-all duration-300 ${
              currentHomeId === home.id ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20' : ''
            }`}
          >
            <CardHeader className="pb-3 px-4 sm:px-6">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      currentHomeId === home.id 
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' 
                        : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700'
                    }`}>
                      <Home className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg font-bold truncate">{home.name}</CardTitle>
                      {home.address && (
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{home.address}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  {currentHomeId === home.id && (
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 text-xs">
                      <Crown className="h-3 w-3 mr-1" />
                      Current Home
                    </Badge>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-10 w-10 sm:h-8 sm:w-8 p-0 touch-manipulation"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 sm:w-48">
                    <DropdownMenuItem 
                      className="cursor-pointer h-12 sm:h-10"
                      onClick={() => handleEditHome(home)}
                    >
                      <Edit className="h-4 w-4 mr-3 sm:mr-2" />
                      <span className="text-sm sm:text-xs">Edit Home</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer h-12 sm:h-10"
                      onClick={() => copyHomeCode(home.home_code)}
                    >
                      <Copy className="h-4 w-4 mr-3 sm:mr-2" />
                      <span className="text-sm sm:text-xs">Copy Code</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer h-12 sm:h-10"
                      onClick={() => handleShareHome(home)}
                    >
                      <Share className="h-4 w-4 mr-3 sm:mr-2" />
                      <span className="text-sm sm:text-xs">Share Home</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="cursor-pointer h-12 sm:h-10"
                      onClick={() => handleManageMembers(home)}
                    >
                      <Users className="h-4 w-4 mr-3 sm:mr-2" />
                      <span className="text-sm sm:text-xs">Manage Members</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer text-destructive h-12 sm:h-10"
                      onClick={() => handleDeleteHome(home)}
                    >
                      <Trash2 className="h-4 w-4 mr-3 sm:mr-2" />
                      <span className="text-sm sm:text-xs">Delete Home</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
              {/* Compact Info Section */}
              <div className="flex items-center justify-between p-3 sm:p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                    <Key className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Code</p>
                    <code className="text-xs sm:text-sm font-mono font-bold truncate block">{home.home_code}</code>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-md">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium">{members[home.id]?.length || 0}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyHomeCode(home.home_code)}
                    className="h-8 w-8 sm:h-6 sm:w-6 p-0 hover:bg-muted touch-manipulation"
                  >
                    {copiedCode === home.home_code ? (
                      <Check className="h-3 w-3 sm:h-3 sm:w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3 sm:h-3 sm:w-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
                {currentHomeId !== home.id && (
                  <Button
                    variant="outline"
                    onClick={() => handleSwitchHome(home.id)}
                    className="h-12 sm:h-9 border-2 hover:bg-muted/50 transition-all duration-200 text-sm touch-manipulation"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    <span className="sm:hidden">Switch to This Home</span>
                    <span className="hidden sm:inline">Switch Home</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleManageMembers(home)}
                  className="h-12 sm:h-9 px-4 sm:px-3 border-2 hover:bg-muted/50 transition-all duration-200 touch-manipulation"
                >
                  <Settings className="h-4 w-4 mr-2 sm:mr-0" />
                  <span className="sm:hidden">Manage Members</span>
                </Button>
              </div>

              {/* Admin Panel (Collapsible) */}
              {showAdminPanel === home.id && members[home.id] && (
                <div className="pt-4 border-t border-border/50">
                  <HomeAdmin
                    homeId={home.id}
                    homeName={home.name}
                    members={members[home.id]}
                    currentUserId={user.id}
                    onMembershipChange={() => refreshHomeMembers(home.id)}
                    onHomeDeleted={fetchUserHomes}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {homes.length === 0 && (
        <Card className="border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur shadow-xl">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center mx-auto mb-6">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-3">No homes yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create a new home or join an existing one to start tracking expenses with your housemates
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => setShowCreateForm(true)}
                className="h-12 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Create Your First Home
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowJoinForm(true)}
                className="h-12 px-6 border-2 hover:bg-muted/50 transition-all duration-200"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Join Existing Home
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Home, Plus, Users, Copy, Check } from 'lucide-react';
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
  
  const [createForm, setCreateForm] = useState({
    name: '',
    address: ''
  });
  
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (user) {
      fetchUserHomes();
    }
  }, [user, currentHomeId]);

  const fetchUserHomes = async () => {
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
  };

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

      if (homeError) throw new Error('Home not found with this code');

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Home className="h-5 w-5" />
          Your Homes
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowJoinForm(!showJoinForm)}
          >
            Join Home
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Home
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Home</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateHome} className="space-y-4">
              <div>
                <Label htmlFor="home-name">Home Name</Label>
                <Input
                  id="home-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Our Apartment"
                  required
                />
              </div>
              <div>
                <Label htmlFor="home-address">Address (Optional)</Label>
                <Input
                  id="home-address"
                  value={createForm.address}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="e.g., 123 Main St, City"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Home'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showJoinForm && (
        <Card>
          <CardHeader>
            <CardTitle>Join Existing Home</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinHome} className="space-y-4">
              <div>
                <Label htmlFor="join-code">Home Code</Label>
                <Input
                  id="join-code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter 8-character home code"
                  maxLength={8}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Joining...' : 'Join Home'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowJoinForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {homes.map((home) => (
          <Card key={home.id} className={`transition-all ${currentHomeId === home.id ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{home.name}</CardTitle>
                {currentHomeId === home.id && (
                  <Badge variant="default">Current</Badge>
                )}
              </div>
              {home.address && (
                <p className="text-sm text-muted-foreground">{home.address}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm">{home.home_code}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyHomeCode(home.home_code)}
                  >
                    {copiedCode === home.home_code ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                {currentHomeId !== home.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSwitchHome(home.id)}
                  >
                    Switch
                  </Button>
                )}
              </div>

              {/* Admin Section */}
              {members[home.id] && user && (
                <HomeAdmin
                  homeId={home.id}
                  members={members[home.id]}
                  currentUserId={user.id}
                  onMembershipChange={fetchUserHomes}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {homes.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No homes yet</h3>
            <p className="text-muted-foreground mb-4">
              Create a new home or join an existing one to start tracking expenses
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { User, Settings, Upload, Edit } from 'lucide-react';
import { isEmailInUse } from '@/lib/auth';

interface UserProfileProps {
  profile: any;
  onProfileUpdate: () => void;
}

export const UserProfile = ({ profile, onProfileUpdate }: UserProfileProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch current profile data when dialog opens
  useEffect(() => {
    if (isOpen && user) {
      fetchCurrentProfile();
    }
  }, [isOpen, user]);

  const fetchCurrentProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setCurrentProfile(data);
      setFormData({
        name: data?.name || '',
        username: data?.username || '',
        email: user?.email || '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update profile in profiles table
      const updates: any = {};
      if (formData.name !== currentProfile?.name) updates.name = formData.name;
      if (formData.username !== currentProfile?.username) updates.username = formData.username;

      if (Object.keys(updates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user?.id);
        
        if (profileError) throw profileError;
      }

      // Update email if changed
      if (formData.email !== user?.email) {
        // Check if new email is already in use
        const emailExists = await isEmailInUse(formData.email);
        if (emailExists) {
          throw new Error('This email is already registered. Please use a different email.');
        }

        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });
        
        if (emailError) throw emailError;
        
        toast({
          title: "Email update requested",
          description: "Please check your new email for confirmation.",
        });
      }

      // Update password if provided
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error("New passwords don't match");
        }
        
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.newPassword
        });
        
        if (passwordError) throw passwordError;
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      
      onProfileUpdate();
      setIsOpen(false);
      setFormData({ ...formData, newPassword: '', confirmPassword: '' });
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update profile with avatar URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully.",
      });

      onProfileUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:scale-105 transition-transform">
          <Avatar className="h-9 w-9 sm:h-10 sm:w-10 ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
            <AvatarImage src={profile?.avatar_url} alt={profile?.name || 'User'} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
              {profile?.name ? getInitials(profile.name) : <User className="h-4 w-4 sm:h-5 sm:w-5" />}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
            <Edit className="h-2 w-2 sm:h-3 sm:w-3" />
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            Profile Settings
          </DialogTitle>
          <DialogDescription className="text-sm">
            Update your profile information and preferences
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-primary/20">
                <AvatarImage src={currentProfile?.avatar_url} alt={currentProfile?.name || 'User'} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xl sm:text-2xl">
                  {currentProfile?.name ? getInitials(currentProfile.name) : <User className="h-8 w-8 sm:h-10 sm:w-10" />}
                </AvatarFallback>
              </Avatar>
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90 cursor-pointer transition-colors">
                <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>
            {uploadingAvatar && (
              <div className="text-xs sm:text-sm text-muted-foreground">Uploading...</div>
            )}
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Display Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="transition-all focus:ring-2 focus:ring-primary/20 h-11 sm:h-10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Choose a unique username"
                className="transition-all focus:ring-2 focus:ring-primary/20 h-11 sm:h-10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="transition-all focus:ring-2 focus:ring-primary/20 h-11 sm:h-10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium">New Password (optional)</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="Leave blank to keep current password"
                className="transition-all focus:ring-2 focus:ring-primary/20 h-11 sm:h-10"
              />
            </div>
            
            {formData.newPassword && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  className="transition-all focus:ring-2 focus:ring-primary/20 h-11 sm:h-10"
                />
              </div>
            )}
          </div>
          
          <Button type="submit" className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all h-11 sm:h-10" disabled={loading || uploadingAvatar}>
            {loading ? 'Updating...' : 'Update Profile'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

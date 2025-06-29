import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { User, Edit3, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserProfileProps {
  profile: any;
  onProfileUpdate: () => void;
}

export const UserProfile = ({ profile, onProfileUpdate }: UserProfileProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Check if mobile on mount and resize
  useState(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  });

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          email: formData.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });

      onProfileUpdate();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile?.name || '',
      email: profile?.email || '',
    });
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const ProfileContent = () => (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex flex-col items-center space-y-4">
        <div className={`relative ${
          isMobile ? 'h-24 w-24' : 'h-20 w-20'
        }`}>
          <Avatar className={`${
            isMobile ? 'h-24 w-24' : 'h-20 w-20'
          }`}>
            <AvatarImage src={profile?.avatar_url} alt={profile?.name} />
            <AvatarFallback className={`${
              isMobile ? 'text-2xl' : 'text-lg'
            } bg-primary text-primary-foreground`}>
              {profile?.name ? getInitials(profile.name) : <User className={`${
                isMobile ? 'h-8 w-8' : 'h-6 w-6'
              }`} />}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="text-center">
          <h3 className={`font-semibold ${
            isMobile ? 'text-xl' : 'text-lg'
          }`}>
            {profile?.name || 'User'}
          </h3>
          <p className={`text-muted-foreground ${
            isMobile ? 'text-base' : 'text-sm'
          }`}>
            {profile?.email || 'user@example.com'}
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className={`${
            isMobile ? 'text-base' : 'text-sm'
          }`}>
            Name
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            disabled={!isEditing || isLoading}
            className={`${
              isMobile ? 'h-12 text-base' : 'h-10 text-sm'
            }`}
            placeholder="Enter your name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className={`${
            isMobile ? 'text-base' : 'text-sm'
          }`}>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            disabled={!isEditing || isLoading}
            className={`${
              isMobile ? 'h-12 text-base' : 'h-10 text-sm'
            }`}
            placeholder="Enter your email"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            className={`flex-1 ${
              isMobile ? 'h-12 text-base' : 'h-10 text-sm'
            }`}
          >
            <Edit3 className={`mr-2 ${
              isMobile ? 'h-5 w-5' : 'h-4 w-4'
            }`} />
            Edit Profile
          </Button>
        ) : (
          <>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className={`flex-1 ${
                isMobile ? 'h-12 text-base' : 'h-10 text-sm'
              }`}
            >
              <Save className={`mr-2 ${
                isMobile ? 'h-5 w-5' : 'h-4 w-4'
              }`} />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className={`flex-1 ${
                isMobile ? 'h-12 text-base' : 'h-10 text-sm'
              }`}
            >
              <X className={`mr-2 ${
                isMobile ? 'h-5 w-5' : 'h-4 w-4'
              }`} />
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className={`relative p-0 ${
            isMobile ? 'h-12 w-12' : 'h-9 w-9'
          }`}
        >
          <Avatar className={`${
            isMobile ? 'h-12 w-12' : 'h-9 w-9'
          }`}>
            <AvatarImage src={profile?.avatar_url} alt={profile?.name} />
            <AvatarFallback className={`${
              isMobile ? 'text-sm' : 'text-xs'
            } bg-primary text-primary-foreground`}>
              {profile?.name ? getInitials(profile.name) : <User className={`${
                isMobile ? 'h-4 w-4' : 'h-3 w-3'
              }`} />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DialogTrigger>
      <DialogContent className={`${
        isMobile ? 'w-full max-w-md mx-4' : 'w-full max-w-md'
      }`}>
        <DialogHeader>
          <DialogTitle className={`${
            isMobile ? 'text-xl' : 'text-lg'
          }`}>
            Profile Settings
          </DialogTitle>
        </DialogHeader>
        <ProfileContent />
      </DialogContent>
    </Dialog>
  );
};

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Shield, UserX } from 'lucide-react';
import { AdminTransfer } from './AdminTransfer';

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

interface HomeAdminProps {
  homeId: string;
  members: HomeMember[];
  currentUserId: string;
  onMembershipChange: () => void;
}

export const HomeAdmin = ({ homeId, members, currentUserId, onMembershipChange }: HomeAdminProps) => {
  const [removingMember, setRemovingMember] = useState<HomeMember | null>(null);
  const currentUserIsAdmin = members.some(m => m.user_id === currentUserId && m.is_admin);

  const handleRemoveMember = async () => {
    if (!removingMember) return;

    try {
      const { error } = await supabase
        .from('home_members')
        .update({ is_active: false })
        .eq('home_id', homeId)
        .eq('user_id', removingMember.user_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${removingMember.profile.name} has been removed from the home`,
      });

      onMembershipChange();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRemovingMember(null);
    }
  };

  if (!currentUserIsAdmin) {
    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Members:</h4>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <span>{member.profile.name}</span>
                {member.is_admin && (
                  <Shield className="h-3 w-3 text-primary" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium mb-2">Manage Members:</h4>
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <span>{member.profile.name}</span>
              {member.is_admin && (
                <Shield className="h-3 w-3 text-primary" />
              )}
            </div>
            {currentUserId !== member.user_id && (
              <div className="flex items-center gap-2">
                {!member.is_admin && currentUserIsAdmin && (
                  <AdminTransfer
                    homeId={homeId}
                    member={member}
                    onTransferComplete={onMembershipChange}
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRemovingMember(member)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <UserX className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removingMember?.profile.name} from this home?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}; 
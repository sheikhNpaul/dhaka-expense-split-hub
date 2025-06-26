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
import { Shield, UserX, Trash2 } from 'lucide-react';
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
  homeName: string;
  members: HomeMember[];
  currentUserId: string;
  onMembershipChange: () => void;
  onHomeDeleted: () => void;
}

export const HomeAdmin = ({ homeId, homeName, members, currentUserId, onMembershipChange, onHomeDeleted }: HomeAdminProps) => {
  const [removingMember, setRemovingMember] = useState<HomeMember | null>(null);
  const [showDeleteHomeDialog, setShowDeleteHomeDialog] = useState(false);
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

  const handleDeleteHome = async () => {
    try {
      // First, delete all expense comments for this home
      const { error: commentsError } = await supabase
        .from('expense_comments')
        .delete()
        .eq('expense_id', (await supabase
          .from('expenses')
          .select('id')
          .eq('home_id', homeId)
        ).data?.map(e => e.id) || []);

      if (commentsError) {
        console.error('Error deleting comments:', commentsError);
        // Continue with deletion even if comments fail
      }

      // Delete all expenses for this home
      const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('home_id', homeId);

      if (expensesError) {
        console.error('Error deleting expenses:', expensesError);
        throw expensesError;
      }

      // Delete all payment requests for this home
      const { error: paymentsError } = await supabase
        .from('payment_requests')
        .delete()
        .eq('home_id', homeId);

      if (paymentsError) {
        console.error('Error deleting payments:', paymentsError);
        throw paymentsError;
      }

      // Update users who have this home as their current home
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ current_home_id: null })
        .eq('current_home_id', homeId);

      if (profileError) {
        console.error('Error updating profiles:', profileError);
        throw profileError;
      }

      // Delete all home member associations
      const { error: membersError } = await supabase
        .from('home_members')
        .delete()
        .eq('home_id', homeId);

      if (membersError) {
        console.error('Error deleting members:', membersError);
        throw membersError;
      }

      // Finally, delete the home itself
      const { error: homeError } = await supabase
        .from('homes')
        .delete()
        .eq('id', homeId);

      if (homeError) {
        console.error('Error deleting home:', homeError);
        throw homeError;
      }

      // Verify the home is actually deleted
      const { data: verifyHome } = await supabase
        .from('homes')
        .select('id')
        .eq('id', homeId)
        .single();

      if (verifyHome) {
        throw new Error('Home deletion failed - home still exists in database');
      }

      toast({
        title: "Success",
        description: `Home "${homeName}" has been permanently deleted`,
      });

      onHomeDeleted();
    } catch (error: any) {
      console.error('Home deletion error:', error);
      toast({
        title: "Error",
        description: `Failed to delete home: ${error.message}`,
        variant: "destructive",
      });
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

      {/* Delete Home Section */}
      <div className="mt-6 pt-4 border-t border-border">
        <h4 className="text-sm font-medium mb-3 text-destructive">Danger Zone</h4>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteHomeDialog(true)}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete Home
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          This will permanently delete the home and all associated expenses, payments, and member data.
        </p>
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

      <AlertDialog open={showDeleteHomeDialog} onOpenChange={setShowDeleteHomeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Home</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{homeName}"? This action will permanently remove:
              <br /><br />
              • All expenses and payment records<br />
              • All member associations<br />
              • All balance calculations<br />
              • The home itself<br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHome}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Home
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}; 
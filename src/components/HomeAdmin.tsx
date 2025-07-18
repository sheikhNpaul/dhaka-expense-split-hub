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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  UserX, 
  Trash2, 
  Users, 
  Crown, 
  User, 
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
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
      // First, get all expense IDs for this home
      const { data: expenses } = await supabase
        .from('expenses')
        .select('id')
        .eq('home_id', homeId);

      // Delete all expense comments for this home
      if (expenses && expenses.length > 0) {
        const expenseIds = expenses.map(e => e.id);
        const { error: commentsError } = await supabase
          .from('expense_comments')
          .delete()
          .in('expense_id', expenseIds);

        if (commentsError) {
          console.error('Error deleting comments:', commentsError);
          // Continue with deletion even if comments fail
        }
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
      <Card className="border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur shadow-lg">
        <CardHeader className="pb-3 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="grid gap-2 sm:gap-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-lg border border-border/50"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.profile.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.profile.email}</p>
                  </div>
                </div>
                {member.is_admin && (
                  <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Members Management */}
      <Card className="border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur shadow-lg">
        <CardHeader className="pb-3 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
            </div>
            Manage Members ({members.length})
          </CardTitle>
        </CardHeader>
        
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="grid gap-3 sm:gap-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.profile.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.profile.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {member.is_admin && (
                    <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 text-xs">
                      <Crown className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                  
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
                        className="h-10 w-10 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-0 bg-gradient-to-br from-destructive/5 to-destructive/10 dark:from-destructive/10 dark:to-destructive/20 backdrop-blur shadow-lg">
        <CardHeader className="pb-3 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-destructive">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center">
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive-foreground" />
            </div>
            Danger Zone
          </CardTitle>
        </CardHeader>
        
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="p-3 sm:p-4 bg-destructive/5 dark:bg-destructive/10 rounded-lg border border-destructive/20 dark:border-destructive/30">
              <div className="flex items-start gap-2 sm:gap-3">
                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-destructive mb-1 text-sm sm:text-base">Delete Home</h4>
                  <p className="text-xs sm:text-sm text-destructive/80 dark:text-destructive/70 mb-3">
                    This will permanently delete "{homeName}" and all associated data including expenses, payments, and member records.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteHomeDialog(true)}
                    className="bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive text-destructive-foreground shadow-lg h-10 sm:h-9 touch-manipulation"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Home
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remove Member Dialog */}
      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <UserX className="h-6 w-6 text-white" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold">Remove Member</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  Are you sure you want to remove this member?
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          
          {removingMember && (
            <div className="p-4 bg-muted/50 rounded-xl mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">{removingMember.profile.name}</p>
                  <p className="text-sm text-muted-foreground">{removingMember.profile.email}</p>
                </div>
              </div>
            </div>
          )}
          
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="h-10 border-2 hover:bg-muted/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="h-10 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg"
            >
              <UserX className="h-4 w-4 mr-2" />
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Home Dialog */}
      <AlertDialog open={showDeleteHomeDialog} onOpenChange={setShowDeleteHomeDialog}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold">Delete Home</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  This action cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-red-100/50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">"{homeName}" will be permanently deleted</h4>
              <div className="space-y-2 text-sm text-red-700 dark:text-red-300">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  All expenses and payment records
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  All member associations
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  All balance calculations
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  The home itself
                </div>
              </div>
            </div>
          </div>
          
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="h-10 border-2 hover:bg-muted/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHome}
              className="h-10 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Home
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}; 
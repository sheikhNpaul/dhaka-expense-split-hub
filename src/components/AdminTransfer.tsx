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
import { useToast } from '@/hooks/use-toast';
import { Shield, Crown, User, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AdminTransferProps {
  homeId: string;
  member: {
    user_id: string;
    profile: {
      name: string;
      email: string;
    };
  };
  onTransferComplete: () => void;
}

export const AdminTransfer = ({ homeId, member, onTransferComplete }: AdminTransferProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransfer = async () => {
    if (!user) return;
    
    setIsTransferring(true);
    try {
      // Remove admin rights from current user
      const { error: removeError } = await supabase
        .from('home_members')
        .update({ is_admin: false })
        .eq('home_id', homeId)
        .eq('user_id', user.id);

      if (removeError) throw removeError;

      // Grant admin rights to the new user
      const { error: grantError } = await supabase
        .from('home_members')
        .update({ is_admin: true })
        .eq('home_id', homeId)
        .eq('user_id', member.user_id);

      if (grantError) throw grantError;

      toast({
        title: "Success",
        description: `Admin rights transferred to ${member.profile.name}`,
      });
      
      // Call immediately without delay
      onTransferComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
      setShowDialog(false);
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-10 sm:h-8 sm:w-8 p-0 border-2 hover:bg-muted/50 transition-all duration-200 touch-manipulation"
        >
          <Crown className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">Make Admin</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Transfer admin privileges to {member.profile.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-6">
          <div className="p-3 sm:p-4 bg-yellow-50/50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1 text-sm sm:text-base">Admin Transfer</h4>
                <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                  This will transfer all admin privileges to {member.profile.name}. You will lose admin access to this home.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="h-12 sm:h-9 border-2 hover:bg-muted/50 transition-all duration-200 touch-manipulation"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={isTransferring}
              className="h-12 sm:h-9 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg touch-manipulation"
            >
              {isTransferring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Make Admin
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 
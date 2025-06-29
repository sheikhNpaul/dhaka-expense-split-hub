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
import { Shield, Crown, User } from 'lucide-react';

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
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleTransfer = async () => {
    if (!user) return;
    
    setIsLoading(true);
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
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 px-3 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800 transition-all duration-200"
      >
        <Shield className="h-3 w-3 mr-1" />
        <span className="text-xs">Make Admin</span>
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold">Transfer Admin Rights</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  Are you sure you want to transfer your admin rights?
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          
          <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl mb-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">{member.profile.name}</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">{member.profile.email}</p>
              </div>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">
              You will no longer be an admin after this action.
            </p>
          </div>
          
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel disabled={isLoading} className="h-10 border-2 hover:bg-muted/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransfer}
              disabled={isLoading}
              className="h-10 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
            >
              {isLoading ? "Transferring..." : "Transfer Admin Rights"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}; 
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
import { Shield } from 'lucide-react';

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
        className="flex items-center gap-2 h-10 sm:h-9"
      >
        <Shield className="h-4 w-4" />
        <span>Make Admin</span>
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">Transfer Admin Rights</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to transfer your admin rights to {member.profile.name}? 
              You will no longer be an admin after this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={isLoading} className="h-10 sm:h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransfer}
              disabled={isLoading}
              className="bg-primary h-10 sm:h-9"
            >
              {isLoading ? "Transferring..." : "Transfer Admin Rights"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}; 
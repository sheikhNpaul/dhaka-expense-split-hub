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
      const { data, error } = await supabase.rpc('transfer_admin_rights', {
        home_id_param: homeId,
        from_user_id: user.id,
        to_user_id: member.user_id
      });

      if (error) throw error;

      if (data) {
        toast({
          title: "Success",
          description: `Admin rights transferred to ${member.profile.name}`,
        });
        onTransferComplete();
      } else {
        toast({
          title: "Error",
          description: "Failed to transfer admin rights. You might not be an admin.",
          variant: "destructive",
        });
      }
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
        className="flex items-center gap-2"
      >
        <Shield className="h-4 w-4" />
        <span>Make Admin</span>
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer Admin Rights</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to transfer your admin rights to {member.profile.name}? 
              You will no longer be an admin after this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransfer}
              disabled={isLoading}
              className="bg-primary"
            >
              {isLoading ? "Transferring..." : "Transfer Admin Rights"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}; 
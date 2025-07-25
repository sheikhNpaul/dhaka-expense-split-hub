import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { X, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  expense_id: string;
  created_at: string;
}

interface ExpenseCommentsProps {
  expenseId: string;
  onClose: () => void;
}

export const ExpenseComments = ({ expenseId, onClose }: ExpenseCommentsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
    fetchProfiles();
    
    // Real-time subscription for new comments
    const channel = supabase
      .channel(`comments-${expenseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expense_comments',
          filter: `expense_id=eq.${expenseId}`
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [expenseId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase.rpc('get_expense_comments' as any, { 
        p_expense_id: expenseId 
      });

      if (error) {
        console.error('Error fetching comments:', error);
        return;
      }

      if (data) {
        setComments(data as Comment[]);
      }
    } catch (error) {
      console.error('Error in fetchComments:', error);
    }
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email');

    if (data) {
      const profileMap = data.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
      setProfiles(profileMap);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('insert_expense_comment' as any, {
        p_content: newComment.trim(),
        p_user_id: user.id,
        p_expense_id: expenseId,
      });

      if (error) throw error;

      setNewComment('');
      toast({
        title: "Comment added!",
        description: "Your comment has been posted.",
      });
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0 pb-4">
          <CardTitle className="text-lg sm:text-xl">Comments</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-10 w-10 sm:h-8 sm:w-8">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto px-4 sm:px-6">
          <div className="space-y-4 mb-4">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-sm sm:text-base">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="border-b pb-3 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-xs sm:text-sm">
                      {profiles[comment.user_id]?.name || profiles[comment.user_id]?.email || 'Unknown User'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700">{comment.content}</p>
                </div>
              ))
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 h-11 sm:h-10"
            />
            <Button type="submit" disabled={loading || !newComment.trim()} size="sm" className="h-11 sm:h-9">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

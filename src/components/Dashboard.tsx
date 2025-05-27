
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddExpense } from './AddExpense';
import { ExpenseList } from './ExpenseList';
import { EditExpense } from './EditExpense';
import { ExpenseComments } from './ExpenseComments';
import { BalanceDashboard } from './BalanceDashboard';
import { LogOut, Plus } from 'lucide-react';

interface Expense {
  id: string;
  title: string;
  amount: number;
  description: string;
  split_type: string;
  participants: string[];
}

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingComments, setViewingComments] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const handleExpenseAdded = () => {
    setShowAddExpense(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleExpenseUpdated = () => {
    setEditingExpense(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
  };

  const handleViewComments = (expenseId: string) => {
    setViewingComments(expenseId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Expense Tracker</h1>
              <p className="text-sm text-gray-600">
                Welcome back, {profile?.name || user?.email}!
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowAddExpense(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Expense
              </Button>
              <Button
                variant="outline"
                onClick={signOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="expenses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expenses">Recent Expenses</TabsTrigger>
            <TabsTrigger value="balances">Balance Dashboard</TabsTrigger>
          </TabsList>
          
          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <ExpenseList 
                  refreshTrigger={refreshTrigger}
                  onEditExpense={handleEditExpense}
                  onViewComments={handleViewComments}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="balances">
            <BalanceDashboard />
          </TabsContent>
        </Tabs>
      </main>

      {showAddExpense && (
        <AddExpense
          onClose={() => setShowAddExpense(false)}
          onExpenseAdded={handleExpenseAdded}
        />
      )}

      {editingExpense && (
        <EditExpense
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onExpenseUpdated={handleExpenseUpdated}
        />
      )}

      {viewingComments && (
        <ExpenseComments
          expenseId={viewingComments}
          onClose={() => setViewingComments(null)}
        />
      )}
    </div>
  );
};

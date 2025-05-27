
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddExpense } from './AddExpense';
import { ExpenseList } from './ExpenseList';
import { LogOut, Plus } from 'lucide-react';

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [profile, setProfile] = useState<any>(null);

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
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpenseList />
            </CardContent>
          </Card>
        </div>
      </main>

      {showAddExpense && (
        <AddExpense
          onClose={() => setShowAddExpense(false)}
          onExpenseAdded={() => setShowAddExpense(false)}
        />
      )}
    </div>
  );
};

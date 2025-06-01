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
import { UserProfile } from './UserProfile';
import { HomeManager } from './HomeManager';
import { LogOut, Plus, Receipt, TrendingUp, Home } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { PaymentRequests } from '@/components/PaymentRequests';

interface Expense {
  id: string;
  title: string;
  amount: number;
  description: string;
  split_type: string;
  participants: string[];
  home_id: string;
}

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingComments, setViewingComments] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentHomeId, setCurrentHomeId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

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
      setCurrentHomeId(data.current_home_id);
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

  const handleProfileUpdate = () => {
    fetchProfile();
  };

  const handleHomeSelected = (homeId: string) => {
    setCurrentHomeId(homeId);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent truncate">
                Expense Tracker
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                Welcome back, {profile?.name || user?.email}!
              </p>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
              {currentHomeId && (
                <Button
                  onClick={() => setShowAddExpense(true)}
                  size="sm"
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Expense</span>
                </Button>
              )}
              
              <UserProfile profile={profile} onProfileUpdate={handleProfileUpdate} />
              
              <Button
                variant="outline"
                onClick={signOut}
                size="sm"
                className="hover:bg-destructive hover:text-destructive-foreground transition-all flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <Tabs defaultValue="homes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50 backdrop-blur-sm p-1 rounded-xl">
            <TabsTrigger 
              value="homes" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all rounded-lg"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Homes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="expenses" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all rounded-lg disabled:opacity-50"
              disabled={!currentHomeId}
            >
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Expenses</span>
            </TabsTrigger>
            <TabsTrigger 
              value="balances"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all rounded-lg disabled:opacity-50"
              disabled={!currentHomeId}
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Balances</span>
            </TabsTrigger>
            <TabsTrigger 
              value="payments"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all rounded-lg disabled:opacity-50"
              disabled={!currentHomeId}
            >
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="homes" className="space-y-6">
            <Card className="border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <Home className="h-5 w-5 text-primary" />
                  Home Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HomeManager 
                  onHomeSelected={handleHomeSelected}
                  currentHomeId={currentHomeId || undefined}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="expenses" className="space-y-6">
            {currentHomeId ? (
              <>
                <Card className="border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur shadow-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between gap-2 text-lg md:text-xl">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-primary" />
                        Expenses for {format(selectedMonth, 'MMMM yyyy')}
                      </div>
                      <Button
                        onClick={() => setShowAddExpense(true)}
                        size="sm"
                        className="ml-auto"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Expense
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ExpenseList 
                      refreshTrigger={refreshTrigger}
                      onEditExpense={handleEditExpense}
                      onViewComments={handleViewComments}
                      currentHomeId={currentHomeId}
                      selectedMonth={selectedMonth}
                      onMonthChange={setSelectedMonth}
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">Please select a home first to view expenses</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="balances" className="space-y-6">
            {currentHomeId ? (
              <BalanceDashboard currentHomeId={currentHomeId} />
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">Please select a home first to view balances</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="payments" className="space-y-6">
            {currentHomeId ? (
              <PaymentRequests currentHomeId={currentHomeId} />
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">Please select a home first to view payment requests</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      {showAddExpense && currentHomeId && (
        <AddExpense
          onClose={() => setShowAddExpense(false)}
          onExpenseAdded={handleExpenseAdded}
          currentHomeId={currentHomeId}
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

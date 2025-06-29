import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddExpense } from './AddExpense';
import { ExpenseList } from './ExpenseList';
import { EditExpense } from './EditExpense';
import { ExpenseComments } from './ExpenseComments';
import { BalanceDashboard } from './BalanceDashboard';
import { UserProfile } from './UserProfile';
import { HomeManager } from './HomeManager';
import { MealPlanner } from './MealPlanner';
import { NotionSidebar } from './NotionSidebar';
import { startOfMonth, endOfMonth, format, addMonths, subMonths } from 'date-fns';
import { PaymentRequests } from '@/components/PaymentRequests';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingComments, setViewingComments] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentHomeId, setCurrentHomeId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [isMobile, setIsMobile] = useState(false);

  // Get current tab from URL search params or default to 'expenses'
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'expenses';

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setSelectedMonth(prev => {
      const newDate = direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1);
      return startOfMonth(newDate);
    });
    setRefreshTrigger(prev => prev + 1);
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'homes':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Homes</h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Manage your shared living spaces and members
                </p>
              </div>
            </div>
            <HomeManager 
              onHomeSelected={handleHomeSelected}
              currentHomeId={currentHomeId}
            />
          </div>
        );

      case 'expenses':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Expenses</h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Track and manage shared expenses
                </p>
              </div>
              {currentHomeId && (
                <Button onClick={() => setShowAddExpense(true)} className="w-full sm:w-auto">
                  Add Expense
                </Button>
              )}
            </div>
            
            {currentHomeId && (
              <div className="flex items-center justify-center sm:justify-start space-x-4 mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMonthChange('prev')}
                  className="h-10 w-10 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center space-x-2 min-w-0">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base truncate">
                    {format(selectedMonth, 'MMMM yyyy')}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMonthChange('next')}
                  className="h-10 w-10 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <ExpenseList
              currentHomeId={currentHomeId}
              selectedMonth={selectedMonth}
              onEditExpense={handleEditExpense}
              onViewComments={handleViewComments}
              refreshTrigger={refreshTrigger}
              onMonthChange={setSelectedMonth}
            />
          </div>
        );

      case 'meals':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Meal Planner</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Plan and track shared meals
              </p>
            </div>
            <MealPlanner currentHomeId={currentHomeId} selectedMonth={selectedMonth} />
          </div>
        );

      case 'balances':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Balances</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                View expense balances and settlements
              </p>
            </div>
            <BalanceDashboard 
              currentHomeId={currentHomeId}
              selectedMonth={selectedMonth}
              refreshTrigger={refreshTrigger}
            />
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payments</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Manage payment requests and settlements
              </p>
            </div>
            <PaymentRequests 
              currentHomeId={currentHomeId}
              selectedMonth={selectedMonth}
              onPaymentStatusChange={() => setRefreshTrigger(prev => prev + 1)}
            />
          </div>
        );

      default:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Welcome to your expense tracker
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <NotionSidebar
        profile={profile}
        onProfileUpdate={handleProfileUpdate}
        onAddExpense={() => setShowAddExpense(true)}
        currentHomeId={currentHomeId}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${isMobile ? 'ml-0' : 'ml-64'}`}>
        {/* Top Bar */}
        <div className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-full items-center px-4 sm:px-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold capitalize">
                {currentTab === 'homes' && 'Homes'}
                {currentTab === 'expenses' && 'Expenses'}
                {currentTab === 'meals' && 'Meal Planner'}
                {currentTab === 'balances' && 'Balances'}
                {currentTab === 'payments' && 'Payments'}
              </h2>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddExpense && (
        <AddExpense
          currentHomeId={currentHomeId}
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

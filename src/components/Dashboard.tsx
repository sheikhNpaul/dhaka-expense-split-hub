import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpenseList } from './ExpenseList';
import { ExpenseComments } from './ExpenseComments';
import { BalanceDashboard } from './BalanceDashboard';
import { UserProfile } from './UserProfile';
import { HomeManager } from './HomeManager';
import { MealPlanner } from './MealPlanner';
import { NotionSidebar } from './NotionSidebar';
import { startOfMonth, endOfMonth, format, addMonths, subMonths } from 'date-fns';
import { PaymentRequests } from '@/components/PaymentRequests';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpenseForm } from './ExpenseForm';
import { Messages } from './Messages';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [currentHomeId, setCurrentHomeId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingComments, setViewingComments] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const currentTab = searchParams.get('tab') || 'expenses';

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarCollapsed(true);
      }
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

  const handleOpenAddExpense = () => {
    setShowAddExpense(true);
    setEditingExpense(null);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowAddExpense(false);
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

  const handleSidebarToggle = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'homes':
        return (
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="hidden sm:block">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Homes</h1>
                <p className="text-muted-foreground text-base sm:text-lg mt-2">
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
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="hidden sm:block">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Expenses</h1>
                <p className="text-muted-foreground text-base sm:text-lg mt-2">
                  Track and manage shared expenses
                </p>
              </div>
              {currentHomeId && (
                <Button 
                  onClick={handleOpenAddExpense} 
                  className="w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm px-6"
                >
                  Add Expense
                </Button>
              )}
            </div>
            
            {currentHomeId && (
              <div className="flex items-center justify-center sm:justify-start space-x-4 mb-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMonthChange('prev')}
                  className="h-12 w-12 p-0 rounded-xl"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center space-x-3 min-w-0 bg-muted/50 rounded-xl px-4 py-2">
                  <Calendar className="h-5 w-5 flex-shrink-0" />
                  <span className="font-semibold text-base sm:text-lg truncate">
                    {format(selectedMonth, 'MMMM yyyy')}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMonthChange('next')}
                  className="h-12 w-12 p-0 rounded-xl"
                >
                  <ChevronRight className="h-5 w-5" />
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
          <div className="space-y-6 sm:space-y-8">
            <div className="hidden sm:block">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Meal Planner</h1>
              <p className="text-muted-foreground text-base sm:text-lg mt-2">
                Plan and track shared meals
              </p>
            </div>
            <MealPlanner 
              currentHomeId={currentHomeId} 
              selectedMonth={selectedMonth} 
              onMonthChange={setSelectedMonth}
            />
          </div>
        );

      case 'balances':
        return (
          <div className="space-y-6 sm:space-y-8">
            <div className="hidden sm:block">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Balances</h1>
              <p className="text-muted-foreground text-base sm:text-lg mt-2">
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
          <div className="space-y-6 sm:space-y-8">
            <div className="hidden sm:block">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Payments</h1>
              <p className="text-muted-foreground text-base sm:text-lg mt-2">
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

      case 'messages':
        return <Messages currentHomeId={currentHomeId || ''} />;

      default:
        return (
          <div className="space-y-6 sm:space-y-8">
            <div className="hidden sm:block">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground text-base sm:text-lg mt-2">
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
        onSidebarToggle={handleSidebarToggle}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        isMobile ? 'ml-0' : isSidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        {/* Top Bar */}
        <div className={`border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${
          isMobile ? 'h-20' : 'h-16'
        }`}>
          <div className={`flex h-full items-center ${
            isMobile ? 'px-6' : 'px-6'
          } justify-start`}>
            <div className="flex items-center space-x-4">
              <h2 className={`font-semibold capitalize ${
                isMobile ? 'text-lg text-left' : 'text-lg'
              }`}>
                {currentTab === 'homes' && 'Homes'}
                {currentTab === 'expenses' && 'Expenses'}
                {currentTab === 'meals' && 'Meal Planner'}
                {currentTab === 'balances' && 'Balances'}
                {currentTab === 'payments' && 'Payments'}
                {currentTab === 'messages' && 'Messages'}
              </h2>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {currentTab === 'messages' ? (
            <div className="h-full">
              {renderContent()}
            </div>
          ) : (
            <div className={`container mx-auto max-w-7xl ${
              isMobile ? 'p-4' : 'p-6'
            }`}>
              {renderContent()}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {(showAddExpense || editingExpense) && (
        <div
          className={`fixed top-0 right-0 z-50 h-full bg-background shadow-lg transition-all duration-300 flex flex-col
            ${isMobile ? 'w-full max-w-full' : 'w-[420px] max-w-full'}
          `}
          style={{ boxShadow: '0 0 24px 0 rgba(0,0,0,0.12)' }}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <button
              onClick={() => {
                setShowAddExpense(false);
                setEditingExpense(null);
              }}
              className="text-muted-foreground hover:text-primary focus:outline-none"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <span className="font-semibold text-lg">
              {showAddExpense ? 'Add Expense' : 'Edit Expense'}
            </span>
            <div style={{ width: 24 }} /> {/* Spacer for symmetry */}
          </div>
          <div className="flex-1 overflow-y-auto">
            {showAddExpense && (
              <ExpenseForm
                mode="add"
                currentHomeId={currentHomeId}
                onClose={() => setShowAddExpense(false)}
                onSuccess={handleExpenseAdded}
              />
            )}
            {editingExpense && (
              <ExpenseForm
                mode="edit"
                currentHomeId={currentHomeId}
                initialValues={editingExpense}
                onClose={() => setEditingExpense(null)}
                onSuccess={handleExpenseUpdated}
              />
            )}
          </div>
        </div>
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

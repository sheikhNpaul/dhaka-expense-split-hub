import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';
import { UserProfile } from './UserProfile';
import { 
  Home, 
  Receipt, 
  TrendingUp, 
  Utensils, 
  Plus, 
  LogOut,
  Menu,
  X,
  Settings,
  Users,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface NotionSidebarProps {
  profile: any;
  onProfileUpdate: () => void;
  onAddExpense: () => void;
  currentHomeId: string | null;
}

export const NotionSidebar = ({ 
  profile, 
  onProfileUpdate, 
  onAddExpense, 
  currentHomeId 
}: NotionSidebarProps) => {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Get current tab from URL search params or default to 'expenses'
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'expenses';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(location.search);
    params.set('tab', value);
    navigate(`/app?${params.toString()}`);
  };

  const navigationItems = [
    {
      id: 'homes',
      label: 'Homes',
      icon: Home,
      disabled: false,
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: Receipt,
      disabled: !currentHomeId,
    },
    {
      id: 'meals',
      label: 'Meals',
      icon: Utensils,
      disabled: !currentHomeId,
    },
    {
      id: 'balances',
      label: 'Balances',
      icon: TrendingUp,
      disabled: !currentHomeId,
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: BarChart3,
      disabled: !currentHomeId,
    },
  ];

  return (
    <div className={`fixed left-0 top-0 z-50 h-full bg-card border-r border-border transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">ET</span>
              </div>
              <div>
                <h1 className="font-semibold text-sm">Expense Tracker</h1>
                <p className="text-xs text-muted-foreground">Manage expenses</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={currentTab === item.id ? "secondary" : "ghost"}
                  className={`w-full justify-start h-10 px-3 ${
                    currentTab === item.id 
                      ? "bg-secondary text-secondary-foreground" 
                      : "hover:bg-accent hover:text-accent-foreground"
                  } ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => !item.disabled && handleTabChange(item.id)}
                  disabled={item.disabled}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {!isCollapsed && <span className="text-sm">{item.label}</span>}
                </Button>
              );
            })}
          </div>

          {/* Quick Actions */}
          {!isCollapsed && currentHomeId && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-xs font-medium text-muted-foreground mb-3 px-3">
                Quick Actions
              </h3>
              <Button
                onClick={onAddExpense}
                className="w-full justify-start h-10 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-3" />
                <span className="text-sm">Add Expense</span>
              </Button>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border p-4 space-y-3">
          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <UserProfile profile={profile} onProfileUpdate={onProfileUpdate} />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile?.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile?.email || 'user@example.com'}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <NotificationBell />
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="flex-1 justify-start h-9 px-3 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="text-sm">Sign Out</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
  onSidebarToggle?: (collapsed: boolean) => void;
}

export const NotionSidebar = ({ 
  profile, 
  onProfileUpdate, 
  onAddExpense, 
  currentHomeId,
  onSidebarToggle
}: NotionSidebarProps) => {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get current tab from URL search params or default to 'expenses'
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'expenses';

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Notify parent component of sidebar state changes
  useEffect(() => {
    if (onSidebarToggle) {
      onSidebarToggle(isCollapsed);
    }
  }, [isCollapsed, onSidebarToggle]);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(location.search);
    params.set('tab', value);
    navigate(`/app?${params.toString()}`);
    // Close mobile menu after navigation
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleCollapseToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
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

  const SidebarContent = () => (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className={`flex items-center border-b border-border ${
        isMobile ? 'h-20 px-4 flex-row-reverse' : 'h-16 px-4 justify-between'
      }`}>
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            className="h-12 w-12 p-0 bg-background/95 backdrop-blur border border-border shadow-lg rounded-xl"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        )}
        <div className="flex-1 flex justify-center">
        {(isMobile || !isCollapsed) && (
          <div className="flex items-center space-x-3">
            <div className={`rounded-lg bg-primary flex items-center justify-center ${
              isMobile ? 'h-12 w-12' : 'h-8 w-8'
            }`}>
              <span className={`text-primary-foreground font-bold ${
                isMobile ? 'text-lg' : 'text-sm'
              }`}>ET</span>
            </div>
            <div>
              <h1 className={`font-semibold ${
                isMobile ? 'text-lg' : 'text-sm'
              }`}>Expense Tracker</h1>
              <p className={`text-muted-foreground ${
                isMobile ? 'text-sm' : 'text-xs'
              }`}>Manage expenses</p>
            </div>
          </div>
        )}
        </div>
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCollapseToggle}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className={`flex-1 px-3 py-4 ${isMobile ? 'overflow-visible' : ''}`} style={isMobile ? { maxHeight: 'none' } : {}}>
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={currentTab === item.id ? "secondary" : "ghost"}
                  className={`w-full justify-start px-3 ${
                    isMobile 
                      ? 'h-14 text-base' 
                      : 'h-10 text-sm'
                  } ${
                    currentTab === item.id 
                      ? "bg-secondary text-secondary-foreground" 
                      : "hover:bg-accent hover:text-accent-foreground"
                  } ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => !item.disabled && handleTabChange(item.id)}
                  disabled={item.disabled}
                >
                  <Icon className={`mr-3 ${
                    isMobile ? 'h-5 w-5' : 'h-4 w-4'
                  }`} />
                  {(isMobile || !isCollapsed) && <span>{item.label}</span>}
                </Button>
              );
            })}
          </div>

          {/* Quick Actions */}
          {(isMobile || !isCollapsed) && currentHomeId && (
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className={`font-medium text-muted-foreground mb-4 px-3 ${
                isMobile ? 'text-base' : 'text-xs'
              }`}>
                Quick Actions
              </h3>
              <Button
                onClick={() => {
                  onAddExpense();
                  if (isMobile) setIsMobileMenuOpen(false);
                }}
                className={`w-full justify-start px-3 bg-primary text-primary-foreground hover:bg-primary/90 ${
                  isMobile ? 'h-14 text-base' : 'h-10 text-sm'
                }`}
              >
                <Plus className={`mr-3 ${
                  isMobile ? 'h-5 w-5' : 'h-4 w-4'
                }`} />
                <span>Add Expense</span>
              </Button>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className={`border-t border-border ${
          isMobile ? 'p-4 flex-shrink-0' : 'p-4'
        }`} style={isMobile ? { minHeight: 'auto' } : {}}>
          {/* User Profile */}
          <div className={`flex items-center ${
            isCollapsed && !isMobile ? 'justify-center mb-4' : 'space-x-3 mb-4'
          }`}>
            <UserProfile profile={profile} onProfileUpdate={onProfileUpdate} />
            {(isMobile || !isCollapsed) && (
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${
                  isMobile ? 'text-base' : 'text-sm'
                }`}>
                  {profile?.name || 'User'}
                </p>
                <p className={`text-muted-foreground truncate ${
                  isMobile ? 'text-sm' : 'text-xs'
                }`}>
                  {profile?.email || 'user@example.com'}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={`flex items-center ${
            isCollapsed && !isMobile ? 'justify-center space-y-2 flex-col' : 'space-x-3'
          }`}>
            <div className={`${
              isCollapsed && !isMobile ? 'w-full flex justify-center' : ''
            }`}>
              <ThemeToggle />
            </div>
            <div className={`${
              isCollapsed && !isMobile ? 'w-full flex justify-center' : ''
            }`}>
              <NotificationBell />
            </div>
            {(isMobile || !isCollapsed) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className={`justify-start text-muted-foreground hover:text-foreground ${
                  isMobile ? 'flex-1 h-12 text-base px-4' : 'flex-1 h-9 text-sm px-3'
                }`}
              >
                <LogOut className={`mr-2 ${
                  isMobile ? 'h-5 w-5' : 'h-4 w-4'
                }`} />
                <span>Sign Out</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile view with sheet overlay
  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="fixed top-4 right-4 z-50 h-12 w-12 p-0 bg-background/95 backdrop-blur border border-border shadow-lg rounded-xl"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full h-full max-w-full p-0 mobile-padding mobile-safe-top flex flex-col overflow-hidden hide-sheet-close-mobile" hideClose={isMobile}>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop view with fixed sidebar
  return (
    <div className={`fixed left-0 top-0 z-50 h-full bg-card border-r border-border transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      <SidebarContent />
    </div>
  );
}; 
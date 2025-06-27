import React from 'react';
import { Loader2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'success' | 'error' | 'warning';
  text?: string;
  showProgress?: boolean;
  progress?: number;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'default',
  text,
  showProgress = false,
  progress = 0,
  className
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const variantConfig = {
    default: {
      icon: Loader2,
      className: 'text-primary animate-spin',
      bgColor: 'bg-primary/10'
    },
    success: {
      icon: CheckCircle,
      className: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    error: {
      icon: AlertCircle,
      className: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20'
    },
    warning: {
      icon: Clock,
      className: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20'
    }
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-2', className)}>
      <div className={cn('flex items-center justify-center', config.bgColor)}>
        <Icon className={cn(sizeClasses[size], config.className)} />
      </div>
      
      {text && (
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {text}
        </p>
      )}
      
      {showProgress && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Loading...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Full screen loading component
export const FullScreenLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center space-y-4">
        <LoadingSpinner size="xl" text={text} />
      </div>
    </div>
  );
};

// Skeleton loading component
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted rounded',
        className
      )}
    />
  );
};

// Skeleton components for common UI elements
export const SkeletonCard: React.FC = () => (
  <div className="space-y-3">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-4 w-2/3" />
  </div>
);

export const SkeletonAvatar: React.FC = () => (
  <Skeleton className="h-10 w-10 rounded-full" />
);

export const SkeletonButton: React.FC = () => (
  <Skeleton className="h-10 w-24 rounded" />
);

export const SkeletonInput: React.FC = () => (
  <Skeleton className="h-10 w-full rounded" />
); 
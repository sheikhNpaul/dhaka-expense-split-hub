import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ExpenseCalendarProps {
  date: Date;
  onDateChange: (date: Date) => void;
  expenses: Array<{
    created_at: string;
    amount: number;
  }>;
  className?: string;
}

export function ExpenseCalendar({ date, onDateChange, expenses, className }: ExpenseCalendarProps) {
  // Create a map of dates to total amounts
  const dateAmounts = React.useMemo(() => {
    return expenses.reduce((acc, expense) => {
      const expenseDate = new Date(expense.created_at);
      const dateKey = format(expenseDate, 'yyyy-MM-dd');
      acc[dateKey] = (acc[dateKey] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
  }, [expenses]);

  // Custom day render to show amounts
  const renderDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const amount = dateAmounts[dateKey];
    
    return (
      <div className="w-full h-full p-2 relative">
        <div className="absolute top-1 left-0 w-full text-center">
          {format(day, 'd')}
        </div>
        {amount && (
          <div className="absolute bottom-0 left-0 w-full text-center text-xs font-medium text-primary">
            ৳{amount.toFixed(0)}
          </div>
        )}
      </div>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'dd MMMM yyyy') : 'Pick a date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(date) => date && onDateChange(date)}
          initialFocus
          disabled={(date) => !dateAmounts[format(date, 'yyyy-MM-dd')]}
          components={{
            Day: ({ date: dayDate, ...props }) => (
              <Button
                {...props}
                className={cn(
                  "h-14 w-14 p-0 font-normal aria-selected:opacity-100",
                  dayDate && isSameDay(dayDate, date) && "bg-primary text-primary-foreground",
                  dateAmounts[format(dayDate, 'yyyy-MM-dd')] && "font-medium border-primary/50"
                )}
              >
                {renderDay(dayDate)}
              </Button>
            ),
          }}
        />
      </PopoverContent>
    </Popover>
  );
} 
import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal, X, Calendar as CalendarIcon } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

const DateFilter = ({
  date,
  onSelect,
}: {
  date?: Date;
  onSelect: (date?: Date) => void;
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "w-full justify-start text-left font-normal",
            "bg-background dark:bg-gray-800",
            "text-gray-900 dark:text-gray-100",
            "hover:bg-gray-100 dark:hover:bg-gray-700",
            "border border-input"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP') : 'Select date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selected) => {
            onSelect(selected);
            setOpen(false);
          }}
          initialFocus
          className="rounded-md border"
        />
      </PopoverContent>
    </Popover>
  );
};

const SentimentFilter = ({
  sentiment,
  onSelect,
}: {
  sentiment: string | null;
  onSelect: (sentiment: string | null) => void;
}) => {
  const currentValue = sentiment || "all";

  const getSentimentLabel = (value: string) => {
    switch (value) {
      case 'positive':
        return '😊 Positive';
      case 'negative':
        return '😔 Negative';
      case 'neutral':
        return '😐 Neutral';
      default:
        return '🔍 All Sentiments';
    }
  };

  return (
    <Select
      value={currentValue}
      onValueChange={(value) => onSelect(value === "all" ? null : value)}
    >
      <SelectTrigger className={cn(
        "w-full",
        "bg-background dark:bg-gray-800",
        "text-gray-900 dark:text-gray-100",
        "border border-input",
        "ring-offset-background",
        "focus:ring-2 focus:ring-ring focus:ring-offset-2"
      )}>
        <SelectValue>
          {getSentimentLabel(currentValue)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-background dark:bg-gray-800">
        <SelectItem 
          value="all"
          className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-gray-700"
        >
          🔍 All Sentiments
        </SelectItem>
        <SelectItem 
          value="positive"
          className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-gray-700"
        >
          😊 Positive
        </SelectItem>
        <SelectItem 
          value="negative"
          className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-gray-700"
        >
          😔 Negative
        </SelectItem>
        <SelectItem 
          value="neutral"
          className="text-gray-900 dark:text-gray-100 focus:bg-gray-100 dark:focus:bg-gray-700"
        >
          😐 Neutral
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

const MobileFilters = ({
  date,
  onDateSelect,
  sentiment,
  onSentimentSelect,
  onReset
}: {
  date?: Date;
  onDateSelect: (date?: Date) => void;
  sentiment: string | null;
  onSentimentSelect: (sentiment: string | null) => void;
  onReset: () => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const hasActiveFilters = date || sentiment;

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={cn(
            "md:hidden relative",
            "bg-background dark:bg-gray-800",
            "text-gray-900 dark:text-gray-100",
            "hover:bg-gray-100 dark:hover:bg-gray-700"
          )}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="bottom" 
        className={cn(
          "h-[90vh]",
          "bg-background dark:bg-gray-800",
          "text-gray-900 dark:text-gray-100"
        )}
      >
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-gray-900 dark:text-gray-100">Filters</SheetTitle>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  onDateSelect(undefined);
                  onSentimentSelect(null);
                  onReset();
                  handleClose();
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            )}
          </div>
        </SheetHeader>
        <Separator className="my-4" />
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Date</h4>
            <DateFilter date={date} onSelect={onDateSelect} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Sentiment</h4>
            <SentimentFilter 
              sentiment={sentiment} 
              onSelect={onSentimentSelect} 
            />
          </div>
        </div>
        <SheetFooter className="mt-6">
          <Button 
            className={cn(
              "w-full",
              "bg-primary hover:bg-primary/90",
              "text-gray-900 dark:text-gray-100"
            )}
            onClick={handleClose}
          >
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default MobileFilters;
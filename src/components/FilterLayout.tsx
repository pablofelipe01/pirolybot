import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import MobileNav from './MobileNav';
import MobileFilters from './MobileFilters';
import DateFilter from './DateFilter';
import SentimentFilter from './SentimentFilter';

interface FilterLayoutProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  selectedDate?: Date;
  setSelectedDate: (date?: Date) => void;
  selectedSentiment: string | null;
  setSelectedSentiment: (sentiment: string | null) => void;
}

const FilterLayout = ({
  activeTab,
  setActiveTab,
  selectedDate,
  setSelectedDate,
  selectedSentiment,
  setSelectedSentiment,
}: FilterLayoutProps) => {
  return (
    <div className="w-full space-y-4">
      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MobileNav activeTab={activeTab} onSelect={setActiveTab} />
          </div>
          <MobileFilters
            date={selectedDate}
            onDateSelect={setSelectedDate}
            sentiment={selectedSentiment}
            onSentimentSelect={setSelectedSentiment}
            onReset={() => {
              setSelectedDate(undefined);
              setSelectedSentiment(null);
            }}
          />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <DateFilter date={selectedDate} onSelect={setSelectedDate} />
            <Separator orientation="vertical" className="h-8" />
            <SentimentFilter 
              sentiment={selectedSentiment} 
              onSelect={setSelectedSentiment} 
            />
          </div>
          
          {(selectedDate || selectedSentiment) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedDate(undefined);
                setSelectedSentiment(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4 mr-2" />
              Clear filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterLayout;
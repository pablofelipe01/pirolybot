import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SentimentFilter = ({
  sentiment,
  onSelect,
}: {
  sentiment: string | null;
  onSelect: (sentiment: string | null) => void;
}) => {
  return (
    <Select
      value={sentiment || "all"}
      onValueChange={(value) => onSelect(value === "all" ? null : value)}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Filter by sentiment" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Sentiments</SelectItem>
        <SelectItem value="positive">Positive</SelectItem>
        <SelectItem value="negative">Negative</SelectItem>
        <SelectItem value="neutral">Neutral</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default SentimentFilter;
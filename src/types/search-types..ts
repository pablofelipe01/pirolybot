// types.ts
export interface SearchResult {
    id: string;
    type: 'image' | 'audio' | 'document' | 'text';
    content: string;
    timestamp: string;
    topic?: string;
    sentiment?: string;
    metadata?: Record<string, any>;
  }
  
  export interface QueryIntent {
    type: 'search' | 'direct' | 'latest' | 'date' | 'topic' | 'similarity';
    searchTerms: string[];
    filters?: {
      dateRange?: { start: string; end: string };
      type?: string[];
      sentiment?: string;
      order?: 'asc' | 'desc';
      limit?: number;
      byId?: boolean;
      similarity?: {
        targetId?: string;
        threshold?: number;
      };
    };
  }
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  MessageCircle, 
  FileText, 
  Image, 
  Headphones, 
  FileBox, 
  AlertCircle, 
  ArrowLeft, 
  Inbox, 
  Calendar as CalendarIcon,
  ChevronDown, 
  ChevronUp
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';

interface ContentItem {
  id: string;
  Type: string;
  Timestamp: string;
  Content: string;
  Sentiment: string;
  Keywords: string;
  Language: string;
  Source_Type: string;
  Topic: string[];
}

const EmptyState = ({ type, onReset }: { type: string; onReset: () => void }) => (
  <div className="flex flex-col items-center justify-center h-64 space-y-4">
    <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-4">
      <Inbox className="w-8 h-8 text-gray-400" />
    </div>
    <div className="text-center">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
        No {type.toLowerCase()} content
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        No {type === 'all' ? 'content' : type.toLowerCase() + ' content'} available at the moment
      </p>
    </div>
    {type !== 'all' && (
      <Button 
        onClick={onReset}
        variant="outline"
        className="flex items-center space-x-2 text-gray-700 dark:text-gray-200"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>View all content</span>
      </Button>
    )}
  </div>
);

/**
 * Componente para escoger una fecha con un popover y un calendario.
 * Se agregó la clase text-gray-700 dark:text-gray-200 para evitar texto blanco sobre fondo blanco.
 */
const DateFilter = ({
  date,
  onSelect,
}: {
  date?: Date;
  onSelect: (date?: Date) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-[260px] justify-start text-left font-normal text-gray-700 dark:text-gray-200"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP') : 'Pick a date'}
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
        />
      </PopoverContent>
    </Popover>
  );
};

const getTypeIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'text':
      return <MessageCircle className="w-4 h-4" />;
    case 'document':
      return <FileText className="w-4 h-4" />;
    case 'image':
      return <Image className="w-4 h-4" />;
    case 'audio':
      return <Headphones className="w-4 h-4" />;
    default:
      return <FileBox className="w-4 h-4" />;
  }
};

const getSentimentColor = (sentiment: string) => {
  switch (sentiment?.toLowerCase()) {
    case 'positive':
      return 'bg-green-500';
    case 'negative':
      return 'bg-red-500';
    case 'neutral':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
};

const ContentViewer = () => {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchAirtableData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/airtable/content');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const formattedData = (Array.isArray(data) ? data : []).map((item: any) => ({
          id: item.id || String(Math.random()),
          Type: item.Type || 'unknown',
          Timestamp: item.Timestamp || new Date().toISOString(),
          Content: item.Content || '',
          Sentiment: item.Sentiment || 'neutral',
          Keywords: item.Keywords || '',
          Language: item.Language || 'unknown',
          Source_Type: item.Source_Type || 'unknown',
          Topic: Array.isArray(item.Topic) ? item.Topic : ['general'],
        }));

        setContents(formattedData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'An error occurred while fetching data'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAirtableData();
  }, []);

  const handleReset = () => {
    setActiveTab('all');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
          <button
            onClick={() => window.location.reload()}
            className="ml-2 text-sm underline hover:text-red-400"
          >
            Try again
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  /**
   * Filtrado principal:
   *  1) Verifica que el tipo coincida con la pestaña seleccionada (o 'all').
   *  2) Verifica si hay fecha seleccionada (selectedDate) y la compara con la fecha del content.
   */
  const filteredContents = contents.filter((content) => {
    const typeMatch =
      activeTab === 'all' ||
      content.Type?.toLowerCase() === activeTab.toLowerCase();

    const dateMatch = selectedDate
      ? new Date(content.Timestamp).toDateString() === selectedDate.toDateString()
      : true;

    return typeMatch && dateMatch;
  });

  /**
   * Lógica para “mostrar todo”:
   * - Si estamos en la pestaña 'all', no hay fecha seleccionada y showAll es false,
   *   se muestran los primeros 3 contenidos.
   * - De lo contrario, se muestran todos los contenidos filtrados.
   */
  const displayedContents =
    !showAll && activeTab === 'all' && !selectedDate
      ? filteredContents.slice(0, 3)
      : filteredContents;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      {/* Filtro de fecha */}
      <div className="flex justify-between items-center mb-4">
        <DateFilter date={selectedDate} onSelect={setSelectedDate} />

        {/* Botón para limpiar el filtro de fecha */}
        {selectedDate && (
          <Button
            variant="ghost"
            onClick={() => setSelectedDate(undefined)}
            className="text-sm text-gray-400 dark:text-gray-200"
          >
            Clear filter
          </Button>
        )}
      </div>

      {/* Tabs para filtrar por tipo de contenido */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="image">Images</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
          <TabsTrigger value="document">Documents</TabsTrigger>
        </TabsList>

        {/* Renderizado del contenido dependiendo de la pestaña */}
        {['all', 'text', 'image', 'audio', 'document'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {filteredContents.length === 0 ? (
              <EmptyState type={tab} onReset={handleReset} />
            ) : (
              <div className="space-y-4">
                {/* Cards de contenido */}
                <div className="grid gap-4">
                  {displayedContents.map((content) => (
                    <Card key={content.id} className="overflow-hidden">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {getTypeIcon(content.Type)}
                            <span>{new Date(content.Timestamp).toLocaleString()}</span>
                          </div>
                        </CardTitle>
                        <Badge
                          className={`${getSentimentColor(content.Sentiment)} text-white`}
                        >
                          {content.Sentiment}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {content.Content}
                          </p>
                          {content.Keywords && (
                            <div className="flex flex-wrap gap-2">
                              {content.Keywords.split(',').map((keyword, i) => (
                                <Badge key={i} variant="outline">
                                  {keyword.trim()}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <Badge variant="secondary">{content.Language}</Badge>
                            <Badge variant="secondary">{content.Source_Type}</Badge>
                            {content.Topic.map((topic, i) => (
                              <Badge key={i} variant="secondary">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Botón para “mostrar todo” o “mostrar menos” (solo en pestaña 'all' y sin fecha seleccionada) */}
                {tab === 'all' && !selectedDate && filteredContents.length > 3 && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowAll(!showAll)}
                      className="flex items-center space-x-2 text-gray-700 dark:text-gray-200"
                    >
                      {showAll ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          <span>Show less</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>Show all ({filteredContents.length})</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ContentViewer;
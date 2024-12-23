// utils/queryParser.ts
import { SearchResult, QueryIntent } from '@/types';
export function parseUserQuery(query: string): QueryIntent {
  const lowerQuery = query.toLowerCase().trim();
  
  const patterns = {
    date: /(?:ayer|hoy|esta semana|la semana pasada|el mes pasado|(\d{1,2}\s+de\s+[a-z]+))/g,
    topic: /(sobre|acerca de|relacionado con|tema de)\s+([a-zA-Z\s]+)/,
    latest: /\b(último|última|ultimos|ultimas)\s+(imagen|imágenes|audio|audios|documento|documentos|texto|textos)\b/,
    similarity: /(similar|parecido|como)\s+(a|al|la)\s+(.+)/,
    sentiment: /(positiv[oa]|negativ[oa]|neutral)/
  };

  // Mapa de tipos de contenido
  const typeMap: Record<string, string[]> = {
    image: ['imagen', 'imágenes', 'foto', 'fotos', 'fotografía'],
    audio: ['audio', 'audios', 'sonido', 'grabación'],
    document: ['documento', 'documentos', 'archivo'],
    text: ['texto', 'textos', 'mensaje', 'mensajes']
  };

  let intent: QueryIntent = {
    type: 'direct',
    searchTerms: []
  };

  // Búsqueda de similitud
  if (patterns.similarity.test(lowerQuery)) {
    const match = lowerQuery.match(patterns.similarity);
    if (match) {
      intent.type = 'similarity';
      intent.filters = {
        similarity: {
          threshold: 0.7 // Umbral configurable
        }
      };
      intent.searchTerms = [match[3]];
    }
  }

  // Búsqueda del último contenido
  else if (patterns.latest.test(lowerQuery)) {
    intent.type = 'latest';
    for (const [type, keywords] of Object.entries(typeMap)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        intent.filters = {
          type: [type],
          order: 'desc',
          limit: 1
        };
        break;
      }
    }
  }

  // Otras búsquedas
  else {
    if (patterns.date.test(lowerQuery)) intent.type = 'date';
    if (patterns.topic.test(lowerQuery)) {
      intent.type = 'topic';
      const match = lowerQuery.match(patterns.topic);
      if (match) intent.searchTerms.push(match[2]);
    }
    
    // Extraer términos de búsqueda significativos
    if (intent.searchTerms.length === 0) {
      intent.searchTerms = lowerQuery
        .split(' ')
        .filter(word => 
          word.length > 3 && 
          !['este', 'esta', 'esto', 'esos', 'esas', 'para', 'como'].includes(word)
        );
    }
  }

  return intent;
}

// airtable/search.ts
export async function searchAirtable(base: any, query: QueryIntent): Promise<SearchResult[]> {
  const FIELDS = {
    KEYWORDS: ' Keywords',
    CONTENT: 'Content',
    TYPE: ' Type',
    TOPIC: ' Topic',
    LANGUAGE: ' Language',
    CLASSIFICATION: ' Classification',
    SENTIMENT: ' Sentiment',
    ID: 'ID',
    TIMESTAMP: ' Timestamp',
    METADATA: ' Metadata'
  };

  let filterFormula = '';
  const { type, filters, searchTerms } = query;

  switch (type) {
    case 'latest':
      filterFormula = filters?.type 
        ? `{${FIELDS.TYPE}} = '${filters.type[0]}'`
        : '';
      break;
      
    case 'similarity':
      // Implementar búsqueda por similitud usando metadata o contenido
      filterFormula = `OR(${searchTerms.map(term => 
        `SEARCH("${term.toLowerCase()}", LOWER({${FIELDS.CONTENT}}))`)
        .join(', ')})`;
      break;
      
    case 'topic':
      filterFormula = `OR(${searchTerms.map(term =>
        `SEARCH("${term.toLowerCase()}", LOWER({${FIELDS.TOPIC}}))`)
        .join(', ')})`;
      break;
      
    default:
      filterFormula = searchTerms.length > 0
        ? `OR(${searchTerms.map(term =>
            `SEARCH("${term.toLowerCase()}", LOWER({${FIELDS.CONTENT}}))`)
            .join(', ')})`
        : '';
  }

  const records = await base('tbl9Rl8a2dOm5n66L')
    .select({
      maxRecords: filters?.limit || 10,
      sort: [{ field: FIELDS.ID, direction: filters?.order || 'desc' }],
      filterByFormula: filterFormula
    })
    .all();

  return records.map(record => ({
    id: record.id,
    type: record.get(FIELDS.TYPE),
    content: record.get(FIELDS.CONTENT),
    timestamp: record.get(FIELDS.TIMESTAMP),
    topic: record.get(FIELDS.TOPIC),
    sentiment: record.get(FIELDS.SENTIMENT),
    metadata: record.get(FIELDS.METADATA)
  }));
}
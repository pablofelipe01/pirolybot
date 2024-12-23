export interface SearchIntent {
  type: 'content' | 'document' | 'image' | 'audio';
  action: 'find' | 'summarize' | 'list';
  criteria: {
    timeframe?: 'latest' | 'today' | 'week';
    contentType?: string[];
    keywords: string[];
  };
}

export function analyzeQuery(query: string): SearchIntent {
  const q = query.toLowerCase();
  
  const contentTypes = {
    image: ['imagen', 'photo', 'foto', 'gafas', 'retrato'],
    document: ['pdf', 'documento', 'archivo', 'cuenta', 'remisión'],
    audio: ['audio', 'voz', 'grabación', 'sonido']
  };

  const actions = {
    summarize: ['resume', 'resumen', 'describe', 'explica'],
    find: ['busca', 'encuentra', 'muestra', 'dime'],
    list: ['lista', 'enumera', 'todos']
  };

  const timeframes = {
    latest: ['último', 'ultima', 'reciente', 'más nuevo'],
    today: ['hoy', 'este día'],
    week: ['esta semana', 'semana']
  };

  let intent: SearchIntent = {
    type: 'content',
    action: 'find',
    criteria: {
      keywords: q.split(' ').filter(word => word.length > 3)
    }
  };

  // Determinar tipo
  for (const [type, keywords] of Object.entries(contentTypes)) {
    if (keywords.some(k => q.includes(k))) {
      intent.type = type as SearchIntent['type'];
      break;
    }
  }

  // Determinar acción
  for (const [action, keywords] of Object.entries(actions)) {
    if (keywords.some(k => q.includes(k))) {
      intent.action = action as SearchIntent['action'];
      break;
    }
  }

  // Determinar timeframe
  for (const [timeframe, keywords] of Object.entries(timeframes)) {
    if (keywords.some(k => q.includes(k))) {
      intent.criteria.timeframe = timeframe as SearchIntent['criteria']['timeframe'];
      break;
    }
  }

  return intent;
}

export function buildAirtableFormula(intent: SearchIntent): string {
  const conditions = [];

  // Filtro por tipo
  if (intent.type !== 'content') {
    conditions.push(`{ Type} = '${intent.type}'`);
  }

  // Filtro por palabras clave
  if (intent.criteria.keywords.length) {
    const keywordSearch = intent.criteria.keywords
      .map(k => `SEARCH("${k}", LOWER({ Content}))`)
      .join(', ');
    conditions.push(`OR(${keywordSearch})`);
  }

  return conditions.length > 1 
    ? `AND(${conditions.join(', ')})` 
    : conditions[0] || '';
}

export function formatResponse(records: any[], intent: SearchIntent) {
  let content = '';

  if (records.length === 0) {
    return 'No encontré información que coincida con tu búsqueda.';
  }

  switch (intent.action) {
    case 'summarize':
      content = `Aquí está el resumen:\n\n`;
      content += `- Tipo: ${records[0].get(' Type')}\n`;
      content += `- Contenido: ${records[0].get(' Content')}\n`;
      if (records[0].get(' Topic')) {
        content += `- Tema: ${records[0].get(' Topic')}\n`;
      }
      break;

    case 'list':
      content = `Encontré ${records.length} resultados:\n\n`;
      records.forEach((record, i) => {
        content += `${i + 1}. ${record.get(' Content')}\n`;
        if (record.get(' Type')) {
          content += `   Tipo: ${record.get(' Type')}\n`;
        }
      });
      break;

    default:
      content = `Aquí está lo que encontré:\n\n`;
      records.forEach((record, i) => {
        content += `- ${record.get(' Content')}\n`;
        if (record.get(' Topic')) {
          content += `  Tema: ${record.get(' Topic')}\n`;
        }
      });
  }

  return content;
}
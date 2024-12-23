import { AirtableRecord, SearchOptions } from '../types/airtable';

export class ContextManager {
  private static readonly SIMILARITY_THRESHOLD = 0.6;
  private static readonly MAX_CONTEXT_ITEMS = 5;

  static buildSearchQuery(options: SearchOptions): string {
    const searchFormulas = [];

    // Búsqueda por contenido
    if (options.query) {
      searchFormulas.push(`SEARCH("${options.query.toLowerCase()}", LOWER({Content}))`);
    }

    // Filtros por tipo
    if (options.filters?.type?.length) {
      const typeFormula = options.filters.type
        .map(type => `{Type} = '${type}'`)
        .join(', ');
      searchFormulas.push(`OR(${typeFormula})`);
    }

    // Filtros por fecha
    if (options.filters?.dateRange) {
      searchFormulas.push(
        `AND(
          IS_AFTER({Timestamp}, '${options.filters.dateRange.start}'),
          IS_BEFORE({Timestamp}, '${options.filters.dateRange.end}')
        )`
      );
    }

    return searchFormulas.length ? `AND(${searchFormulas.join(', ')})` : '';
  }

  static async findRelatedRecords(base: any, record: AirtableRecord): Promise<AirtableRecord[]> {
    const formulas = [];
    
    if (record.Topic?.length) {
      const topicFormula = record.Topic
        .map(topic => `FIND('${topic}', {Topic})`)
        .join(', ');
      formulas.push(`OR(${topicFormula})`);
    }

    if (record.Keywords?.length) {
      const keywordFormula = record.Keywords
        .map(keyword => `FIND('${keyword}', {Keywords})`)
        .join(', ');
      formulas.push(`OR(${keywordFormula})`);
    }

    if (record.Session_ID) {
      formulas.push(`{Session_ID} = '${record.Session_ID}'`);
    }

    if (!formulas.length) return [];

    const records = await base('Content')
      .select({
        filterByFormula: `OR(${formulas.join(', ')})`,
        sort: [{ field: 'Timestamp', direction: 'desc' }],
        maxRecords: this.MAX_CONTEXT_ITEMS
      })
      .all();

    return records.map(r => r._rawJson);
  }

  static async buildResponseContext(
    base: any,
    query: string,
    results: AirtableRecord[]
  ): Promise<string> {
    let context = '';
    
    if (results.length) {
      context += 'Resultados relevantes:\n';
      results.forEach(record => {
        const metadata = JSON.parse(record.Metadata || '{}');
        context += `- ${record.Content.substring(0, 150)}... \n`;
        context += `  (${record.Type}, ${record.Timestamp}, Topics: ${record.Topic.join(', ')})\n`;
        if (metadata.sessionData?.userInfo) {
          context += `  Usuario: ${metadata.sessionData.userInfo}\n`;
        }
      });
    }

    // Buscar información relacionada
    const relatedRecords = new Set<AirtableRecord>();
    for (const record of results.slice(0, 2)) {
      const related = await this.findRelatedRecords(base, record);
      related.forEach(r => relatedRecords.add(r));
    }

    if (relatedRecords.size) {
      context += '\nInformación relacionada:\n';
      relatedRecords.forEach(record => {
        context += `- ${record.Content.substring(0, 100)}... \n`;
        context += `  (${record.Type}, ${record.Timestamp})\n`;
      });
    }

    return context;
  }
}
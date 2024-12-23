// src/lib/airtableManager.ts
import Airtable from 'airtable';

class AirtableManager {
  private data: any[] = [];
  
  async loadData() {
    try {
      const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
        .base(process.env.AIRTABLE_BASE_ID!);
      
      const records = await base('tbl9Rl8a2dOm5n66L').select({}).all();
      
      // Extraemos solo los datos relevantes para reducir el tamaño
      this.data = records.map(record => ({
        id: record.get('ID'),
        type: record.get(' Type'),
        content: record.get('Content'),
        timestamp: record.get(' Timestamp'),
        topic: record.get(' Topic'),
        sentiment: record.get(' Sentiment')
      }));
      
      return this.data;
    } catch (error) {
      console.error('Error loading Airtable data:', error);
      throw error;
    }
  }

  getData() {
    return this.data;
  }

  // Método para filtrar datos relevantes a la consulta
  filterRelevantData(query: string) {
    const queryLower = query.toLowerCase();
    return this.data.filter(item => 
      item.content.toLowerCase().includes(queryLower) ||
      (item.topic && item.topic.toLowerCase().includes(queryLower))
    ).slice(0, 5); // Limitamos a 5 resultados más relevantes
  }
}

export const airtableManager = new AirtableManager();
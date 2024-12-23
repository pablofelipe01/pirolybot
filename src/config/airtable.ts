// src/config/airtable.ts
export const AIRTABLE_CONFIG = {
  BASE_ID: process.env.AIRTABLE_BASE_ID,
  TABLE_ID: 'tbl9Rl8a2dOm5n66L',
  FIELDS: {
    ID: 'ID',
    TIMESTAMP: ' Timestamp',
    TYPE: ' Type',
    CONTENT: 'Content',
    SOURCE_TYPE: 'Source_Type',
    CLASSIFICATION: ' Classification',
    SENTIMENT: ' Sentiment',
    LANGUAGE: ' Language',
    TOPIC: ' Topic',
    KEYWORDS: ' Keywords',
    METADATA: ' Metadata'
  },
  TYPE_MAPPING: {
    'text': ['text-correction'],
    'audio': ['voice_recording'],
    'image': ['image_analysis'],
    'document': ['document_extraction']
  },
  SENTIMENT_VALUES: ['neutral', 'positive', 'negative'],
  LANGUAGES: ['español', 'other']
};
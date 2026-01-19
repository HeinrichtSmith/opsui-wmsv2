/**
 * Pattern Extraction & Semantic Search Tools
 *
 * Automatically extracts and indexes code patterns for intelligent retrieval.
 * Every completed task adds to the pattern library → compound intelligence.
 *
 * Features:
 * - Auto-extract patterns from code changes
 * - Semantic search using TF-IDF embeddings
 * - Categorization by pattern type
 * - Tag-based filtering
 */

import { promises as fs } from 'fs';
import path from 'path';
import fastGlob from 'fast-glob';
import type { ToolMetadata, ToolContext, ToolArgs } from '../types/index.js';

const glob = fastGlob.glob;

// ============================================================================
// TYPES
// ============================================================================

interface ExtractedPattern {
  id: string;
  timestamp: string;
  title: string;
  category: PatternCategory;
  problem: string;
  solution: string;
  files: string[];
  codeSnippet: string;
  tags: string[];
  embedding?: number[];
  metadata: {
    taskType?: string;
    complexity?: 'simple' | 'medium' | 'complex';
    linesChanged?: number;
  };
}

type PatternCategory =
  | 'service-layer'
  | 'api-route'
  | 'ui-component'
  | 'data-access'
  | 'validation'
  | 'error-handling'
  | 'state-management'
  | 'testing'
  | 'utility'
  | 'other';

interface SearchOptions {
  category?: PatternCategory;
  tags?: string[];
  maxResults?: number;
  minSimilarity?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Will be set during tool execution
const getPatternsDir = (workspaceRoot: string) => path.join(workspaceRoot, 'patterns', 'extracted');

// ============================================================================
// EMBEDDINGS (TF-IDF for semantic search)
// ============================================================================

/**
 * Simple TF-IDF based embedding for semantic search
 * Lightweight alternative to full vector DB - good enough for code patterns
 */
class SimpleEmbedding {
  private vocabulary: Map<string, number> = new Map();
  private idf: Map<string, number> = new Map();

  /**
   * Build vocabulary from a corpus of documents
   */
  buildVocabulary(docs: string[]): void {
    const docCount = docs.length;
    const freq: Map<string, number> = new Map();

    // Build vocabulary and document frequency
    for (const doc of docs) {
      const tokens = this.tokenize(doc);
      const uniqueTokens = new Set(tokens);

      for (const token of uniqueTokens) {
        freq.set(token, (freq.get(token) || 0) + 1);
      }
    }

    // Create vocabulary mapping
    let idx = 0;
    for (const [token] of freq) {
      this.vocabulary.set(token, idx++);

      // Calculate IDF
      const idf = Math.log(docCount / (freq.get(token) || 1));
      this.idf.set(token, idf);
    }
  }

  /**
   * Tokenize text into terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s#]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  /**
   * Create embedding for a single document
   */
  embed(text: string): number[] {
    const tokens = this.tokenize(text);
    const tf: Map<string, number> = new Map();

    // Calculate term frequency
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    // Create TF-IDF vector
    const vector = new Array(this.vocabulary.size).fill(0);

    for (const [token, count] of tf) {
      const idx = this.vocabulary.get(token);
      if (idx !== undefined) {
        const idf = this.idf.get(token) || 1;
        vector[idx] = (count / tokens.length) * idf;
      }
    }

    return vector;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }
}

const embedding = new SimpleEmbedding();

// ============================================================================
// PATTERN STORAGE
// ============================================================================

/**
 * Ensure patterns directory exists
 */
async function ensurePatternsDir(workspaceRoot: string): Promise<void> {
  await fs.mkdir(getPatternsDir(workspaceRoot), { recursive: true });
}

/**
 * Load all patterns from disk
 */
async function loadPatterns(workspaceRoot: string): Promise<ExtractedPattern[]> {
  try {
    const patternsDir = getPatternsDir(workspaceRoot);
    await ensurePatternsDir(workspaceRoot);

    const files = await glob('*.json', { cwd: patternsDir, absolute: false });
    const patterns: ExtractedPattern[] = [];

    for (const file of files) {
      if (file === 'index.json') continue;

      const content = await fs.readFile(path.join(patternsDir, file), 'utf-8');
      const pattern = JSON.parse(content) as ExtractedPattern;
      patterns.push(pattern);
    }

    return patterns;
  } catch {
    return [];
  }
}

/**
 * Save a pattern to disk
 */
async function savePattern(pattern: ExtractedPattern, workspaceRoot: string): Promise<void> {
  const patternsDir = getPatternsDir(workspaceRoot);
  await ensurePatternsDir(workspaceRoot);

  const filename = `${pattern.id}.json`;
  const filepath = path.join(patternsDir, filename);

  await fs.writeFile(filepath, JSON.stringify(pattern, null, 2), 'utf-8');

  // Update index
  await updateIndex(pattern, workspaceRoot);
}

/**
 * Update the patterns index
 */
async function updateIndex(pattern: ExtractedPattern, workspaceRoot: string): Promise<void> {
  const patternsDir = getPatternsDir(workspaceRoot);
  const indexFile = path.join(patternsDir, 'index.json');

  let index: Map<string, string> = new Map();

  try {
    const content = await fs.readFile(indexFile, 'utf-8');
    index = new Map(JSON.parse(content));
  } catch {
    // Index doesn't exist yet
  }

  index.set(pattern.id, filename(pattern.id));

  await fs.writeFile(indexFile, JSON.stringify(Array.from(index.entries()), null, 2), 'utf-8');
}

function filename(id: string): string {
  return `${id}.json`;
}

/**
 * Rebuild embeddings for all patterns
 */
async function rebuildEmbeddings(workspaceRoot: string): Promise<void> {
  const patterns = await loadPatterns(workspaceRoot);

  // Build vocabulary from all pattern texts
  const corpus = patterns.map(p => `${p.title} ${p.problem} ${p.solution} ${p.tags.join(' ')}`);

  embedding.buildVocabulary(corpus);

  // Generate embeddings for each pattern
  for (const pattern of patterns) {
    const text = `${pattern.title} ${pattern.problem} ${pattern.solution} ${pattern.tags.join(' ')}`;
    pattern.embedding = embedding.embed(text);
    await savePattern(pattern, workspaceRoot);
  }
}

// ============================================================================
// MCP TOOLS
// ============================================================================

export const patternExtractionTools: ToolMetadata[] = [
  /**
   * Extract a pattern from recent code changes
   */
  {
    name: 'pattern_extract',
    description:
      'Extract and save a code pattern from recent work. Call this after completing a task to build the pattern library.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description:
            'Brief title describing the pattern (e.g., "Service layer with transaction")',
        },
        category: {
          type: 'string',
          description: 'Pattern category',
          enum: [
            'service-layer',
            'api-route',
            'ui-component',
            'data-access',
            'validation',
            'error-handling',
            'state-management',
            'testing',
            'utility',
            'other',
          ],
        },
        problem: {
          type: 'string',
          description: 'What problem was solved? What was the challenge?',
        },
        solution: {
          type: 'string',
          description: 'How was it solved? Key implementation details',
        },
        files: {
          type: 'array',
          description: 'Files involved in this pattern',
          items: { type: 'string' },
        },
        codeSnippet: {
          type: 'string',
          description: 'Key code snippet demonstrating the pattern',
        },
        tags: {
          type: 'array',
          description: 'Tags for searching (e.g., ["transaction", "validation", "async"])',
          items: { type: 'string' },
        },
        taskType: {
          type: 'string',
          description: 'Type of task (e.g., "bugfix", "feature", "refactor")',
        },
        complexity: {
          type: 'string',
          description: 'Complexity level',
          enum: ['simple', 'medium', 'complex'],
        },
      },
      required: ['title', 'category', 'problem', 'solution', 'files'],
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const pattern: ExtractedPattern = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        title: args.title as string,
        category: args.category as PatternCategory,
        problem: args.problem as string,
        solution: args.solution as string,
        files: args.files as string[],
        codeSnippet: (args.codeSnippet as string) || '',
        tags: (args.tags as string[]) || [],
        metadata: {
          taskType: args.taskType as string,
          complexity: args.complexity as 'simple' | 'medium' | 'complex' | undefined,
        },
      };

      // Generate embedding
      const text = `${pattern.title} ${pattern.problem} ${pattern.solution} ${pattern.tags.join(' ')}`;
      pattern.embedding = embedding.embed(text);

      // Save pattern
      await savePattern(pattern, context.workspaceRoot);

      // Rebuild embeddings periodically
      const patterns = await loadPatterns(context.workspaceRoot);
      if (patterns.length % 10 === 0) {
        await rebuildEmbeddings(context.workspaceRoot);
      }

      return {
        success: true,
        pattern: {
          id: pattern.id,
          title: pattern.title,
          category: pattern.category,
          message: 'Pattern extracted and saved successfully',
        },
        librarySize: patterns.length + 1,
      };
    },
    options: {
      timeout: 10000,
    },
  },

  /**
   * Search for similar patterns
   */
  {
    name: 'pattern_search',
    description:
      'Search the pattern library for similar solutions. Uses semantic search to find relevant patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Search query describing what you need (e.g., "how to handle transaction rollback")',
        },
        category: {
          type: 'string',
          description: 'Filter by category',
          enum: [
            'service-layer',
            'api-route',
            'ui-component',
            'data-access',
            'validation',
            'error-handling',
            'state-management',
            'testing',
            'utility',
            'other',
          ],
        },
        tags: {
          type: 'array',
          description: 'Filter by tags',
          items: { type: 'string' },
        },
        maxResults: {
          type: 'number',
          description: 'Maximum results to return (default: 5)',
          minimum: 1,
          maximum: 20,
        },
        minSimilarity: {
          type: 'number',
          description: 'Minimum similarity threshold (0-1, default: 0.3)',
          minimum: 0,
          maximum: 1,
        },
      },
      required: ['query'],
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const query = args.query as string;
      const maxResults = (args.maxResults as number) || 5;
      const minSimilarity = (args.minSimilarity as number) || 0.3;

      // Load patterns
      let patterns = await loadPatterns(context.workspaceRoot);

      // Filter by category if specified
      if (args.category) {
        patterns = patterns.filter(p => p.category === args.category);
      }

      // Filter by tags if specified
      if (args.tags && Array.isArray(args.tags)) {
        const searchTags = args.tags as string[];
        patterns = patterns.filter(p => searchTags.some(tag => p.tags.includes(tag)));
      }

      // Generate query embedding
      const queryEmbedding = embedding.embed(query);

      // Calculate similarities
      const results = patterns
        .map(pattern => ({
          pattern,
          similarity: pattern.embedding
            ? embedding.cosineSimilarity(queryEmbedding, pattern.embedding)
            : 0,
        }))
        .filter(r => r.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults);

      return {
        query,
        results: results.map(r => ({
          id: r.pattern.id,
          title: r.pattern.title,
          category: r.pattern.category,
          problem: r.pattern.problem,
          solution: r.pattern.solution,
          files: r.pattern.files,
          codeSnippet: r.pattern.codeSnippet,
          tags: r.pattern.tags,
          similarity: Math.round(r.similarity * 1000) / 1000,
          timestamp: r.pattern.timestamp,
        })),
        totalFound: results.length,
        message:
          results.length > 0
            ? `Found ${results.length} similar pattern(s)`
            : 'No similar patterns found. Try a different query or extract more patterns.',
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 30000,
    },
  },

  /**
   * List all patterns
   */
  {
    name: 'pattern_list',
    description: 'List all extracted patterns with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category',
          enum: [
            'service-layer',
            'api-route',
            'ui-component',
            'data-access',
            'validation',
            'error-handling',
            'state-management',
            'testing',
            'utility',
            'other',
          ],
        },
        sortBy: {
          type: 'string',
          description: 'Sort order',
          enum: ['recent', 'category', 'title'],
        },
      },
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      let patterns = await loadPatterns(context.workspaceRoot);

      // Filter by category
      if (args.category) {
        patterns = patterns.filter(p => p.category === args.category);
      }

      // Sort
      const sortBy = (args.sortBy as string) || 'recent';
      if (sortBy === 'recent') {
        patterns.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      } else if (sortBy === 'category') {
        patterns.sort((a, b) => a.category.localeCompare(b.category));
      } else if (sortBy === 'title') {
        patterns.sort((a, b) => a.title.localeCompare(b.title));
      }

      return {
        total: patterns.length,
        patterns: patterns.map(p => ({
          id: p.id,
          title: p.title,
          category: p.category,
          tags: p.tags,
          timestamp: p.timestamp,
          files: p.files.length,
        })),
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 60000,
    },
  },

  /**
   * Rebuild the pattern index and embeddings
   */
  {
    name: 'pattern_rebuild',
    description:
      'Rebuild the pattern index and embeddings. Call after manually modifying pattern files.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      await rebuildEmbeddings(context.workspaceRoot);

      const patterns = await loadPatterns(context.workspaceRoot);

      return {
        success: true,
        message: 'Pattern index rebuilt successfully',
        totalPatterns: patterns.length,
        vocabularySize: embedding['vocabulary']?.size || 0,
      };
    },
    options: {
      timeout: 30000,
    },
  },

  /**
   * Get a specific pattern by ID
   */
  {
    name: 'pattern_get',
    description: 'Get a specific pattern by ID with full details',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Pattern ID (UUID)',
        },
      },
      required: ['id'],
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const id = args.id as string;

      try {
        const patternsDir = getPatternsDir(context.workspaceRoot);
        const filepath = path.join(patternsDir, `${id}.json`);
        const content = await fs.readFile(filepath, 'utf-8');
        const pattern = JSON.parse(content) as ExtractedPattern;

        return {
          pattern: {
            id: pattern.id,
            title: pattern.title,
            category: pattern.category,
            problem: pattern.problem,
            solution: pattern.solution,
            files: pattern.files,
            codeSnippet: pattern.codeSnippet,
            tags: pattern.tags,
            timestamp: pattern.timestamp,
            metadata: pattern.metadata,
          },
        };
      } catch (error) {
        return {
          error: `Pattern not found: ${id}`,
          message: 'Check the pattern ID or use pattern_list to see available patterns',
        };
      }
    },
    options: {
      cacheable: true,
      cacheTTL: 120000,
    },
  },
];

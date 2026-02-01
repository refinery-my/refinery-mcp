#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://upwymawtegcaslfeulrq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwd3ltYXd0ZWdjYXNsZmV1bHJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NDgyOTUsImV4cCI6MjA4NTUyNDI5NX0.C62IRPXX9tDEACbGiDdVWh1cZf_u6KvAJLrElf7PynA';
const API_KEY = process.env.REFINERY_API_KEY;

if (!API_KEY) {
  console.error('REFINERY_API_KEY environment variable is required');
  console.error('Generate one at https://refinery.my (click API in header)');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_KEY environment variable is required');
  console.error('Get it from Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Validate API key and get user_id
let currentUserId = null;

async function validateApiKey() {
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('user_id')
    .eq('key', API_KEY)
    .single();

  if (error || !data) {
    console.error('Invalid API key');
    process.exit(1);
  }

  currentUserId = data.user_id;

  // Update last_used_at
  await supabase
    .from('user_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key', API_KEY);

  console.error(`Authenticated as user: ${currentUserId}`);
}

const server = new Server(
  { name: 'refinery', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Define tools
const tools = [
  {
    name: 'list_conversations',
    description: 'List all conversations with their quote counts',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max number of conversations to return', default: 50 },
        search: { type: 'string', description: 'Search by title' },
      },
    },
  },
  {
    name: 'get_conversation',
    description: 'Get a conversation with its columns and quotes',
    inputSchema: {
      type: 'object',
      properties: {
        conversation_id: { type: 'string', description: 'Conversation ID' },
      },
      required: ['conversation_id'],
    },
  },
  {
    name: 'list_columns',
    description: 'List columns for a conversation',
    inputSchema: {
      type: 'object',
      properties: {
        conversation_id: { type: 'string', description: 'Conversation ID' },
      },
      required: ['conversation_id'],
    },
  },
  {
    name: 'create_column',
    description: 'Create a new column in a conversation',
    inputSchema: {
      type: 'object',
      properties: {
        conversation_id: { type: 'string', description: 'Conversation ID' },
        name: { type: 'string', description: 'Column name' },
      },
      required: ['conversation_id', 'name'],
    },
  },
  {
    name: 'rename_column',
    description: 'Rename a column',
    inputSchema: {
      type: 'object',
      properties: {
        column_id: { type: 'string', description: 'Column ID' },
        name: { type: 'string', description: 'New column name' },
      },
      required: ['column_id', 'name'],
    },
  },
  {
    name: 'delete_column',
    description: 'Delete a column (quotes will be moved to the first column)',
    inputSchema: {
      type: 'object',
      properties: {
        column_id: { type: 'string', description: 'Column ID' },
      },
      required: ['column_id'],
    },
  },
  {
    name: 'reorder_columns',
    description: 'Reorder columns by providing column IDs in the desired order',
    inputSchema: {
      type: 'object',
      properties: {
        conversation_id: { type: 'string', description: 'Conversation ID' },
        column_ids: { type: 'array', items: { type: 'string' }, description: 'Column IDs in desired order' },
      },
      required: ['conversation_id', 'column_ids'],
    },
  },
  {
    name: 'list_quotes',
    description: 'List quotes with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        conversation_id: { type: 'string', description: 'Filter by conversation' },
        column_id: { type: 'string', description: 'Filter by column' },
        limit: { type: 'number', description: 'Max number of quotes', default: 100 },
      },
    },
  },
  {
    name: 'search_quotes',
    description: 'Search quotes by text content',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        conversation_id: { type: 'string', description: 'Optionally limit to a conversation' },
      },
      required: ['query'],
    },
  },
  {
    name: 'move_quote',
    description: 'Move a quote to a different column',
    inputSchema: {
      type: 'object',
      properties: {
        quote_id: { type: 'string', description: 'Quote ID' },
        column_id: { type: 'string', description: 'Target column ID' },
      },
      required: ['quote_id', 'column_id'],
    },
  },
  {
    name: 'move_quotes_bulk',
    description: 'Move multiple quotes to a column at once',
    inputSchema: {
      type: 'object',
      properties: {
        quote_ids: { type: 'array', items: { type: 'string' }, description: 'Quote IDs to move' },
        column_id: { type: 'string', description: 'Target column ID' },
      },
      required: ['quote_ids', 'column_id'],
    },
  },
  {
    name: 'delete_quote',
    description: 'Delete a quote',
    inputSchema: {
      type: 'object',
      properties: {
        quote_id: { type: 'string', description: 'Quote ID' },
      },
      required: ['quote_id'],
    },
  },
  {
    name: 'list_backups',
    description: 'List conversation backups/versions',
    inputSchema: {
      type: 'object',
      properties: {
        conversation_id: { type: 'string', description: 'Conversation ID' },
      },
      required: ['conversation_id'],
    },
  },
  {
    name: 'get_backup',
    description: 'Get a specific backup with all messages',
    inputSchema: {
      type: 'object',
      properties: {
        backup_id: { type: 'string', description: 'Backup ID' },
      },
      required: ['backup_id'],
    },
  },
];

// Tool handlers
async function handleTool(name, args) {
  switch (name) {
    case 'list_conversations': {
      let query = supabase
        .from('conversations')
        .select('*, quotes(count)')
        .eq('user_id', currentUserId)
        .order('updated_at', { ascending: false })
        .limit(args.limit || 50);

      if (args.search) {
        query = query.ilike('title', `%${args.search}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return data.map(c => ({
        id: c.id,
        title: c.title,
        chatgpt_url: c.chatgpt_url,
        quote_count: c.quotes?.[0]?.count || 0,
        created_at: c.created_at,
        updated_at: c.updated_at,
      }));
    }

    case 'get_conversation': {
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', args.conversation_id)
        .eq('user_id', currentUserId)
        .single();

      if (convError) throw new Error(convError.message);

      const { data: columns } = await supabase
        .from('columns')
        .select('*')
        .eq('conversation_id', args.conversation_id)
        .order('position');

      const { data: quotes } = await supabase
        .from('quotes')
        .select('*')
        .eq('conversation_id', args.conversation_id)
        .order('position');

      return {
        ...conversation,
        columns: columns || [],
        quotes: quotes || [],
      };
    }

    case 'list_columns': {
      const { data, error } = await supabase
        .from('columns')
        .select('*')
        .eq('conversation_id', args.conversation_id)
        .order('position');

      if (error) throw new Error(error.message);
      return data;
    }

    case 'create_column': {
      // Get max position
      const { data: existing } = await supabase
        .from('columns')
        .select('position')
        .eq('conversation_id', args.conversation_id)
        .order('position', { ascending: false })
        .limit(1);

      const newPosition = (existing?.[0]?.position ?? -1) + 1;

      const { data, error } = await supabase
        .from('columns')
        .insert({
          conversation_id: args.conversation_id,
          name: args.name,
          position: newPosition,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }

    case 'rename_column': {
      const { data, error } = await supabase
        .from('columns')
        .update({ name: args.name })
        .eq('id', args.column_id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }

    case 'delete_column': {
      // Get the column to find its conversation
      const { data: column } = await supabase
        .from('columns')
        .select('conversation_id')
        .eq('id', args.column_id)
        .single();

      if (!column) throw new Error('Column not found');

      // Find another column to move quotes to
      const { data: otherColumns } = await supabase
        .from('columns')
        .select('id')
        .eq('conversation_id', column.conversation_id)
        .neq('id', args.column_id)
        .limit(1);

      if (otherColumns?.length > 0) {
        // Move quotes to first available column
        await supabase
          .from('quotes')
          .update({ column_id: otherColumns[0].id })
          .eq('column_id', args.column_id);
      }

      const { error } = await supabase
        .from('columns')
        .delete()
        .eq('id', args.column_id);

      if (error) throw new Error(error.message);
      return { success: true };
    }

    case 'reorder_columns': {
      const updates = args.column_ids.map((id, index) => ({
        id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from('columns')
          .update({ position: update.position })
          .eq('id', update.id);
      }

      return { success: true };
    }

    case 'list_quotes': {
      let query = supabase
        .from('quotes')
        .select('*, conversations!inner(title, user_id)')
        .eq('conversations.user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(args.limit || 100);

      if (args.conversation_id) {
        query = query.eq('conversation_id', args.conversation_id);
      }
      if (args.column_id) {
        query = query.eq('column_id', args.column_id);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    }

    case 'search_quotes': {
      let query = supabase
        .from('quotes')
        .select('*, conversations!inner(title, user_id)')
        .eq('conversations.user_id', currentUserId)
        .ilike('text', `%${args.query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (args.conversation_id) {
        query = query.eq('conversation_id', args.conversation_id);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    }

    case 'move_quote': {
      const { data, error } = await supabase
        .from('quotes')
        .update({ column_id: args.column_id })
        .eq('id', args.quote_id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }

    case 'move_quotes_bulk': {
      const { data, error } = await supabase
        .from('quotes')
        .update({ column_id: args.column_id })
        .in('id', args.quote_ids)
        .select();

      if (error) throw new Error(error.message);
      return { moved: data.length };
    }

    case 'delete_quote': {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', args.quote_id);

      if (error) throw new Error(error.message);
      return { success: true };
    }

    case 'list_backups': {
      const { data, error } = await supabase
        .from('conversation_backups')
        .select('id, version, message_count, file_path, created_at')
        .eq('conversation_id', args.conversation_id)
        .order('version', { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    }

    case 'get_backup': {
      // Get metadata
      const { data: backup, error } = await supabase
        .from('conversation_backups')
        .select('*')
        .eq('id', args.backup_id)
        .single();

      if (error) throw new Error(error.message);

      // Download messages from Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('dumps')
        .download(backup.file_path);

      if (downloadError) throw new Error(downloadError.message);

      const messages = JSON.parse(await fileData.text());

      return {
        ...backup,
        messages,
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await handleTool(name, args || {});
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  await validateApiKey();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ChatGPT Quotes MCP server running');
}

main().catch(console.error);

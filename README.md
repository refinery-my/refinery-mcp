# Refinery MCP Server

MCP server for managing ChatGPT quotes, columns, and conversations.

## Installation

```bash
npm install -g refinery-mcp
```

## Setup

1. Generate an API key in the web app:
   - Open [refinery.my](https://refinery.my)
   - Click "API" in the header
   - Click "Generate" to create a new key
   - Copy the key (you won't see it again!)

2. Get your Supabase service key:
   - Supabase Dashboard → Settings → API
   - Copy the `service_role` key (keep it secret!)

3. Add to your Claude config (`~/.claude.json` or Claude Code settings):

```json
{
  "mcpServers": {
    "refinery": {
      "command": "refinery-mcp",
      "env": {
        "REFINERY_API_KEY": "your-key-here",
        "SUPABASE_SERVICE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## Available Tools

### Conversations
- `list_conversations` — List all conversations with quote counts
- `get_conversation` — Get conversation with columns and quotes

### Columns
- `list_columns` — List columns for a conversation
- `create_column` — Create a new column
- `rename_column` — Rename a column
- `delete_column` — Delete a column (moves quotes to first column)
- `reorder_columns` — Change column order

### Quotes
- `list_quotes` — List quotes (filter by conversation/column)
- `search_quotes` — Search quotes by text
- `move_quote` — Move quote to another column
- `move_quotes_bulk` — Move multiple quotes at once
- `delete_quote` — Delete a quote

## Examples

"Show me all my conversations"
"Find quotes mentioning React"
"Create a column called 'Important' in conversation X"
"Move all quotes about testing to the 'QA' column"

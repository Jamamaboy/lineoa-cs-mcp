# Trial: chatwoot-mcp

```
$ CHATWOOT_BASE_URL=http://127.0.0.1:9 CHATWOOT_API_TOKEN=DUMMY \
  npx -y @modelcontextprotocol/inspector --cli node dist/index.js --method tools/list   (hugoblanc/chatwoot-mcp)
-> 4 tools

chatwoot_list_conversations
    List conversations from a Chatwoot account with filtering options.
    params: account_id, page, response_format, status, assignee_type, inbox_id
chatwoot_get_conversation
    Get detailed information about a specific Chatwoot conversation.
    params: account_id, conversation_id, response_format
chatwoot_list_messages
    List all messages in a Chatwoot conversation.
    params: account_id, conversation_id, response_format
chatwoot_create_message
    Create a new message in a Chatwoot conversation.
    params: account_id, conversation_id, content, message_type, private
```

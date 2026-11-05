# slack-mcp-server trial

```
$ npm view slack-mcp-server  -> 1.3.0, bin slack-mcp-server (platform binaries via optionalDependencies, no postinstall)
$ npm install --ignore-scripts slack-mcp-server   # in _vendor/slack-mcp-server/npm-run
$ env -u SLACK_MCP_ADD_MESSAGE_TOOL SLACK_MCP_XOXC_TOKEN=xoxc-DUMMY SLACK_MCP_XOXD_TOKEN=xoxd-DUMMY npx @modelcontextprotocol/inspector --cli ./node_modules/.bin/slack-mcp-server --transport stdio --method tools/list
Failed to connect to MCP server: MCP error -32000: Connection closed
$ (same env) ./node_modules/.bin/slack-mcp-server --transport stdio </dev/null
{"level":"fatal","message":"Authentication failed - check your Slack tokens","error":"invalid_auth", ... pkg/provider/api.go:761}
```

It contacted Slack (auth.test) with the dummy tokens at startup and exited; stopped there. Tool list read statically from pkg/server/server.go.

Error: Command failed: .../slack-mcp-server-darwin-arm64 --transport stdio   (exit 1)

=> server calls Slack auth.test at startup, so tools/list cannot be reached with dummy tokens (stopped, as per brief).

Static read of pkg/server/server.go (registered by default w/o env flags):
conversations_history, conversations_replies, conversations_search_messages, users_search, conversations_unreads,
conversations_leave, conversations_join, channels_list, channels_me, usergroups_*, saved_*
Opt-in only: conversations_add_message (SLACK_MCP_ADD_MESSAGE_TOOL), reactions_add/remove (SLACK_MCP_REACTION_TOOL),
attachment_get_data (SLACK_MCP_ATTACHMENT_TOOL), conversations_mark (SLACK_MCP_MARK_TOOL)
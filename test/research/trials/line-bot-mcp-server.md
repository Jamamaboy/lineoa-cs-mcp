# Trial: line-bot-mcp-server

```
$ CHANNEL_ACCESS_TOKEN=DUMMY DESTINATION_USER_ID=DUMMY NPM_CONFIG_IGNORE_SCRIPTS=true \
  npx -y @modelcontextprotocol/inspector --cli npx -y @line/line-bot-mcp-server --method tools/list
(serverInfo: line-bot 0.5.0)  -> 12 tools, no list-chats / read-chat / search

push_text_message
    Push a simple text message to a user via LINE. Use this for sending plain text messages without formatting.
    params: userId, message
push_flex_message
    Push a highly customizable flex message to a user via LINE. Supports both bubble (single container) and carous
    params: userId, message
broadcast_text_message
    Broadcast a simple text message via LINE to all users who have followed your LINE Official Account. Use this f
    params: message
broadcast_flex_message
    Broadcast a highly customizable flex message via LINE to all users who have added your LINE Official Account. 
    params: message
get_profile
    Get detailed profile information of a LINE user including display name, profile picture URL, status message an
    params: userId
get_message_quota
    Get the message quota and consumption of the LINE Official Account. This shows the monthly message limit and c
    params: 
get_rich_menu_list
    Get the list of rich menus associated with your LINE Official Account.
    params: 
delete_rich_menu
    Delete a rich menu from your LINE Official Account.
    params: richMenuId
set_rich_menu_default
    Set a rich menu as the default rich menu.
    params: richMenuId
cancel_rich_menu_default
    Cancel the default rich menu.
    params: 
create_rich_menu
    Create a rich menu based on the given actions. Generate and upload a rich menu image based on the given action
    params: chatBarText, actions
get_follower_ids
    Get a list of user IDs of users who have added the LINE Official Account as a friend. This allows you to obtai
    params: start, limit
```

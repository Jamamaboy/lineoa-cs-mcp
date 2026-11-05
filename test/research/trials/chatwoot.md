# chatwoot trial (static)
$ git clone --depth 1 https://github.com/chatwoot/chatwoot _vendor/chatwoot   # ok, 9904 files
$ gh api repos/chatwoot/chatwoot  -> stars 38917, forks 9472, open_issues 1615, pushed 2026-11-05, license NOASSERTION (MIT core + enterprise dir), Ruby
Docker not run. Static read of db/schema.rb and app/models.
conversations: account_id, inbox_id, status(int), assignee_id, contact_id, display_id, contact_inbox_id, uuid, identifier, last_activity_at, team_id, snoozed_until, custom_attributes, additional_attributes, first_reply_created_at, priority, sla_policy_id, waiting_since, contact_last_seen_at, agent_last_seen_at
  enum status: open 0, resolved 1, pending 2, snoozed 3 ; priority: low 0, medium 1, high 2, urgent 3
messages: content(text), account_id, inbox_id, conversation_id, message_type(int), private(bool), status(int), source_id(text), content_type(int), content_attributes(json), sender_type, sender_id, external_source_ids, additional_attributes, processed_message_content
  enum message_type: incoming 0, outgoing 1, activity 2, template 3
  enum content_type: text 0, input_text 1, input_textarea 2, input_email 3, input_select 4, cards 5, form 6, article 7, incoming_email 8, input_csat 9, integrations 10, sticker 11, voice_call 12
  enum status: sent 0, delivered 1, read 2, failed 3
attachments: file_type(int, default 0), external_url, coordinates_lat, coordinates_long, message_id, account_id, fallback_title, extension, meta(jsonb)  (+ ActiveStorage `file`)
  enum file_type: image 0, audio 1, video 2, file 3, location 4, fallback 5, share 6, story_mention 7, contact 8, ig_reel 9, ig_post 10, ig_story 11, embed 12
  validate: size <= MAXIMUM_FILE_UPLOAD_SIZE (default 40 MB), content-type whitelist
contacts: name, email, phone_number, account_id, identifier, additional_attributes, custom_attributes, last_activity_at, contact_type, middle_name, last_name, location, country_code, blocked, company_id
contact_inboxes: contact_id, inbox_id, source_id (channel user id, e.g. LINE userId), hmac_verified, pubsub_token
channel_line: line_channel_id, line_channel_secret, line_channel_token (official Messaging API)
Screenshots: chatwoot-1 (GitHub), chatwoot-2 (website), chatwoot-3 (LINE setup doc; narrow layout)

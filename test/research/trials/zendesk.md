# zendesk trial (partial)

Product is closed SaaS: not signed up. Profiled the most-starred community MCP: reminia/zendesk-mcp-server (125 stars, Apache-2.0).
(zcaceres/zendesk-mcp-server returned 404; next: mattcoatsworth 30, koundinya 16 stars.)

$ git clone --depth 1 https://github.com/reminia/zendesk-mcp-server _vendor/zendesk/repo
$ uv venv ../venv && uv pip install -e . pytest   (installed zenpy 2.0.57, uvicorn 0.54.0)
$ python -I -m pytest -q tests   -> collection errors: No module named 'responses'
$ uv pip install responses ; python -I -m pytest -q tests
$ pytest -q tests/test_tokens.py tests/test_config.py
............................                                             [100%]
28 passed in 0.44s

$ pytest -q tests  (after installing responses)
ERROR tests/test_server_oauth_integration.py::test_permission_error_from_zendesk_is_surfaced_not_masked
ERROR tests/test_server_oauth_integration.py::test_missing_tokens_tell_the_operator_to_bootstrap
82 passed, 10 errors in 3.30s
10 errors cause: ImportError: cannot import name 'types' from 'mcp.server' (installed mcp version mismatch). Server not started.

Static read: server.py tools get_ticket, create_ticket, get_tickets, get_ticket_comments, create_ticket_comment, get_ticket_attachment, update_ticket.
zendesk_client.get_ticket_attachment: image MIME allowlist (jpeg/png/gif/webp), magic bytes check, 10 MB streamed cap, base64 result.
tokens.py: token file mode 0600; OAuth auth code + PKCE public client; API token auth deprecated (off 2027-04-30).

Docs read (WebFetch/WebSearch): support.zendesk.com LINE article (admin adds Channel ID+secret, webhook URL; plans Suite or Support+Social Messaging add-on; Response mode Bot per search summary);
developer.zendesk.com ticket-attachments (uploads token 60 min, redact, malware scan); messaging file limit 50 MB per Zendesk support search snippet.
No official Zendesk MCP found in search results (not exhaustively verified).

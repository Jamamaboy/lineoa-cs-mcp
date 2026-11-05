# intercom-mcp trial (partial, no credentials)

$ git clone --depth 1 https://github.com/intercom/intercom-mcp-server _vendor/intercom-mcp/src
-> files: README.md + Intercom logo SVGs only (docs-only repo; server is closed source, hosted)

$ gh api repos/intercom/intercom-mcp-server  -> stars 8, forks 11, open_issues 3, last push 2025-09-22

Public OAuth metadata (GET, no auth, nothing sent to /mcp):
$ curl -s https://mcp.intercom.com/.well-known/oauth-protected-resource
{"resource":"https://mcp.intercom.com","authorization_servers":["https://mcp.intercom.com"],"scopes_supported":["mcp","operator"],"bearer_methods_supported":["header"]}

$ curl -s https://mcp.intercom.com/.well-known/oauth-authorization-server
{
    "issuer": "https://mcp.intercom.com",
    "authorization_endpoint": "https://mcp.intercom.com/authorize",
    "token_endpoint": "https://mcp.intercom.com/token",
    "registration_endpoint": "https://mcp.intercom.com/register",
    "scopes_supported": [
        "mcp",
        "operator"
    ],
    "response_types_supported": [
        "code"
    ],
    "response_modes_supported": [
        "query"
    ],
    "grant_types_supported": [
        "authorization_code",
        "refresh_token"
    ],
    "token_endpoint_auth_methods_supported": [
        "client_secret_basic",
        "client_secret_post",
        "none"
    ],
    "revocation_endpoint": "https://mcp.intercom.com/token",
    "code_challenge_methods_supported": [
        "S256"
    ]
}

Not done: tools/list against https://mcp.intercom.com/mcp (needs OAuth/bearer token).
Tools list taken from docs https://developers.intercom.com/docs/guides/mcp (14 + 5 Fin Operator); repo README is outdated (lists 6).

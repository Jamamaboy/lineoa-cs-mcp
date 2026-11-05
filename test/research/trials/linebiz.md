# linebiz trial (static + unit tests; no login possible - no LINE OA account)
$ git clone --depth 1 https://github.com/PrakritManStudio/linebiz
$ npm install --ignore-scripts          -> EBADENGINE (tsdown needs node ^22.18; local v22.14.0; .npmrc engine-strict=true)
$ npm install --ignore-scripts --engine-strict=false   -> ok
$ npx tsc --noEmit                      -> exit 0
$ npm test  (vitest run --project unit)
 Test Files  13 passed (13) / Tests  241 passed (241) / 778ms
$ npm run build                         -> FAILED (tsdown config loading error on node 22.14; not investigated)
Integration tests need LINEBIZ_COOKIES (real session) -> not run.
Endpoints from: grep 'path:' src/resources ; CSRF in src/core/http.ts (GET /api/v1/csrfToken, header X-XSRF-TOKEN, one retry on 403); 401 body code not_login -> SESSION_EXPIRED (src/core/errors.ts).

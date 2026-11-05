# line-friend-export-v2 trial (typecheck only; scripts not executed)
$ git clone --depth 1 https://github.com/tatsuyasusukida/line-friend-export-v2
$ npm install --ignore-scripts  -> ok
$ npx tsc --noEmit --esModuleInterop --skipLibCheck --target es2020 --moduleResolution node --module commonjs 0N-*.ts -> rc=0 for 01..06
Not executed: URLs hardcoded to chat.line.biz / api.line.me / profile.line-scdn.net.
Zenn scrap found: https://zenn.dev/tatsuyasusukida/scraps/ab9bf2326b4fce (links to an article "LINE 公式アカウントの友だち一覧を出力する方法"; article URL not resolved).
Bug seen in source: loops break when `next` is absent BEFORE concatenating the final page, so the last page is dropped.

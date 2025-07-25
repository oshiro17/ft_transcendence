# ft_transcendence

for make .env
check [text](renameして.envにしてね)!


JWT_SECRET=
# ここにはJWTの秘密のカギを入れるんだよ！ランダムな文字を作ってポンって貼ってね♪

GOOGLE_CLIENT_ID=
# Google Cloud ConsoleでOAuth 2.0のクライアントIDをゲットするんだ♪  
# 1. https://console.cloud.google.com/ に行って、プロジェクト作ったり選んだりしてね。  
# 2. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」を選ぶよ。  
# 3. アプリの種類は「ウェブアプリケーション」を選んで、承認済みリダイレクトURIに `https://localhost:8443/api/auth/google/callback` を追加しよう！  
# 4. 作ったら出てくる「クライアントID」をここにペタッて貼ってね☆

GOOGLE_CLIENT_SECRET=
# 上と同じ方法で取った「クライアントシークレット」もここにペタッてしてね♪  
# Google Cloud Consoleの「認証情報」ページで見れるよ！

GOOGLE_REDIRECT_URI=https://localhost:8443/api/auth/google/callback
# これがGoogleのOAuth認証で使うリダイレクトURIだよ！  
# Google Cloud Consoleの「承認済みのリダイレクトURI」にもちゃんと登録してね♪

MAIL_HOST=smtp.gmail.com
# メール送るときに使うSMTPサーバーの名前だよ〜。このままでOK！

MAIL_PORT=587
# SMTPのポート番号だよ。Gmail使うから587にしといてね♪

MAIL_USER=
# メール送るためのGmailアドレスをここに

MAIL_PASS=
# ここにはメール送信用のパスワードを入れるよ！
# 普通のGmailパスワードじゃダメで、2段階認証を有効にしたGmailアカウントの「アプリパスワード」を使う必要があるの。
# 1. まず送信用に使うGmailアカウントを用意して、Googleアカウント設定から「2段階認証プロセス」を有効にしてね。
#    → https://myaccount.google.com/security にアクセスして「2段階認証プロセス」をオンにするよ。
# 2. 2段階認証がONになったら、同じ画面で「アプリ パスワード」を発行する項目が出てくるよ。
#    もし画面で見つけきれなかったら、「Gmail アプリパスワード 発行」とかで検索すればすぐ出てくるから安心してね♪
# 3. アプリは「メール」、デバイスは「カスタム名（自分でわかる名前）」を選んで作成！
# 4. 出てきた16桁のアプリパスワードをここにペタッと貼り付ければOK

MAIL_FROM=
# 送信元のメールアドレスだよ！普通はMAIL_USERと同じでおk
# ft_transcendence

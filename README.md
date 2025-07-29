虎戦
his project was inspired by and partially based on the repository:
https://github.dev/yvann-ba/ft_transcendence



<file name=0 path=/Users/hamster/Desktop/testtesttesttest/README.md># ft_transcendence

To create your `.env` file, please check [this file](renameして.envにしてね) and rename it to `.env`.

---

### JWT_SECRET
```
JWT_SECRET=
```
JWTの秘密鍵をここに入力してください。ランダムな文字列を生成して貼り付けてください。

---

### GOOGLE_CLIENT_ID
```
GOOGLE_CLIENT_ID=
```
Google Cloud ConsoleからOAuth 2.0のクライアントIDを取得してください。  
1. https://console.cloud.google.com/ にアクセスし、プロジェクトを作成または選択します。  
2. 「API とサービス」→「認証情報」→「認証情報を作成」→「OAuth クライアントID」を選択します。  
3. アプリケーションの種類で「ウェブアプリケーション」を選び、`https://localhost:8443/api/auth/google/callback` を承認済みのリダイレクトURIに追加します。  
4. 生成されたクライアントIDをここに貼り付けてください。

---

### GOOGLE_CLIENT_SECRET
```
GOOGLE_CLIENT_SECRET=
```
Google Cloud Consoleで取得したクライアントシークレットをここに貼り付けてください。「認証情報」ページで確認できます。

---

### GOOGLE_REDIRECT_URI
```
GOOGLE_REDIRECT_URI=https://localhost:8443/api/auth/google/callback
```
Google OAuth認証で使用するリダイレクトURIです。Google Cloud Consoleの「承認済みのリダイレクトURI」にも登録されていることを確認してください。

---

### MAIL_HOST
```
MAIL_HOST=smtp.gmail.com
```
メール送信用のSMTPサーバー名です。Gmailの場合はこのままで問題ありません。

---

### MAIL_PORT
```
MAIL_PORT=587
```
SMTPのポート番号です。Gmailの場合は587を使用します。

---

### MAIL_USER
```
MAIL_USER=
```
メール送信用のGmailアドレスを入力してください。

---

### MAIL_PASS
```
MAIL_PASS=
```
メール送信用のパスワードを入力してください。通常のGmailパスワードは使用できません。  
2段階認証を有効にしたGmailアカウントで「アプリパスワード」を生成して使用してください。  

アプリパスワードの作成手順：  
1. メール送信用のGmailアカウントを用意し、https://myaccount.google.com/security で「2段階認証プロセス」を有効にします。  
2. 2段階認証が有効になると、同じページに「アプリパスワード」を生成するオプションが表示されます。  
3. 見つからない場合は「Gmail アプリパスワード 作成方法」などで検索してください。  
4. 「メール」をアプリに選び、任意のデバイス名を入力してパスワードを生成します。  
5. 生成された16文字のアプリパスワードをここに貼り付けてください。

---

### MAIL_FROM
```
MAIL_FROM=
```
送信者のメールアドレスです。通常は `MAIL_USER` と同じ値を設定します。
</file>

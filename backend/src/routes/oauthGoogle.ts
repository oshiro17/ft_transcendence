//Google OAuth によるソーシャルログイン
// ・Google の認可画面へ遷移し、認可コードを受け取る
// ・認可コードをアクセストークンに交換
// ・アクセストークンでユーザー情報を取得
// ・自前 DB にユーザーを新規登録または更新
// ・JWT を発行して Cookie に保存
// ・ポップアップフロー用の HTML を返す

import { FastifyInstance } from 'fastify';
import config from '../config/fastifyconfig';
import { checkUserLogin, createUserOAuth, checkUserByGoogleId,} from '../queries/users';

export default async function oauthGoogleRoutes(fastify: FastifyInstance) {

  // STEP 1: /auth/google
  // ・Google の OAuth 2.0 認可画面へリダイレクトする
//   - client_id, redirect_uri, response_type, scope を URL に組み込む
  fastify.get('/auth/google', async (request, reply) => {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.googleClientId}&redirect_uri=${encodeURIComponent(config.googleRedirectUri as string|number|boolean)}&response_type=code&scope=openid%20email%20profile`;
    reply.redirect(url);
  });

  // STEP 2: /auth/google/callback
  // ・Google から返された認可コード (code) を受け取る
//   - コードがなければログイン失敗としてリダイレクト
  fastify.get('/auth/google/callback', async (request, reply) => {
    
    console.log("1. Callback route reached");
    const code = (request.query as any).code as string;
    console.log("2. Auth code received:", code ? "Yes" : "No");
    if (!code) return reply.redirect('/login?error=auth_failed');

    try {
      // STEP 3: 認可コードを使って Google のトークン API と通信しアクセストークンを取得
//       - POST リクエストで code, client_id, client_secret, redirect_uri, grant_type を送信
      console.log("3. Starting token exchange with Google");
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.googleClientId!,
          client_secret: config.googleClientSecret!,
          redirect_uri: config.googleRedirectUri!,
          grant_type: 'authorization_code',
        }),
      });

      console.log("4. Token response received:", tokenRes.status);
      const tokenData = await tokenRes.json();
      console.log("5. Token data parsed");
      if (!tokenRes.ok) throw new Error(tokenData.error_description || 'Error OAuth Google');

      const accessToken = tokenData.access_token;
      console.log("6. Access token extracted:", accessToken ? "Yes" : "No");
      if (!accessToken) throw new Error('Access token not received from Google');

      // STEP 4: 取得したアクセストークンを Authorization ヘッダーにセットして
//       Google の userinfo エンドポイントからユーザー情報を取得
      console.log("7. Fetching user info from Google");
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      console.log("8. User info response:", userRes.status);
      if (!userRes.ok) {
        throw new Error(`Failed to fetch user info: ${userRes.status} ${userRes.statusText}`);
      }

      console.log("9. Parsing user data from Google");
      const googleUser = await userRes.json();
      console.log("10. Google user data:", JSON.stringify(googleUser));

      const firstName = googleUser.given_name || "";
      const lastName = googleUser.family_name || "";



      // STEP 5: 取得した Google のユーザーデータを自社フォーマットに整形
//       - ユーザー名を重複しにくい形にランダム要素付きで生成
      let username = lastName.toLowerCase() + firstName.toLowerCase() + Math.floor(Math.random() * 100000);
      let add = "";

      if (username.length <= 5) {
        const alphanumeric = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (let i = username.length; i < 15 - username.length; i++) {
          add += alphanumeric[Math.floor(Math.random() * alphanumeric.length)];
        }
      }

      username = add + username;

      const userData = {
        username: username,
        googleID: googleUser.id,
        firstName: firstName,
        lastName: lastName,
        email: googleUser.email,
      };
      
      fastify.log.info(`User data: ${JSON.stringify(userData)}`);

      console.log('11. Formatted user data:', userData);
      fastify.log.info(`12. User data for fastify logger: ${JSON.stringify(userData)}`);
      console.log("13. Google picture URL:", googleUser.picture);

      // STEP 6: 自社 DB に同じ google_id のユーザーが存在するか確認
      let user = await checkUserByGoogleId(userData.googleID);
      fastify.log.info(`User found: ${JSON.stringify(user)}`);
      if (user === null) {
        // ・ユーザーが存在しなければ、createUserOAuth で新規登録
        user = await createUserOAuth(userData.googleID, userData.username, userData.firstName, userData.lastName, userData.email);
      }

      // STEP 7: 自社サービス用の JWT を発行 (userId をペイロードに含める)
      const jwtToken = fastify.jwt.sign({ userId: user.id });
      
      // STEP 8: JWT を sessionid クッキーに保存し、
//       auth_token フラグを別クッキーに保存
      reply
        .setCookie('sessionid', jwtToken, {
          httpOnly: true,
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          sameSite: 'lax', // Use 'lax' instead of 'none'
          secure: process.env.NODE_ENV === 'production'
        })
        .setCookie('auth_token', 'true', {
          httpOnly: false,
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        })
      // STEP 9: ポップアップで開いた場合は親ウィンドウへ postMessage し閉じる
//       直接開かれた場合は /home へリダイレクト
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <script>
                if (window.opener) {
                    window.opener.postMessage('auth-success', window.location.origin);
                    window.close();
                } else {
                    window.location.href = '/home';
                }
            </script>
        </head>
        <body>Authentication successful! You can close this window.</body>
        </html>
    `;
    
    reply.type('text/html').send(html);

    // 認証フローでエラーがあった場合はログに記録し、/login?error=auth_failed へリダイレクト
    } catch (err) {
      fastify.log.error(err);
      return reply.redirect('/login?error=auth_failed');
    }
  });
}
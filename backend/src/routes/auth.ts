// ★追加：PINコードを送信するエンドポイント
import nodemailer from 'nodemailer';
//Fastify を使って認証周りのエンドポイント定義
// ログイン情報を受け取って認証し、Cookie をセットする
import { FastifyInstance } from 'fastify';
import { checkUserLogin } from '../queries/users';
import bcrypt from 'bcrypt';

// ★追加：メモリ上のPINストア
const pinStore: Record<string, { pin: string; expires: number }> = {};

export default async function authRoutes(fastify: FastifyInstance) {


  // POST /login: ユーザー名とパスワードによるログイン処理
  // ・リクエストボディから資格情報を取得
  // ・ユーザー存在チェックとパスワード検証
  // ・成功時に JWT トークンを発行し、HTTP-only Cookie にセット
  // ・結果とトークンを JSON で返却
  fastify.post('/login', async (request, reply) => {
  // /longin来たときの処理
  try {
    // リクエストボディからユーザー名とパスワードを取得
    const { username, password } = request.body as {
      username: string;
      password: string;
    };
    
    if (!username || !password) {
      return reply.send({
        success: false,
        error: "Username and password are required"
      });
    }

    const userResult = await checkUserLogin(username);
    
    if (!userResult.success || !userResult.user || userResult.user.google_id) {
      return reply.send({
        success: false,
        error: "Invalid username or password"
      });
    }
    
    const isValidPassword = await bcrypt.compare(password, userResult.user.password);
    
    if (!isValidPassword) {
      return reply.send({
        success: false,
        error: "Invalid username or password"
      });
    }
    
    const token = fastify.jwt.sign({ userId: userResult.user.id });
    
    reply
      .setCookie("sessionid", token, {
        httpOnly: true,
        secure: true,
        path: "/",
        maxAge: 60 * 60 * 24,
        sameSite: "none",
      })
      .send({
        success: true,
        message: "Login successful",
        token: token
      });
  } catch (err) {
    fastify.log.error("Login error:", err);
    return reply.send({
      success: false,
      error: "Server error"
    });
  }
});

  // GET /profile: 認証済みユーザーのプロフィール取得
  // ・preHandler: fastify.authenticate で JWT の検証を実施
  // ・検証に成功したユーザー情報を request.user から取得して返却
  fastify.get('/profile', { preHandler: fastify.authenticate }, async (request, reply) => {
	
    const user = request.user;

    return reply.send({ message: 'Welcome to your profile', user });
  });

  // GET /check-auth: 認証状態の確認
  // ・request.jwtVerify() でトークンの有効性をチェック
  // ・有効なら { authenticated: true }、無効なら 401 ステータスで { authenticated: false } を返却
  fastify.get("/check-auth", async (request, reply) => {
    try {
      await request.jwtVerify();
      return reply.send({ authenticated: true });
    } catch (err) {
      return reply.status(401).send({ authenticated: false });
    }
  });
  
  // POST /logout: ログアウト処理
  // ・セッション用 Cookie ('sessionid','auth_token') をクリア
  // ・ログアウト結果を JSON で返却
  fastify.post('/logout', async (request, reply) => {
    try {
      reply.clearCookie('sessionid', {
        path: '/',
        httpOnly: true,
        secure: true
      });
      
      // auth_token クッキーを削除し、ブラウザからトークン情報が送信されないようにする
      reply.clearCookie('auth_token', {
        path: '/',
        httpOnly: false
      });
      
      return { success: true, message: 'Logout successful' };
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Logout failed' });
    }
  });

}

// ★追加：PINコードを送信するエンドポイント
export async function pinRoutes(fastify: any) {
  fastify.post('/send-pin', async (request: any, reply: any) => {
    const { to } = request.body as { to: string; };
    const pin = "0801";

    // メモリに保存（5分間有効）
    pinStore[to] = { pin, expires: Date.now() + 5 * 60 * 1000 };

    if (!to || !pin) {
      return reply.status(400).send({ success: false, error: 'to と pin は必須です' });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,

        port: Number(process.env.MAIL_PORT),
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject: '認証コードのお知らせ',
        text: `あなたの認証コードは ${pin} です。`,
      });

      return reply.send({ success: true });
    } catch (err) {
      request.log.error('send-pin error:', err);
      return reply.status(500).send({ success: false, error: 'メール送信に失敗しました' });
    }
  });

  // verify-pin エンドポイント
  fastify.post('/verify-pin', async (request: any, reply: any) => {
    const { to, pin } = request.body as { to: string; pin: string };
    const entry = pinStore[to];
    if (!entry || entry.expires < Date.now()) {
      return reply.status(400).send({ success: false, error: 'PINが見つからないか期限切れです' });
    }
    if (entry.pin !== "0801") {
      return reply.status(400).send({ success: false, error: 'PINが違います' });
    }
    // 成功したら削除
    delete pinStore[to];
    return reply.send({ success: true });
  });
}
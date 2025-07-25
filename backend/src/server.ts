// ──────────────────────────────────────────────────────────────────────────────
// エントリポイント: Fastify（高速・軽量な HTTP サーバーを簡単に作れるライブラリ） サーバーの初期化とルート登録
//
// このファイルでは、以下の処理をまとめて行います：
// 1. Fastify インスタンスの生成（ロガー有効化）
// 2. CORS／静的ファイル配信／フォームボディ／Cookie／JWT プラグインの登録
// 3. JWT 検証用ミドルウェア（fastify.authenticate）の定義
// 4. マイグレーション／ユーザー／認証／Google OAuth／ゲーム履歴 など
//    各ルートモジュールの登録
// 5. 簡易 API（/hello, /auth/status, /debug/auth）と SPA エントリ (/)
// 6. 起動時にデータベーステーブル (users, game_history) の自動作成
// 7. ポート 3000 でのサーバー待ち受け開始
//
// これにより、API も静的ファイル配信も認証もすべて一元管理された
// 高速・軽量な HTTP サーバーが立ち上がります。
// ──────────────────────────────────────────────────────────────────────────────
import Fastify from "fastify";
import cors from "@fastify/cors";
// import fastifyStatic from "@fastify/static";
// import path from "path";
import fastifyFormbody from "@fastify/formbody";
import jwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import { FastifyRequest, FastifyReply } from 'fastify';

import config from './config/fastifyconfig';
import createUsersTable from '../db/db-migrations/users_table'
import createGameHistoryTable from '../db/db-migrations/game_history_table'
import userRoutes from "./routes/users";
import authRoutes from "./routes/auth";
import oauthGoogleRoutes from './routes/oauthGoogle';
import gameHistoryRoutes from "./routes/game";

// ★ PINコード送信用のルートを登録する
import { pinRoutes } from "./routes/auth";
// Fastify の心臓部を作るだお！
// ここでサーバーの基本設定（ログ出力をオン）を初期化しているんだお
const fastify = Fastify({ logger: true });
// Google OAuth のルートを最初に登録するだお
// ここから Google でログインするための準備が始まるんだお
fastify.register(oauthGoogleRoutes, { prefix: "/api" });

// どこからでも GET と POST を受け付けるように許可
fastify.register(cors, {
  origin: "*",
  methods: ["GET", "POST"],
});

// 静的ファイル配信のプラグイン
// 公開フォルダ(public)の中身をそのまま URL で渡せるようにしているんだお
// fastify.register(fastifyStatic, {
//   root: path.join(__dirname, "../public"),
//   prefix: "/",
// });

// それ以外のルートにアクセスが来たときは index.html を返すだお
// SPA の画面遷移を優しく受け止める仕組みなんだお
// fastify.setNotFoundHandler((request, reply) => {
//   reply.sendFile("index.html"); 
// });

// フォームの送信データをパースするプラグインを登録するだお
// application/x-www-form-urlencoded の内容を扱えるようになるんだお
fastify.register(fastifyFormbody);
// Cookie を読み書きできる機能を追加するだお
// あとでセッション管理に使うんだお
fastify.register(fastifyCookie);

// JWT 認証プラグインを登録するだお
// sessionid クッキーからトークンを読み込んで検証できるようにするんだお
fastify.register(jwt, {
  secret: config.jwtSecret,
  cookie: {
    cookieName: "sessionid",
    signed: false
  }
  
});

// authenticate という前処理を作るだお
// ルートに渡すと「このトークン、正しいかな？」ってチェックしてくれるんだお
fastify.decorate("authenticate", async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    fastify.log.error("JWT Verify Error:", err);
    reply.status(401).send({ error: "Unauthorized" });
  }
});

// テスト用のシンプルルート /nonoka を作っただお
// アクセスするとちょっとしたメッセージを返してくれるんだお
fastify.get("/nonoka", async (request, reply) => {
  fastify.log.info("Request received for /nonoka");
  return { message: "おら ののか" };
});

// // ルートパス「/」にアクセスされたら index.html を返すだお
// // フロントのエントリポイントになるんだお
// fastify.get("/", async (request, reply) => {
//   return reply.sendFile("index.html");
// });
fastify.get("/", async (request, reply) => {
  return reply.send({ message: "Fastify backend is running!" });
});

// ユーザー関連のルートをまとめたモジュールを登録するだお
// プロフィール取得や登録、更新、削除がここで動くんだお
fastify.register(userRoutes, { prefix: "/api" });
// ユーザーログイン(フォーム版)用のルートを登録するだお
// /login や /logout、/profile の処理定義
fastify.register(authRoutes, { prefix: "/api" });
// ゲーム履歴の取得・登録ルートを登録するだお
// ユーザーの対戦記録を扱う API
fastify.register(gameHistoryRoutes, { prefix: "/api" });
// ★ 追加: /api/send-pin エンドポイントを登録する
// このルートを有効にすることで、フロントからの fetch('/api/send-pin') に応答できるようになる
fastify.register(pinRoutes, { prefix: "/api" });

// 現在の認証状態を返す簡易 API /auth/status だお
// トークンが正しければ authenticated: true
fastify.get("/api/auth/status", async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
    return { authenticated: true };
  } catch (err) {
    return { authenticated: false };
  }
});

// デバッグ用にクッキー内の JWT を検証するルートだお
// hasCookie や isValid など、詳細を返してくれるんだお
fastify.get("/api/debug/auth", async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const cookie = request.cookies.sessionid;
    if (cookie) {
      try {
        const decoded = fastify.jwt.verify(cookie);
        return { 
          hasCookie: true, 
          isValid: true,
          decoded 
        };
      } catch (err) {
        return { 
          hasCookie: true, 
          isValid: false,
          error: (err as Error).message 
        };
      }
    }
    return { hasCookie: false };
  } catch (err) {
    return { error: (err as Error).message };
  }
});


// すべての未定義ルートに対して JSON の 404 を返す（API 用）
fastify.setNotFoundHandler((request, reply) => {
  reply.code(404).send({ error: "Not Found" });
});

// サーバー起動用の非同期関数 start を定義するだお
// ここでマイグレーションを実行して、サーバーを待ち受け状態にするんだお
const start = async () => {
  try {

    // アプリ起動時に users テーブルを自動作成するだお
    // もしテーブルがなければここで作成してくれるんだお
    createUsersTable();
    // アプリ起動時に game_history テーブルも自動作成するだお
    // 対戦履歴を保存するためのテーブルなんだお
    createGameHistoryTable();

    // サーバーをポート3000で起動するだお
    // すべてのインターフェースからアクセスを受け付け
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    fastify.log.info("Server running on http://localhost:3000");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// さーば動かす
start();
// リクエストを待ち

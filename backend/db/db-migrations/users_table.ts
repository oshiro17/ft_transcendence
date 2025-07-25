//  * ──────────────────────────────────────────────────────────────────────────────
//  * マイグレーション: users テーブル作成スクリプト
//  *
//  * このファイルはアプリ起動時に呼び出され、SQLite に以下の users テーブルを
//  * 自動作成（存在しない場合のみ）します。
//  *
//  * ── テーブル定義 ─────────────────────────────────────────────────────────────
//  * ・id            : INTEGER PRIMARY KEY AUTOINCREMENT  
//  * ・google_id     : TEXT      ／Google OAuth のユーザー ID を格納  
//  * ・username      : TEXT NOT NULL UNIQUE  ／一意なログイン名  
//  * ・password      : TEXT      ／ハッシュ化されたパスワード  
//  * ・first_name    : TEXT      ／名前  
//  * ・last_name     : TEXT      ／名字  
//  * ・email         : TEXT      ／メールアドレス  
//  * ・player_games  : INTEGER DEFAULT 0  ／プレイゲーム数（初期値 0）  
//  * ・player_wins   : INTEGER DEFAULT 0  ／勝利数（初期値 0）  
//  * ・created_at    : TIMESTAMP DEFAULT CURRENT_TIMESTAMP  ／作成日時  
//  *
//  * db.run() によってクエリを実行し、成否をコンソールにログ出力します。
//  * 新しいマイグレーションを追加する場合は同フォルダにファイルを増やしてください。
//  * ──────────────────────────────────────────────────────────────────────────────
//  * マイグレーション: users テーブル作成スクリプト
//  *
//  * このファイルはアプリ起動時に呼び出され、SQLite に以下の users テーブルを
//  * 自動作成（存在しない場合のみ）します。
//  *
//  * ── テーブル定義 ─────────────────────────────────────────────────────────────
//  * ・id            : INTEGER PRIMARY KEY AUTOINCREMENT  
//  * ・google_id     : TEXT      ／Google OAuth のユーザー ID を格納  
//  * ・username      : TEXT NOT NULL UNIQUE  ／一意なログイン名  
//  * ・password      : TEXT      ／ハッシュ化されたパスワード  
//  * ・first_name    : TEXT      ／名前  
//  * ・last_name     : TEXT      ／名字  
//  * ・email         : TEXT      ／メールアドレス  
//  * ・player_games  : INTEGER DEFAULT 0  ／プレイゲーム数（初期値 0）  
//  * ・player_wins   : INTEGER DEFAULT 0  ／勝利数（初期値 0）  
//  * ・created_at    : TIMESTAMP DEFAULT CURRENT_TIMESTAMP  ／作成日時  
//  *
//  * db.run() によってクエリを実行し、成否をコンソールにログ出力します。
//  * 新しいマイグレーションを追加する場合は同フォルダにファイルを増やしてください。
import db from '../../src/config/database';

const tableName = 'users';

const initializeUsersTable = (): void => {
  const sql = `
CREATE TABLE IF NOT EXISTS ${tableName} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id TEXT,
  username TEXT NOT NULL UNIQUE,
  password TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  player_games INTEGER DEFAULT 0,
  player_wins INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
  `;

  db.run(sql, (err) => {
    if (err) console.error(`Failed to create ${tableName} table:`, err.message);
    else console.log(`Table "${tableName}" is ready`);
  });
};

export default initializeUsersTable;
// ──────────────────────────────────────────────────────────────────────────────
// データベース初期化モジュール
// ・SQLite のファイルパスを解決し、
// ・そのデータファイルに接続する db オブジェクトを生成。
// ・アプリ全体で共有できるようエクスポート。
// ──────────────────────────────────────────────────────────────────────────────
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.resolve(__dirname, '../../database');
const dbPath = path.join(dbDir, 'db.sqlite');

// ディレクトリが存在しない場合は作成する
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`✅ DB用ディレクトリを作成しました: ${dbDir}`);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log(`✅ SQLite データベースに接続しました: ${dbPath}`);
  }
});

export default db;

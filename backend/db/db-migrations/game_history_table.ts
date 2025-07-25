// ──────────────────────────────────────────────────────────────────────────────
// 	•	マイグレーション = データベース構造やデータの変更を「コード化」「バージョン管理」し、自動で反映・追跡できる仕組み
	// •	手動作業による「適用漏れ」「環境不整合」「履歴不透明」といった問題を防ぎ、チーム開発・運用の品質を高める
// マイグレーション: game_history テーブル作成スクリプト
//
// このファイルはアプリ起動時に呼び出され、SQLite に以下の game_history テーブルを
// 自動作成（存在しない場合のみ）します。
//
// ── テーブル定義 ─────────────────────────────────────────────────────────────
// ・id             : INTEGER PRIMARY KEY AUTOINCREMENT  
// ・user_id        : INTEGER NOT NULL  
//                   ／users テーブルの id を参照（ON DELETE CASCADE）  
// ・opponent_type  : TEXT NOT NULL  
//                   ／対戦相手の種類 ('AI' または 'PLAYER')  
// ・difficulty     : TEXT  
//                   ／AI の難易度 (opponent_type = 'PLAYER' の場合は null)  
// ・user_score     : INTEGER NOT NULL  
//                   ／ユーザーの得点  
// ・opponent_score : INTEGER NOT NULL  
//                   ／対戦相手の得点  
// ・result         : TEXT NOT NULL  
//                   ／試合結果 ('WIN', 'LOSS', 'DRAW')  
// ・played_at      : TIMESTAMP DEFAULT CURRENT_TIMESTAMP  
//                   ／試合日時 (デフォルトで現在時刻)  
//
// db.run() によってクエリを実行し、成否をコンソールにログ出力します。
// 新しいマイグレーションは同フォルダにファイルを追加してください。
// ──────────────────────────────────────────────────────────────────────────────

import db from '../../src/config/database';
//は「game_history」という名前のテーブルを SQLite データベース上に自動作成
const createGameHistoryTable = () => {
    const query = `
        CREATE TABLE IF NOT EXISTS game_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        opponent_type TEXT NOT NULL,  /* 'AI' ou 'PLAYER' */
        difficulty TEXT,              /* null si opponent_type = 'PLAYER' */
        user_score INTEGER NOT NULL,
        opponent_score INTEGER NOT NULL,
        result TEXT NOT NULL,         /* 'WIN', 'LOSS', 'DRAW' */
        played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    `;
    //実際にデータベースに投げ
    db.run(query, (err) => {
        if (err) {
            console.error('Error creating game_history table:', err.message);
        } else {
            console.log('Table game_history created successfully');
        }
    });
};

export default createGameHistoryTable;
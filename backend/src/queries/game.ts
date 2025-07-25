import db from '../config/database';
//対戦が終わった後の「１試合分の履歴」を game_history テーブルに挿入する
export const addGameToHistory = (
	userId: number,
	opponentType: 'AI' | 'PLAYER',
	difficulty: string | null,
	userScore: number,
	opponentScore: number,
	result: 'WIN' | 'LOSS' | 'DRAW'
): Promise<any> => {
	return new Promise((resolve, reject) => {
		const sql = `
			INSERT INTO game_history (user_id, opponent_type, difficulty, user_score, opponent_score, result)
			VALUES (?, ?, ?, ?, ?, ?);
		`;

		db.run(
			sql,
			[userId, opponentType, difficulty, userScore, opponentScore, result],
			function(err) {
				if (err) {
					console.error('Error adding game to history:', err.message);
					reject(err);
				} else {
					resolve({ id: this.lastID });
				}
			}
		);
	});
};
// 役割：指定ユーザーの直近試合履歴を最新順に取得する
export const getUserGameHistory = (userId: number, limit = 10): Promise<any[]> => {
	return new Promise((resolve, reject) => {
		const sql = `
			SELECT 
				id, 
				opponent_type, 
				difficulty, 
				user_score, 
				opponent_score, 
				result, 
				played_at
			FROM game_history
			WHERE user_id = ?
			ORDER BY played_at DESC
			LIMIT ?;
		`;

	//データの 取得（SELECT） 操作向けで、複数行の結果をまとめて受け取りたいall
		db.all(sql, [userId, limit], (err, rows) => {
			if (err) {
				console.error('Error retrieving history:', err.message);
				reject(err);
			} else {
				resolve(rows);
			}
		});
	});
};
// ：ユーザーごとの累積プレイ数・勝利数を更新する
export const updateUserGameStats = (
	userId: number,
	isWin: boolean
): Promise<void> => {
	return new Promise((resolve, reject) => {
		const sql = `
			UPDATE users
			SET player_games = player_games + 1,
				player_wins = player_wins + ?
			WHERE id = ?
		`;
	//データの 挿入（INSERT）・更新（UPDATE）・削除（DELETE） はrun
		db.run(sql, [isWin ? 1 : 0, userId], function (err) {
			if (err) {
				console.error('Error updating statistics:', err.message);
				reject(err);
			} else {
				resolve();
			}
		});
	});
};

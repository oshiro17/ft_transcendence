import db from '../config/database';
import bcrypt from 'bcrypt';


// 1. ユーザー取得系
// ・getUserById(userId, callback)
// ・users テーブルから指定 ID のユーザー情報を１件だけ取得
// ・コールバックで (err, row) を返す（row が該当ユーザーのオブジェクト）
const getUserById = (userId: number, callback: (err: Error | null, row: any) => void) => {
	const sql = `
    SELECT id, username, email, first_name, last_name, created_at, player_games, player_wins
    FROM users
    WHERE id = ?;
  `;

	db.get(sql, [userId], (err, row) => {
		if (err) {
			callback(err, null);
		} else {
			callback(null, row);
		}
	});
};


const SALT_ROUNDS = 10;

// 2. ユーザー作成系
// ・createUser(username, password, firstName, lastName, email)
// ・ユーザー名と氏名の長さ制限チェック
// ・bcrypt でパスワードをハッシュ化（SALT_ROUNDS = 10）
// ・INSERT 実行後、getUserById(this.lastID) で作成済みレコードを取得して返却
// ・成功時は { success: true, user }、失敗時は { success: false, error }
const createUser = async (username: string, password: string, firstName: string, lastName: string, email: string): Promise<any> => {
	return new Promise(async (resolve, reject) => {
		const MAX_USERNAME_LENGTH = 100;
		const MAX_NAME_LENGTH = 50;
		
		if (username.length > MAX_USERNAME_LENGTH) {
			return resolve({
				success: false,
				error: `Username cannot exceed ${MAX_USERNAME_LENGTH} characters`
			});
		}
		if (firstName.length > MAX_NAME_LENGTH) {
			return resolve({
				success: false,
				error: `First name cannot exceed ${MAX_NAME_LENGTH} characters`
			});
		}
		if (lastName.length > MAX_NAME_LENGTH) {
			return resolve({
				success: false,
				error: `Last name cannot exceed ${MAX_NAME_LENGTH} characters`
			});
		}

		const sql = `
      INSERT INTO users (username, password, first_name, last_name, email)
      VALUES (?, ?, ?, ?, ?);
    `;

		const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

		db.run(sql, [username, hashedPassword, firstName, lastName, email], function (err) {
			if (err) {
				return resolve({
					success: false,
					error: err.message
				});
			} else {
				getUserById(this.lastID, (err, row) => {
					if (err) {
						return resolve({
							success: false,
							error: err.message
						});
					} else {
						resolve({ 
							success: true,
							message: 'User successfully created', 
							user: row 
						});
					}
				});
			}
		});
	});
};

// 3. ログイン／認証系
// ・checkUserLogin(username)
// ・指定ユーザー名でレコードを１件取得（パスワードハッシュ含む）
// ・存在しなければ { success: true, user: null }、存在すれば { success: true, user: row }
// ・エラー時は { success: false, error }
export const checkUserLogin = async (username: string): Promise<any> => {
	return new Promise((resolve) => {
		const sql = `SELECT id, username, email, password, google_id FROM users WHERE username = ?`;

		db.get(sql, [username], (err, row) => {
			if (err) {
				return resolve({
					success: false,
					error: err.message
				});
			}
			
			if (!row) {
				return resolve({
					success: true,
					user: null
				});
			}
			
			resolve({
				success: true,
				user: row
			});
		});
	});
};

// ・createUserOAuth(googleId, username, firstName, lastName, email)
// ・Google OAuth ユーザー向けに、google_id と固定パスワード 'google_oauth' を挿入
// ・挿入後の lastID などを返す
export const createUserOAuth = (googleId: string, username: string, firstName: string, lastName: string , email: string) => {
	return new Promise((resolve, reject) => {
		const sql = `INSERT INTO users (google_id, username, password, email, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?, ?)`;
		db.run(sql, [googleId, username, 'google_oauth', email, firstName, lastName], function (err) {
			if (err) return reject(err);
			resolve({ id: this.lastID, username, email,});
		});
	});
};

// ・checkUserByGoogleId(email)
// ・google_id で検索して OAuth ユーザーをチェック
// ・見つかればそのレコードを返し、なければ null
export const checkUserByGoogleId = async (email: string): Promise<any> => {
	return new Promise((resolve, reject) => {
		const sql = `SELECT id, username, email, password, FROM users WHERE google_id = ?`;

		db.get(sql, [email], (err, row) => {
			if (err) {
				console.error("Error retrieving user by email:", err.message);
				return reject(err);
			}
			resolve(row || null);
		});
	});
};



// ・updateUser(userId, userData)
// ・username／first_name／last_name のみ任意で更新
// ・長さ制限チェックあり
// ・変更がなければ即 { success: true, user: {} }
// ・更新後は再度 getUserById して最新情報を返却
export const updateUser = async (userId: number, userData: any): Promise<any> => {
	return new Promise((resolve, reject) => {
		const updates: string[] = [];
		const values: any[] = [];
		
		const MAX_USERNAME_LENGTH = 100;
		const MAX_NAME_LENGTH = 50;
		
		if (userData.username !== undefined) {
			if (userData.username.length > MAX_USERNAME_LENGTH) {
				return resolve({
					success: false,
					error: `Username cannot exceed ${MAX_USERNAME_LENGTH} characters`
				});
			}
			updates.push('username = ?');
			values.push(userData.username);
		}
		
		if (userData.first_name !== undefined) {
			if (userData.first_name.length > MAX_NAME_LENGTH) {
				return resolve({
					success: false,
					error: `First name cannot exceed ${MAX_NAME_LENGTH} characters`
				});
			}
			updates.push('first_name = ?');
			values.push(userData.first_name);
		}
		
		if (userData.last_name !== undefined) {
			if (userData.last_name.length > MAX_NAME_LENGTH) {
				return resolve({
					success: false,
					error: `Last name cannot exceed ${MAX_NAME_LENGTH} characters`
				});
			}
			updates.push('last_name = ?');
			values.push(userData.last_name);
		}
		
		if (updates.length === 0) {
			return resolve({
				success: true,
				user: {} 
			});
		}
		values.push(userId);
		const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
		db.run(sql, values, function(err) {
			if (err) {
				return resolve({ 
					success: false, 
					error: err.message
				});
			}
			
			if (this.changes === 0) {
				return resolve({
					success: false,
					error: 'User not found'
				});
			}
			
			getUserById(userId, (err, user) => {
				if (err) {
					return resolve({
						success: false,
						error: err.message
					});
				}
				resolve({
					success: true,
					user: user
				});
			});
		});
	});
};



// ・getUserData(userId)
// ・getUserById で基本情報を取ったあと、game_history もまとめて取得
// ・パスワードは含めず、最終的に { user, gameHistory } の形で返却
export const getUserData = async (userId: number): Promise<any> => {
	return new Promise((resolve, reject) => {
		getUserById(userId, (err, user) => {
			if (err) {
				console.error("Error fetching user data:", err.message);
				return reject(err);
			}
			
			if (!user) {
				return resolve(null);
			}
			
			const userCopy = { ...user };
			if (userCopy.password) {
				delete userCopy.password;
			}
			
			const gameHistoryPromise = new Promise<any[]>((resolveGames) => {
				const sql = `
          SELECT * FROM game_history
          WHERE user_id = ?
          ORDER BY played_at DESC
        `;
				
				db.all(sql, [userId], (err, rows) => {
					if (err) {
						console.error("Error fetching game history:", err.message);
						resolveGames([]);
					} else {
						resolveGames(rows || []);
					}
				});
			});
			
			
			Promise.all([gameHistoryPromise])
				.then(([gameHistory]) => {
					const userData = {
						user: userCopy,
						gameHistory,
					};
					
					resolve(userData);
				})
				.catch(error => {
					console.error("Error assembling user data:", error);
					resolve({
						user: userCopy,
						gameHistory: [],
						friends: [],
						messages: []
					});
				});
		});
	});
};

// 5. 匿名化・削除系
// ・anonymizeUser(userId)
// ・username をランダムな anonymous_xxxx に差し替え
// ・氏名を「Anonymous User」、メールも置き換え、アバターは消去
// ・新しいユーザー名を返す
export const anonymizeUser = async (userId: number): Promise<any> => {
	return new Promise((resolve, reject) => {
		const anonymousUsername = 'anonymous_' + Math.random().toString(36).substring(2, 10);
		const anonymousEmail = `${anonymousUsername}@anonymous.com`;
		
		const sql = `
      UPDATE users 
      SET username = ?, 
          first_name = 'Anonymous', 
          last_name = 'User', 
          email = ?,
      WHERE id = ?
    `;
		
		db.run(sql, [anonymousUsername, anonymousEmail, userId], function(err) {
			if (err) {
				console.error("Error anonymizing user:", err.message);
				return reject(err);
			}
			
			return resolve({
				success: true,
				newUsername: anonymousUsername
			})
		});
	});
};

// ・deleteUser(userId)
// ・関連する messages／friendships／games テーブルのレコードを先に削除
// ・最後に users テーブルのレコードを削除
// ・削除できたかどうか（true/false）を返却
export const deleteUser = async (userId: number): Promise<boolean> => {
	return new Promise((resolve, reject) => {
		
		const deletionPromises = [];
		
		deletionPromises.push(new Promise<void>((resolveMsg) => {
			db.run('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [userId, userId], (err) => {
				if (err) {
					console.error("Error deleting user messages:", err.message);
				}
				resolveMsg();
			});
		}));
		
		deletionPromises.push(new Promise<void>((resolveFriend) => {
			db.run('DELETE FROM friendships WHERE user1_id = ? OR user2_id = ?', [userId, userId], (err) => {
				if (err) {
					console.error("Error deleting user friendships:", err.message);
				}
				resolveFriend();
			});
		}));
		
		deletionPromises.push(new Promise<void>((resolveGame) => {
			db.run('DELETE FROM games WHERE player1_id = ? OR player2_id = ?', [userId, userId], (err) => {
				if (err) {
					console.error("Error deleting user games:", err.message);
				}
				resolveGame();
			});
		}));
		
		Promise.all(deletionPromises)
			.then(() => {
				// Finally delete the user
				db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
					if (err) {
						console.error("Error deleting user:", err.message);
						return reject(err);
					}
					
					const wasDeleted = this.changes > 0;
					resolve(wasDeleted);
				});
			})
			.catch(err => {
				console.error("Error during account deletion:", err);
				reject(err);
			});
	});
};

export default { 
	createUser, 
	getUserById, 
	checkUserLogin, 
	updateUser, 
	getUserData, 
	anonymizeUser, 
	deleteUser,
};
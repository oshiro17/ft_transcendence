// ・/Fastify を使って「ユーザー情報まわり」の APIエンドポイント
import { FastifyInstance } from 'fastify';
import userQueries  from '../queries/users';

export default async function userRoutes(fastify: FastifyInstance) {

  // GET /users/me: 認証済みユーザーの基本プロフィール取得
  // ・fastify.authenticate でJWTを検証
  // ・userIdを取得してgetUserByIdでDBからユーザー情報を取得
  // ・パスワードを除外して返信
fastify.get('/users/me', { preHandler: fastify.authenticate }, async (request, reply) => {
  try {
    const userId = (request.user as { userId: number }).userId;

    const getUserByIdPromise = (userId: number): Promise<any> => {
    return new Promise((resolve, reject) => {
      userQueries.getUserById(userId, (err, user) => {
      if (err) reject(err);
      else resolve(user);
      });
    });
    };

    const user = await getUserByIdPromise(userId);

    if (!user) {
    return reply.status(404).send({ error: "User not found" });
    }

    const { password, ...userWithoutPassword } = user;

    return reply.send(userWithoutPassword);
  } catch (err) {
    fastify.log.error("Error fetching user profile:", err);
    return reply.status(500).send({ error: "Server error" });
  }
  });
  
  // POST /register: 新規ユーザー登録
  // ・リクエストからusername, password, firstName, lastNameを取得
  // ・必須項目とパスワード長をチェック
  // ・メールアドレスを自動生成
  // ・ユーザー名の重複チェック
  // ・createUserでDBに保存し、成功時にJWT発行＆Cookieセット
  fastify.post('/register', async (request, reply) => {
    try {
      const { username, password, firstName, lastName } = request.body as {
        username: string;
        password: string;
        firstName: string;
        lastName: string;
      };

      if (!username || !password || !firstName || !lastName) {
        return reply.send({
          success: false,
          error: "All fields are required"
        });
      }

      if (password.length < 6 || password.length > 50) {
        return reply.send({
          success: false,
          error: "Password must be between 6 and 50 characters"
        });
      }

const email = username;

      const userCheck = await userQueries.checkUserLogin(username);
      if (userCheck.success && userCheck.user) {
        return reply.send({
          success: false,
          error: "Username already in use"
        });
      }

      const result = await userQueries.createUser(username, password, firstName, lastName, email);

      if (!result.success) {
        return reply.send({
          success: false,
          error: result.error
        });
      }

      const token = fastify.jwt.sign({ userId: result.user.id });

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
          message: "Registration successful",
          token: token
        });
    } catch (err) {
      fastify.log.error("Registration error:", err);
      return reply.status(500).send({
        success: false,
        error: "Error during registration"
      });
    }
  });

  // PUT /users/me: 認証済みユーザーのプロフィール更新
  // ・fastify.authenticate でJWTを検証
  // ・username変更時は重複チェック
  // ・updateUserでDBを更新し、更新後の情報を返却
  fastify.put('/users/me', { preHandler: fastify.authenticate }, async (request, reply) => {
    try {
      const userId = (request.user as { userId: number }).userId;
      const { username, firstname, lastname } = request.body as {
        username?: string;
        firstname?: string;
        lastname?: string;
      };

      if (username) {
        const existingUserResult = await userQueries.checkUserLogin(username);
        
        if (existingUserResult.success && 
            existingUserResult.user && 
            existingUserResult.user.id !== userId) {
          return reply.send({ 
            success: false, 
            error: "This username is already in use" 
          });
        }
      }

      const updatedUser = await userQueries.updateUser(userId, {
        username,
        first_name: firstname,
        last_name: lastname
      });
      
      if (updatedUser.password) 
        delete updatedUser.password;

      const { password, ...userWithoutPassword } = updatedUser;

      return reply.send(userWithoutPassword);
    } catch (err) {
      fastify.log.error("Error updating user profile:", err);
      return reply.status(500).send({ error: "Server error" });
    }
  });

  
  // GET /users/me/data: ユーザーデータ一括取得
  // ・fastify.authenticate でJWTを検証
  // ・getUserDataでユーザー基本情報とゲーム履歴をまとめて取得
  // ・パスワード削除後に返却
  fastify.get('/users/me/data', { preHandler: fastify.authenticate }, async (request, reply) => {
    try {
      const userId = (request.user as { userId: number }).userId;

      const userData = await userQueries.getUserData(userId);

      if (!userData) {
        return reply.status(404).send({ error: "User not found" });
      }

      if (userData.user && userData.user.password) {
        delete userData.user.password;
      }

      return reply.send(userData);
    } catch (err) {
      fastify.log.error("Error downloading user data:", err);
      return reply.status(500).send({ error: "Error downloading user data" });
    }
  });

  // POST /users/me/anonymize: アカウント匿名化
  // ・fastify.authenticate でJWTを検証
  // ・anonymizeUserでユーザー情報を匿名化
  // ・セッションCookieをクリアし、新しい匿名ユーザー名を返却
  fastify.post('/users/me/anonymize', { preHandler: fastify.authenticate }, async (request, reply) => {
    try {
      const userId = (request.user as { userId: number }).userId;

      const success = await userQueries.anonymizeUser(userId);

      if (!success) {
        return reply.status(404).send({
          success: false,
          error: "User not found",
        });
      }

      reply.clearCookie("sessionid");
	    reply.clearCookie("auth_token");
      
      return reply.send({ success: true, message: "Account successfully anonymized", newUsername: success.newUsername });
    } catch (err) {
      fastify.log.error("Error anonymizing user:", err);
      return reply.status(500).send({ error: "Error anonymizing account" });
    }
  });

  // DELETE /users/me: アカウント削除
  // ・fastify.authenticate でJWTを検証
  //      トークンの中に含まれる userId などの情報を使って、リクエストがどのユーザーから来たものかがわかる
	// 一度ログインして得たトークンを持っていれば、その後のリクエストは毎回「ユーザー名／パスワード」を送る必要がない
 
  fastify.delete('/users/me', { preHandler: fastify.authenticate }, async (request, reply) => {
    try {
      const userId = (request.user as { userId: number }).userId;

      const success = await userQueries.deleteUser(userId);

      if (!success) {
        return reply.status(404).send({ error: "User not found" });
      }

      reply.clearCookie("sessionid");
      reply.clearCookie("auth_token");


      return reply.send({ success: true, message: "Account successfully deleted" });
    } catch (err) {
      fastify.log.error("Error deleting user:", err);
      return reply.status(500).send({ error: "Error deleting account" });
    }
  });

}
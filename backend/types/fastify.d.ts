//Fastify の型情報に自分で作った authenticate メソッドを追加
//authenticate メソッドは、「そのリクエストに付いてきた JWT（JSON Web Token）が有効かどうか」をチェックするための関数

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

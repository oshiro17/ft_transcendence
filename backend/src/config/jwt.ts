//  データ構造を表現したいとき
//  •  API のレスポンスを型安全に扱う
//  •  設定オブジェクトやオプションをまとめる
export interface JwtPayload {
  userId: number;
  iat?: number;
  exp?: number;
}
# Makefile - Docker環境管理

.PHONY: all stop down logs clean first re restart status ps build help

# サービスを起動
all:
	docker-compose -f ./docker-compose.yml up --build -d
	@echo "サービスを起動しました"
	@echo "https://localhost:8443 でアクセスできます"

# サービスを一時停止
stop:
	docker-compose -f ./docker-compose.yml stop
	@echo "サービスを停止しました"

# コンテナを削除
down:
	docker-compose -f ./docker-compose.yml down
	@echo "コンテナを削除しました"

# ログを表示
logs:
	@echo "ログを表示します (Ctrl+C で終了)"
	docker-compose -f ./docker-compose.yml logs -f

# 全クリーンアップ
clean:
	docker-compose -f ./docker-compose.yml down -v
	docker system prune -f
	@echo "クリーンアップ完了"

# 初回起動
first:
	docker-compose -f ./docker-compose.yml up --build -d
	@echo "初回起動完了"
	@echo "https://localhost:8443/api/auth/google にアクセス"

# 一度停止して再起動
re: down all
	@echo "再起動完了"

# 特定のサービスの再起動
restart:
	docker-compose -f ./docker-compose.yml restart
	@echo "サービスを再起動しました"

# 現在の状態を表示
status:
	docker-compose -f ./docker-compose.yml ps

# 詳細なプロセス表示
ps:
	docker ps -a

# 再ビルド
build:
	docker-compose -f ./docker-compose.yml build
	@echo "再ビルド完了"

# ヘルプを表示
help:
	@echo "================== コマンド一覧 =================="
	@echo "make all     : サービス起動"
	@echo "make stop    : サービス停止"
	@echo "make down    : コンテナ削除"
	@echo "make logs    : ログ表示"
	@echo "make clean   : 全消去"
	@echo "make first   : 初回起動"
	@echo "make re      : 再起動"
	@echo "make restart : サービス再起動"
	@echo "make status  : 現在の状態"
	@echo "make ps      : Docker ps 表示"
	@echo "make build   : 再ビルド"
	@echo "make help    : ヘルプ表示"
	@echo "================================================="
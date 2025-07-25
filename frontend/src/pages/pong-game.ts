/**
 * Pongゲームのメインロジック。
 * 描画・入力・AI制御・ゲーム状態管理をまとめている巨大ファイル。
 * セクションごとにコメントを追加して読みやすくする。
 * ※敬語は使わない。
 */
import "./pong-game.css";
import "./pong-selection.css";
import { AIOpponent, AIDifficulty } from "../components/ai-opponent";
import { languageService } from "../lib/languageContext";
import { navigate } from "../router";

const bgm = new Audio("/sounds/music.mp3");
bgm.loop = true;
bgm.volume = 0.6;

declare global {
  interface Window {
    initializePongGame?: () => void;
  }
}

// 玉の座標・速度・半径などをまとめたデータ構造
interface Ball {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  radius: number;
  maxSpeed: number;
  angle: number;            // 現在角度[rad]
  angularVelocity: number;  // 角速度[rad/s]
}

// パドルのアニメーション段階を示す列挙っぽい型
type PaddlePhase = "none" | "grow" | "shrink" | "return";

// パドル1本分のアニメーション状態（スケールと経過時間など）
interface PaddleAnimation {
  scale: number;
  phase: PaddlePhase;
  time: number;
}

// 両プレイヤー分のパドル情報と共通設定
interface Paddles {
  width: number;
  height: number;
  player1Y: number;
  player2Y: number;
  speed: number;
  animations: {
    player1: PaddleAnimation;
    player2: PaddleAnimation;
  };
}

// 得点カウンタ
interface Scores {
  player1: number;
  player2: number;
  winning: number;
}

// キー入力状態を保持
interface Controls {
  player1Up: boolean;
  player1Down: boolean;
  player2Up: boolean;
  player2Down: boolean;
}

// カラーパレットをまとめる
interface Colors {
  groundColor: string;
  ballColor: string;
  paddleColor: string;
}

// ゲーム全体の状態を詰め込んだ構造体
interface GameState {
  ball: Ball;
  paddles: Paddles;
  scores: Scores;
  controls: Controls;
  color: Colors;
  running: boolean;
  countdown: number;
  countdownActive: boolean;
  countdownOpacity: number;
  fadingOut: boolean;
  lastTime: number;
  animationFrameId: number | null;
}

// モード選択画面に戻すだけのハンドラ
function backToGameModes(event?: Event): void {
  navigate("/pong-selection");
}
 
// メイン初期化エントリ。ここでキャンバス取得→イベント登録→ゲームループ開始まで全部やる
// 最初に画像を読み込む
const ballImage = new Image();
ballImage.src = "/images/piko.png";

export default async function initializePongGame(): Promise<(() => void) | null> {
  const canvas = document.getElementById("pongCanvas") as HTMLCanvasElement | null;
  if (!canvas) {
    return null;
  }
  
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  const musicToggle = document.createElement("button");
musicToggle.textContent = "🔈";
musicToggle.style.position = "fixed";
musicToggle.style.bottom = "16px";
musicToggle.style.right = "16px";
musicToggle.style.zIndex = "1000";
musicToggle.style.fontSize = "24px";
musicToggle.style.background = "#ffffffcc";
musicToggle.style.border = "1px solid #ccc";
musicToggle.style.borderRadius = "50%";
musicToggle.style.padding = "8px";
musicToggle.style.cursor = "pointer";

document.body.appendChild(musicToggle);

let isMuted = false;
musicToggle.addEventListener("click", () => {
  isMuted = !isMuted;
  bgm.muted = isMuted;
  musicToggle.textContent = isMuted ? "🔇" : "🔈";
});
  const elements = {
    playButton: document.getElementById("play-button") as HTMLElement | null,
    menu: document.getElementById("pong-menu") as HTMLElement | null,
    score1: document.getElementById("player1-score") as HTMLElement | null,
    score2: document.getElementById("player2-score") as HTMLElement | null,
    customButton: document.getElementById("custom-button") as HTMLElement | null,
    customBackButton: document.getElementById("custom-back-button") as HTMLElement | null,
    customColorsInputs: document.querySelectorAll(".color-input") as NodeListOf<HTMLInputElement>,
    customSliders: document.querySelectorAll(".pong-custom-slider") as NodeListOf<HTMLInputElement>,
    winningScoreSlider: document.getElementById("winning-score-slider") as HTMLInputElement | null,
    difficultySelector: document.getElementById("ai-difficulty") as HTMLSelectElement | null,
    difficultySelectorContainer: document.getElementById("difficulty-selector-container") as HTMLElement | null
  };

  const isAIMode = window.location.search.includes('ai=true');
  
  if (isAIMode && elements.difficultySelectorContainer) {
    elements.difficultySelectorContainer.classList.remove("hidden");
  }
// 初期化k
  const state: any = {
    ball: {
      x: canvas.width / 2,
      y: canvas.height / 2,
      speedX: 250,
      speedY: 250,
      radius: 18,
      maxSpeed: 850,
      angle: 0,
      angularVelocity: 0
    },
    paddles: {
      width: 7,
      height: 100,
      player1Y: (canvas.height - 100) / 2,
      player2Y: (canvas.height - 100) / 2,
      speed: 300,
      animations: {
        player1: { scale: 1, phase: "none", time: 0 },
        player2: { scale: 1, phase: "none", time: 0 }
      }
    },
    scores: {
      player1: 0,
      player2: 0,
      winning: 3
    },
    controls: {
      player1Up: false,
      player1Down: false,
      player2Up: false,
      player2Down: false
    },
    color: {
      groundColor: "#fff",
      ballColor: "#fff",
      paddleColor: "#fff"
    },
    running: false,
    countdown: 3,
    countdownActive: false,
    countdownOpacity: 1.0,
    fadingOut: false,
    lastTime: performance.now(),
    animationFrameId: null,
    aiEnabled: isAIMode,
    aiOpponent: null,
    debugMode: false,
  };

  if (state.aiEnabled && canvas) {
    state.aiOpponent = new AIOpponent(canvas.width, canvas.height);
    const difficulty = elements.difficultySelector ? 
      elements.difficultySelector.value as AIDifficulty : 'medium';
    state.aiOpponent.setDifficulty(difficulty);
  }

  // 現在のスケールを反映してパドルを描画
  function drawPaddles(): void {
    if (!ctx || !canvas) return;
    
    ctx.fillStyle = state.color.paddleColor;

    const anim1 = state.paddles.animations.player1;
    const width1 = state.paddles.width * anim1.scale;
    const height1 = state.paddles.height * anim1.scale;
    ctx.fillRect(
      3 - (width1 - state.paddles.width) / 2,
      state.paddles.player1Y - (height1 - state.paddles.height) / 2,
      width1,
      height1
    );

    const anim2 = state.paddles.animations.player2;
    const width2 = state.paddles.width * anim2.scale;
    const height2 = state.paddles.height * anim2.scale;
    ctx.fillRect(
      canvas.width - width2 - 3 - (width2 - state.paddles.width) / 2,
      state.paddles.player2Y - (height2 - state.paddles.height) / 2,
      width2,
      height2
    );
  }

  // ボールを描画
  function drawBall(): void {
    if (!ctx) return;
    const size   = state.ball.radius * 2;
    const offset = state.ball.radius;

    ctx.save();
    ctx.translate(state.ball.x, state.ball.y);     // ボール中心へ移動
    ctx.rotate(state.ball.angle);                  // スピン角度を適用
    ctx.drawImage(ballImage, -offset, -offset, size, size);
    ctx.restore();
  }

  // HTML上のスコア表示を更新
  function updateScores(): void {
    if (elements.score1) {
      elements.score1.textContent = state.scores.player1.toString();
    }
    if (elements.score2) {
      elements.score2.textContent = state.scores.player2.toString();
    }
  }

  // パドル衝突判定。かなり長いが端的に言うとAABBと内挿で衝突フレームを判定
  function checkPaddleCollision(): void {
    if (!canvas) return;
  
    const pw = state.paddles.width;
    const ph = state.paddles.height;
    const ballRadius = state.ball.radius;
  
    const deltaTime = (performance.now() - state.lastTime) / 1000;
    
    const ballVelocityX = state.ball.speedX * deltaTime;
    const ballVelocityY = state.ball.speedY * deltaTime;
    
    const prevBallX = state.ball.x - ballVelocityX;
    const prevBallY = state.ball.y - ballVelocityY;
    
    const leftPaddleRight = pw + 3;
    const leftPaddleLeft = 3;
    
    if (state.ball.speedX < 0) {
      if ((prevBallX - ballRadius > leftPaddleRight && state.ball.x - ballRadius <= leftPaddleRight) ||
        (state.ball.x - ballRadius <= leftPaddleRight && state.ball.x + ballRadius >= leftPaddleLeft)) {

        let t = 0;
        if (Math.abs(ballVelocityX) > 0.0001) {
          t = (leftPaddleRight - (state.ball.x - ballRadius)) / ballVelocityX;
          t = Math.max(0, Math.min(1, t));
        }
        const intersectionY1 = state.ball.y - (1 - t) * ballVelocityY;
        
        const ratio = (leftPaddleRight - (state.ball.x - ballRadius)) / 
               ((prevBallX - ballRadius) - (state.ball.x - ballRadius) || 0.0001);
        const intersectionY2 = state.ball.y + (prevBallY - state.ball.y) * ratio;
        
        const intersectionY3 = state.ball.y;
        
        const paddleTop = state.paddles.player1Y - ballRadius; 
        const paddleBottom = state.paddles.player1Y + ph + ballRadius; 
        
        if ((intersectionY1 >= paddleTop && intersectionY1 <= paddleBottom) ||
          (intersectionY2 >= paddleTop && intersectionY2 <= paddleBottom) ||
          (intersectionY3 >= paddleTop && intersectionY3 <= paddleBottom)) {
          
          const ballLeft = state.ball.x - ballRadius;
          const ballRight = state.ball.x + ballRadius;
          const ballTop = state.ball.y - ballRadius;
          const ballBottom = state.ball.y + ballRadius;
          
          const paddleBoxLeft = leftPaddleLeft;
          const paddleBoxRight = leftPaddleRight;
          const paddleBoxTop = state.paddles.player1Y;
          const paddleBoxBottom = state.paddles.player1Y + ph;
          
          const overlaps = !(
            ballRight < paddleBoxLeft ||
            ballLeft > paddleBoxRight ||
            ballBottom < paddleBoxTop ||
            ballTop > paddleBoxBottom
          );
          
          if (overlaps || 
            state.ball.x - ballRadius <= leftPaddleRight || 
            Math.abs(prevBallX - ballRadius - leftPaddleRight) < Math.abs(ballVelocityX * 1.2)) {
            
            state.ball.x = leftPaddleRight + ballRadius + 1; 
            
            // 衝突後の角度・速度を計算してボールをはじき返す
            handlePaddleBounce("player1");
            return; 
          }
        }
      }
      
      if (state.ball.x - ballRadius < leftPaddleRight + 2 && 
        state.ball.x + ballRadius > leftPaddleLeft - 2 &&  
        state.ball.y + ballRadius > state.paddles.player1Y - 2 && 
        state.ball.y - ballRadius < state.paddles.player1Y + ph + 2) { 
        
        state.ball.x = leftPaddleRight + ballRadius + 1;
        // 衝突後の角度・速度を計算してボールをはじき返す
        handlePaddleBounce("player1");
        return;
      }
    }
    
    const rightPaddleLeft = canvas.width - (pw + 3);
    const rightPaddleRight = canvas.width - 3;

    if (state.ball.speedX > 0) {
      // 右パドルのAABB領域
      const rightPaddleTop = state.paddles.player2Y;
      const rightPaddleBottom = state.paddles.player2Y + ph;

      // ボールが右側のパドルと交差した場合だけ反射
      const ballNextRight = state.ball.x + ballRadius;
      const ballNextLeft = state.ball.x - ballRadius;

      const withinVertical = state.ball.y + ballRadius >= rightPaddleTop && state.ball.y - ballRadius <= rightPaddleBottom;
      const crossingPaddle = ballNextRight >= rightPaddleLeft && ballNextLeft <= rightPaddleRight;

      if (withinVertical && crossingPaddle) {
        state.ball.x = rightPaddleLeft - ballRadius - 0.1;
        // 衝突後の角度・速度を計算してボールをはじき返す
        handlePaddleBounce("player2");
        return;
      }
    }
  }

  // 衝突後の角度・速度を計算してボールをはじき返す
  function handlePaddleBounce(player: "player1" | "player2"): void {
    state.paddles.animations[player] = {
      scale: 1.05,
      phase: "grow",
      time: 0
    };

    const paddleY = player === "player1" ? state.paddles.player1Y : state.paddles.player2Y;
    const paddleHeight = state.paddles.height;

    let relativeIntersect = (state.ball.y - (paddleY + paddleHeight/2)) / (paddleHeight/2);

    const isTopEdge = relativeIntersect < -0.8;
    const isBottomEdge = relativeIntersect > 0.8;

    relativeIntersect = Math.max(-0.8, Math.min(0.8, relativeIntersect));

    const bounceAngle = relativeIntersect * (Math.PI / 3.5);

    // Removed randomVariation for deterministic bounce

    const speedMultiplier = 1.05;
    const currentSpeed = Math.hypot(state.ball.speedX, state.ball.speedY);
    const newSpeed = Math.min(currentSpeed * speedMultiplier, state.ball.maxSpeed);

    if (isTopEdge || isBottomEdge) {
      const strongerVerticalComponent = 0.6;
      const weakerHorizontalComponent = 0.8;

      if (player === "player1") {
        state.ball.speedX = newSpeed * weakerHorizontalComponent;
      } else {
        state.ball.speedX = -newSpeed * weakerHorizontalComponent;
      }

      state.ball.speedY = (isTopEdge ? -1 : 1) * newSpeed * strongerVerticalComponent;

      return;
    }

    if (player === "player1") {
      const minXComponent = 0.7;
      const xComponent = Math.max(minXComponent, Math.cos(bounceAngle));
      state.ball.speedX = newSpeed * xComponent;
    } else {
      const minXComponent = 0.7;
      const xComponent = Math.max(minXComponent, Math.cos(bounceAngle));
      state.ball.speedX = -newSpeed * xComponent;
    }

    let ySpeed = newSpeed * Math.sin(bounceAngle);
    if (Math.abs(ySpeed) < 50) {
      ySpeed = 50 * Math.sign(ySpeed || 1);
    }
    state.ball.speedY = ySpeed;
    // 衝突位置に応じてスピンを付与
    const spinFactor = 8;        // 好みに応じて調整
    state.ball.angularVelocity += -relativeIntersect * spinFactor;
  }

  // 天井・床との衝突、ゴール判定
  function checkWallCollision(): void {
    if (!canvas) return;

    const ballRadius = state.ball.radius;

    if (state.ball.y - ballRadius <= 0) {
      state.ball.y = ballRadius + 1;
      state.ball.speedY = Math.abs(state.ball.speedY);
      state.ball.angularVelocity *= 0.9; // 壁で少しスピン減衰
      if (Math.abs(state.ball.speedY) < 50) {
        state.ball.speedY = 50 * Math.sign(state.ball.speedY);
      }
    }

    if (state.ball.y + ballRadius >= canvas.height) {
      state.ball.y = canvas.height - ballRadius - 1;
      state.ball.speedY = -Math.abs(state.ball.speedY);
      state.ball.angularVelocity *= 0.9; // 壁で少しスピン減衰
      if (Math.abs(state.ball.speedY) < 50) {
        state.ball.speedY = -50;
      }
      const leftCornerProximity = state.ball.x - ballRadius < 20;
      const rightCornerProximity = state.ball.x + ballRadius > canvas.width - 20;
      if (leftCornerProximity || rightCornerProximity) {
        if (Math.abs(state.ball.speedX) < 100) {
          state.ball.speedX = (leftCornerProximity ? 1 : -1) * 100;
        }
        state.ball.speedY = -Math.abs(state.ball.speedY) * 1.2;
      }
    }

    if (state.ball.x - ballRadius < 0) {
      state.scores.player2++;
      // ボールをセンターへ戻して速度リセット
      resetBall();
      updateScores();
    }
    else if (state.ball.x + ballRadius > canvas.width) {
      state.scores.player1++;
      // ボールをセンターへ戻して速度リセット
      resetBall();
      updateScores();
    }
  }

  // 毎フレームの物理＆入力更新メインループ
  function update(deltaTime: number): void {
    if (!canvas) return;
  
    const currentTime = performance.now();
    
    if (state.countdownActive) {
      state.countdown -= deltaTime;
      if (state.countdown <= 0) {
        state.countdownActive = false;
        state.fadingOut = true;
      }
    }
  
    if (state.fadingOut) {
      state.countdownOpacity -= deltaTime;
      if (state.countdownOpacity <= 0) {
        state.fadingOut = false;
        state.running = true;
      }
    }
  
    if (!state.running) return;
  
    (["player1", "player2"] as const).forEach((player) => {
      const anim = state.paddles.animations[player];
      if (anim.phase !== "none") {
        anim.time += deltaTime;
  
        if (anim.phase === "grow") {
          if (anim.time >= 0.2) {
            anim.phase = "shrink";
            anim.scale = 0.9;
            anim.time = 0;
          }
        } else if (anim.phase === "shrink") {
          if (anim.time >= 0.2) {
            anim.phase = "return";
            anim.scale = 1;
            anim.time = 0;
          }
        } else if (anim.phase === "return") {
          if (anim.time >= 0.6) {
            anim.phase = "none";
          }
        }
      }
    });
    
    if (state.controls.player1Up && state.paddles.player1Y > 5) {
      state.paddles.player1Y -= state.paddles.speed * deltaTime;
    }
    if (state.controls.player1Down && state.paddles.player1Y < canvas.height - state.paddles.height - 5) {
      state.paddles.player1Y += state.paddles.speed * deltaTime;
    }
    
    if (state.aiEnabled && state.aiOpponent) {
      const aiControls = state.aiOpponent.update(state, currentTime);
      state.controls.player2Up = aiControls.moveUp;
      state.controls.player2Down = aiControls.moveDown;
    }
    
    if (state.controls.player2Up && state.paddles.player2Y > 5) {
      state.paddles.player2Y -= state.paddles.speed * deltaTime;
    }
    if (state.controls.player2Down && state.paddles.player2Y < canvas.height - state.paddles.height - 5) {
      state.paddles.player2Y += state.paddles.speed * deltaTime;
    }
    
    // 回転を進め、空気抵抗で減衰させる
    state.ball.angle += state.ball.angularVelocity * deltaTime;
    state.ball.angularVelocity *= 0.995;
    state.ball.x += state.ball.speedX * deltaTime;
    state.ball.y += state.ball.speedY * deltaTime;
  
    state.lastTime = currentTime;
  
    checkWallCollision();
    checkPaddleCollision();
  
    if (state.scores.player1 >= state.scores.winning || state.scores.player2 >= state.scores.winning) {
      // 勝敗が付いた時の処理。勝者表示＆履歴保存
      endGame();
    }
  }

  // AIモード用のUIテキスト差し替え＆難易度ボタン処理
  function setupAIModeUI(): void {
    const isAIMode = window.location.search.includes('ai=true');
    
    const titleElem = document.getElementById('game-title');
    const subtitleElem = document.getElementById('game-subtitle');
    
    if (isAIMode) {
      if (titleElem) {
        titleElem.textContent = languageService.translate('game.ai_mode.title', 'AI PONG');
        
        const badge = document.createElement('span');
        badge.className = 'ai-mode-badge';
        badge.textContent = 'AI';
        titleElem.appendChild(badge);
      }
      
      if (subtitleElem) {
        subtitleElem.textContent = languageService.translate('game.ai_mode.subtitle', 'Challenge the Computer');
      }
      
      const rulesCard = document.getElementById('rules-card');
      if (rulesCard) {
        const rulesPara = rulesCard.querySelector('p');
        if (rulesPara) {
          rulesPara.textContent = languageService.translate('game.ai_mode.description', 
            'Play against an AI opponent with multiple difficulty levels. Use precise timing and anticipate the AI\'s movements to win!');
        }
      }
      
      const controlsList = document.getElementById('controls-list');
      if (controlsList) {
        controlsList.innerHTML = `
          <div><span>${languageService.translate('game.controls_info.player1', 'Player 1')}:</span> W / S ${languageService.translate('game.controls_info.keys', 'Keys')}</div>
          <div><span>${languageService.translate('game.controls_info.player2', 'Player 2')}:</span> ↑ / ↓ ${languageService.translate('game.controls_info.arrow_keys', 'Arrow Keys')}</div>
        `;
      }
      
      const difficultyContainer = document.getElementById('difficulty-selector-container');
      if (difficultyContainer) {
        difficultyContainer.classList.remove('hidden');
      }
      
      const difficultyBtns = document.querySelectorAll('.difficulty-btn');
      difficultyBtns.forEach(btn => {
        const difficultyKey = btn.getAttribute('data-difficulty') || 'medium';
        btn.textContent = languageService.translate(`game.ai_mode.difficulty.${difficultyKey}`, 
          difficultyKey.charAt(0).toUpperCase() + difficultyKey.slice(1));
        
        btn.addEventListener('click', function(this: HTMLElement) {
          difficultyBtns.forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          
          if (state.aiOpponent) {
            const selectedDifficulty = this.getAttribute('data-difficulty') as AIDifficulty || 'medium';
            state.aiOpponent.setDifficulty(selectedDifficulty);
          }
        });
      });
      
      if (state.aiOpponent) {
        const currentDifficulty = state.aiOpponent.getCurrentDifficulty();
        const difficultyBtn = document.querySelector(`.difficulty-btn[data-difficulty="${currentDifficulty}"]`);
        if (difficultyBtn) {
          difficultyBtns.forEach(b => b.classList.remove('active'));
          difficultyBtn.classList.add('active');
        }
      }
    } else {
      if (titleElem) {
        titleElem.textContent = languageService.translate('game.classic_pong', 'PONG');
      }
      
      if (subtitleElem) {
        subtitleElem.textContent = languageService.translate('game.original_experience', 'Classic 1v1 Experience');
      }
      
      const rulesCard = document.getElementById('rules-card');
      if (rulesCard) {
        const rulesTitle = rulesCard.querySelector('h3');
        if (rulesTitle) {
          rulesTitle.textContent = languageService.translate('game.rules', 'Game Rules');
        }
        
        const rulesPara = rulesCard.querySelector('p');
        if (rulesPara) {
          rulesPara.textContent = languageService.translate('game.rules_description', 
            'Score points by getting the ball past your opponent\'s paddle. First to reach the winning score wins!');
        }
      }
      
      const controlsList = document.getElementById('controls-list');
      if (controlsList) {
        controlsList.innerHTML = `
          <div><span>${languageService.translate('game.controls_info.player', 'Player')}:</span> W / S ${languageService.translate('game.controls_info.keys', 'Keys')}</div>
          <div><span>${languageService.translate('game.controls_info.ai_opponent', 'AI Opponent')}:</span> ${languageService.translate('game.controls_info.computer_controlled', 'Computer Controlled')}</div>
          <div class="debug-hint">${languageService.translate('game.controls_info.toggle_ai_debug', 'Press Alt+Q to toggle AI prediction visualization')}</div>
        `;
      }
    }
  }

  // ボールをセンターへ戻して速度リセット
  function resetBall(): void {
    if (!canvas) return;

    state.ball.x = canvas.width / 2;
    state.ball.y = canvas.height / 2;

    const fixedSpeed = 250;

    state.ball.speedX = fixedSpeed;
    state.ball.speedY = 0;
  }

  // 勝敗が付いた時の処理。勝者表示＆履歴保存
  async function endGame(): Promise<void> {
		state.running = false;
		bgm.pause();
bgm.currentTime = 0;
		let winner = null;
		if (state.scores.player1 >= state.scores.winning) {
			winner = languageService.translate('game.player1', "Player 1");
		  } else if (state.scores.player2 >= state.scores.winning) {
			winner = state.aiEnabled ? 
			  languageService.translate('game.ai_opponent', "AI Opponent") : 
			  languageService.translate('game.player2', "Player 2");
		}

		if (state.aiEnabled) {
      try {
        const result = state.scores.player1 >= state.scores.winning ? "WIN" : "LOSS";
        const difficulty = document.querySelector(".difficulty-btn.active")?.getAttribute("data-difficulty") || "medium";
        
        const response = await fetch('/api/game-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                opponentType: 'AI',
                difficulty: difficulty,
                userScore: state.scores.player1,
                opponentScore: state.scores.player2,
                result: result
            }),
        });
        
      } catch (error) {
          console.error('error whne saving game:', error);
      }
		}

		  if (winner) {
			const championName = document.getElementById("pong-champion-name");
			if (championName) {
			  championName.textContent = winner;
			}
			
			const winnerTitle = document.querySelector("#pong-winner-announcement h2");
			if (winnerTitle) {
			  winnerTitle.textContent = languageService.translate('game.champion', "Champion!");
			}
			
			const newGameButton = document.getElementById("new-game-button");
			if (newGameButton) {
			  newGameButton.textContent = languageService.translate('game.new_game', "New Game");
			}
			
			const winnerAnnouncement = document.getElementById("pong-winner-announcement");
			if (winnerAnnouncement) {
			  winnerAnnouncement.classList.remove("hidden");
			}
		  } else {
			elements.menu?.classList.remove("hidden");
			elements.menu?.classList.add("show");
		  }
		  
		  resetBall();
		}

  // キー押下時にフラグを立てる
  function handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case "w":
      case "W":
        state.controls.player1Up = true;
        break;
      case "s":
      case "S":
        state.controls.player1Down = true;
        break;
      case "ArrowUp":
        if (!state.aiEnabled) {
          state.controls.player2Up = true;
        }
        break;
      case "ArrowDown":
        if (!state.aiEnabled) {
          state.controls.player2Down = true;
        }
        break;
      case "Escape":
        // エスケープキーでゲームを終了しメニューを再表示
        state.running = false;
        bgm.pause();
        const winnerAnnouncement = document.getElementById("pong-winner-announcement");
        if (winnerAnnouncement) {
          winnerAnnouncement.classList.add("hidden");
        }
        if (elements.menu) {
          elements.menu.classList.remove("hidden");
          elements.menu.classList.add("show");
        }
        break;
    }
  }

  // キー解放時にフラグを下げる
  function handleKeyUp(e: KeyboardEvent): void {
    switch (e.key) {
      case "w":
      case "W":
        state.controls.player1Up = false;
        break;
      case "s":
      case "S":
        state.controls.player1Down = false;
        break;
      case "ArrowUp":
        if (!state.aiEnabled) {
          state.controls.player2Up = false;
        }
        break;
      case "ArrowDown":
        if (!state.aiEnabled) {
          state.controls.player2Down = false;
        }
        break;
    }
  }
    
  // カウントダウン数字 or GO の円形表示
  function drawCountdown(): void {
    if (state.countdownActive) {
      const currentCount = Math.ceil(state.countdown);
      if (currentCount > 0) {
        drawCountElement(currentCount.toString());
      }
    } else if (state.fadingOut) {
      drawCountElement("GO", state.countdownOpacity);
    }
  }

  // 汎用のカウント円描画
  function drawCountElement(text: string, opacity: number = 1.0): void {
    if (!ctx || !canvas) return;

    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(187, 112, 173, ${opacity * 1})`;
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.font = "50px Aeonik";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 5);

    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.closePath();
  }

  // スコアと状態を初期化してカウントダウン開始
  function startGame(): void {
    bgm.currentTime = 0;
    void bgm.play().catch(() => {});

    elements.menu?.classList.remove("show");
    setTimeout(() => {
      elements.menu?.classList.add("hidden");
    }, 500);
    
    state.running = false;
    state.scores.player1 = 0;
    state.scores.player2 = 0;
    elements.menu?.classList.add("hidden");
    updateScores();
    resetBall();
    
    if (state.aiEnabled && state.aiOpponent) {
      // Use the active difficulty button to determine the AI difficulty
      const activeBtn = document.querySelector('.difficulty-btn.active');
      if (activeBtn) {
        const difficulty = activeBtn.getAttribute('data-difficulty') as AIDifficulty || 'medium';
        state.aiOpponent.setDifficulty(difficulty);
      }
    }
  
    state.countdown = 3;
    state.countdownActive = true;
    state.fadingOut = false;
    state.countdownOpacity = 1.0;
  }

	// ドロップダウンからAI難易度を変更
	function changeAIDifficulty(): void {
	if (state.aiEnabled && state.aiOpponent && elements.difficultySelector) {
	const difficulty = elements.difficultySelector.value as AIDifficulty;
	state.aiOpponent.setDifficulty(difficulty);
	}
	}
	// AIの予測軌道を描画（デバッグ用）
	function drawDebug(): void {
	if (!state.debugMode || !state.aiOpponent || !ctx) return;const predictedPath = state.aiOpponent.getPredictedPath();

	if (predictedPath.length === 0) return;
	
	ctx.beginPath();
	ctx.moveTo(predictedPath[0].x, predictedPath[0].y);
	
	for (let i = 1; i < predictedPath.length; i++) {
	  ctx.lineTo(predictedPath[i].x, predictedPath[i].y);
	}
	
	ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
	ctx.lineWidth = 2;
	ctx.stroke();
	
	if (predictedPath.length > 0) {
	  const lastPoint = predictedPath[predictedPath.length - 1];
	  ctx.beginPath();
	  ctx.arc(lastPoint.x, lastPoint.y, 5, 0, Math.PI * 2);
	  ctx.fillStyle = 'yellow';
	  ctx.fill();
	}}

  // 1フレーム分の描画＋状態更新。requestAnimationFrameに渡すコールバック
  function gameLoop(currentTime: number): void {
    if (!ctx || !canvas) return;
  
    const deltaTime = (currentTime - state.lastTime) / 1000;
    state.lastTime = currentTime;
  
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    ctx.fillStyle = state.color.groundColor;
    ctx.fillRect(canvas.width / 2 - 1, 0, 2, canvas.height);
  
    drawPaddles();
    drawBall();
    update(deltaTime);
  
    if (state.countdownActive || state.fadingOut) {
      drawCountdown();
    }
    
    if (state.debugMode) {
      drawDebug();
    }
    
    state.animationFrameId = requestAnimationFrame(gameLoop);
  }


	// 初期設定とイベントリスナ登録をまとめたセットアップ函
	function init(): void {
	if (elements.menu) {
	elements.menu.classList.add("show");
	}document.addEventListener("keydown", handleKeyDown);
	document.addEventListener("keyup", handleKeyUp);
	elements.playButton?.addEventListener("click", startGame);
	if (state.aiEnabled && elements.difficultySelector) {
	  elements.difficultySelector.addEventListener("change", changeAIDifficulty);
	}
	
	state.animationFrameId = requestAnimationFrame(gameLoop);
	
	document.addEventListener("keydown", (e) => {
	  if (e.key === "q" && e.altKey) {
		e.preventDefault();
		state.debugMode = !state.debugMode;
	  }
	});
	
	const backButtons = [
	  document.getElementById("back-to-modes-button"),
	  document.getElementById("back-to-modes-button-winner")
	];
	
	backButtons.forEach(button => {
	  if (button) {
		button.removeEventListener("click", backToGameModes);
		button.addEventListener("click", backToGameModes);
	  }
	});
	
	const newGameButton = document.getElementById("new-game-button");
	if (newGameButton) {
	  newGameButton.addEventListener("click", () => {
		const winnerAnnouncement = document.getElementById("pong-winner-announcement");
		if (winnerAnnouncement) {
		  winnerAnnouncement.classList.add("hidden");
		}
		
		state.scores.player1 = 0;
		state.scores.player2 = 0;
		updateScores();
		startGame();
	  });
	}
	
	setupAIModeUI();}
	init();
	// ReactのuseEffect風に後片付けを行う
	function cleanup(): void {
	document.removeEventListener("keydown", handleKeyDown);
	document.removeEventListener("keyup", handleKeyUp);
	elements.playButton?.removeEventListener("click", startGame);
	
	  
	  if (state.aiEnabled && elements.difficultySelector) {
		elements.difficultySelector.removeEventListener("change", changeAIDifficulty);
	  }
	  
	  document.removeEventListener("keydown", (e) => {
		if (e.key === "q" && e.altKey) {
		  e.preventDefault();
		  state.debugMode = !state.debugMode;
		}
	  });
	  
	  if (state.animationFrameId) {
		cancelAnimationFrame(state.animationFrameId);
	  }
	  
	  const backButtons = [
		document.getElementById("back-to-modes-button"),
		document.getElementById("back-to-modes-button-winner")
	  ];
	  
	  backButtons.forEach(button => {
		if (button) {
		  button.removeEventListener("click", backToGameModes);
		}
	  });
	  
	  const newGameButton = document.getElementById("new-game-button");
	  if (newGameButton) {
		newGameButton.removeEventListener("click", () => {});
	  }}
	  return cleanup;
	  }
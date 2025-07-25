import { navigate } from "../router";
import { languageService } from "../lib/languageContext";

interface Player {
  color: string;
  score: number;
}

export default function initializeQuizGame(): (() => void) | null {
  console.log("Initializing 4-Player Quiz Game");

  const canvas = document.getElementById("multiplayerCanvas") as HTMLCanvasElement | null;
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const GAME_WIDTH = canvas.width;
  const GAME_HEIGHT = canvas.height;

  const players: Player[] = [
    { color: "#FFD500", score: 0 },
    { color: "#70BB88", score: 0 },
    { color: "#7088BB", score: 0 },
    { color: "#BBBB70", score: 0 },
  ];

  const questions = [
    { text: "34×22-3423=?", answer: 42 },
    { text: "40+2=?", answer: 42 },
    { text: "84÷2=?", answer: 42 },
    { text: "100-58=?", answer: 42 },
    { text: "21×2=?", answer: 42 },
    { text: "45-3=?", answer: 42 },
    { text: "7×6=?", answer: 42 },
    { text: "63-21=?", answer: 42 },
    { text: "50-8=?", answer: 42 },
    { key :"quiz.question.meaning_of_life",answer:42},
    { text: "80÷2=?", answer: 40 },
    { text: "10×4=?", answer: 40 },
    { text: "30+30=?", answer: 60 },
    { text: "100-10=?", answer: 90 },
    { text: "7×8=?", answer: 56 },
    { text: "20+30=?", answer: 50 },
    // ここに追加で問題を用意
  ];

  let currentQuestion = questions[Math.floor(Math.random() * questions.length)];

  const elements = {
    playButton: document.getElementById("play-button") as HTMLElement | null,
    backToModesButton: document.getElementById("back-to-modes-button") as HTMLElement | null,
    menu: document.getElementById("game-menu") as HTMLElement | null,
    playerScores: [
      document.getElementById("player1-score") as HTMLElement | null,
      document.getElementById("player2-score") as HTMLElement | null,
      document.getElementById("player3-score") as HTMLElement | null,
      document.getElementById("player4-score") as HTMLElement | null,
    ],
    resultScreen: document.getElementById("result-screen") as HTMLElement | null,
    rankingList: document.getElementById("ranking-list") as HTMLElement | null,
    replayButton: document.getElementById("replay-button") as HTMLElement | null,
  };

  let gameRunning = false;
  let animationFrameId: number | null = null;
  let lastAnswerTime: number = Date.now();

  function nextQuestion(): void {
    currentQuestion = questions[Math.floor(Math.random() * questions.length)];
  }

  function drawScoreboard(): void {
    players.forEach((p, i) => {
      if (elements.playerScores[i]) {
        elements.playerScores[i]!.textContent = `${p.score}`;
        elements.playerScores[i]!.style.color = p.color;
      }
    });
  }

function drawQuestion(): void {
  if (!ctx) return;
  ctx.font = "40px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";

  let questionText: string;
  if ((currentQuestion as any).key) {
    // 翻訳キーがある場合は i18n で翻訳
    questionText = languageService.translate((currentQuestion as any).key);
  } else {
    // ない場合はそのままテキスト
    questionText = (currentQuestion as any).text;
  }

  ctx.fillText(questionText, GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

  function handleKeyDown(e: KeyboardEvent): void {
    // エスケープキーが押されたらゲーム終了
    if (e.key === "Escape") {
      showMenu();
      return;
    }
    if (!gameRunning) return;
    let playerIndex = -1;

    const key = e.key.toLowerCase();

    if (currentQuestion.answer === 42) {
      // 答えが42の場合のキー
      if (key === "q") playerIndex = 0;
      if (key === "z") playerIndex = 1;
      if (key === "p") playerIndex = 2;
      if (key === "m") playerIndex = 3;

      if (playerIndex !== -1) {
        // 正解キーで加点
        players[playerIndex].score++;
        nextQuestion();
        lastAnswerTime = Date.now();
      } else {
        // ✨ 間違いキー(w,x,o,n)を押した場合は減点
        if (key === "w") players[0].score--;
        if (key === "x") players[1].score--;
        if (key === "o") players[2].score--;
        if (key === "n") players[3].score--;
        if (["w","x","o","n"].includes(key)) {
          nextQuestion();
          lastAnswerTime = Date.now();
        }
      }
      return;
    } else {
      // 答えが42ではない場合のキー
      if (key === "w") playerIndex = 0;
      if (key === "x") playerIndex = 1;
      if (key === "o") playerIndex = 2;
      if (key === "n") playerIndex = 3;

      if (playerIndex !== -1) {
        // 正しく「42ではない」ときのキーを押したのでポイント加算
        players[playerIndex].score++;
        nextQuestion();
        lastAnswerTime = Date.now();
      } else {
        // 42ではない問題なのに、42のキー(q,z,p,m)を押した場合は減点
        if (key === "q") players[0].score--;
        if (key === "z") players[1].score--;
        if (key === "p") players[2].score--;
        if (key === "m") players[3].score--;
        nextQuestion();
        lastAnswerTime = Date.now();
      }
      return;
    }
  }

  function startGame(): void {
    players.forEach((p) => (p.score = 0));
    nextQuestion();
    lastAnswerTime = Date.now();
    if (elements.menu) elements.menu.classList.add("hidden");
    if (elements.resultScreen) elements.resultScreen.classList.add("hidden");
    gameRunning = true;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function showMenu(): void {
    gameRunning = false;
    if (elements.menu) elements.menu.classList.remove("hidden");
    if (elements.resultScreen) elements.resultScreen.classList.add("hidden");
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  // ランキング画面を表示してリプレイボタンを有効化
  function showResult(): void {
    gameRunning = false;
    if (elements.menu) elements.menu.classList.add("hidden");
    if (elements.resultScreen) elements.resultScreen.classList.remove("hidden");
    if (!elements.rankingList) return;

    // スコアで降順にソート
    const sortedPlayers = players
      .map((p, idx) => ({ ...p, idx }))
      .sort((a, b) => b.score - a.score);

    // ランキングリストをクリア
    elements.rankingList.innerHTML = "";

    sortedPlayers.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = `Player ${p.idx + 1}: ${p.score}`;
      li.style.color = p.color;
      elements.rankingList!.appendChild(li);
    });
  }

  function checkWinner(): void {
    for (let i = 0; i < players.length; i++) {
      if (players[i].score >= 10) {
        // 勝者が決まったのでゲーム終了
        gameRunning = false;
        showResult();
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        return;
      }
    }
  }

  function gameLoop(): void {
    if (!ctx) return;
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    drawQuestion();
    drawScoreboard();
    if (Date.now() - lastAnswerTime > 4000) {
      nextQuestion();
      lastAnswerTime = Date.now();
    }
    checkWinner();
    if (gameRunning) animationFrameId = requestAnimationFrame(gameLoop);
  }

  function backToGameModes(): void {
    navigate("/pong-selection");
  }

  function init(): void {
    document.addEventListener("keydown", handleKeyDown);
    elements.playButton?.addEventListener("click", startGame);
    elements.backToModesButton?.addEventListener("click", backToGameModes);
    elements.replayButton?.addEventListener("click", startGame);
    showMenu();
  }

  init();
  return function cleanup(): void {
    document.removeEventListener("keydown", handleKeyDown);
    elements.playButton?.removeEventListener("click", startGame);
    elements.backToModesButton?.removeEventListener("click", backToGameModes);
    elements.replayButton?.removeEventListener("click", startGame);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  };
}
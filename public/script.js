const MAX_DAY = 21;
const MAX_ACTIONS = 4;
const TIME_PERIODS = ["早晨", "中午", "傍晚", "晚上"];
const TIME_CLASSES = ["time-morning", "time-noon", "time-evening", "time-night"];
const characterStates = {
  computer: "assets/images/characters/player_computer.png",
  seal: "assets/images/characters/player_seal.png",
  music: "assets/images/characters/player_music.png",
  reading: "assets/images/characters/player_reading.png"
};
const ENDING_CATALOG = [
  ["ALL_PASS", "100% ALL PASS", "專題與學業都達標"],
  ["HIGH_PASS", "高機率通過", "專題完成，學業驚險過關"],
  ["PROJECT_PASS", "專題通過", "專題成功但學業危險"],
  ["STUDY_PASS", "學業通過", "學業通過但專題失敗"],
  ["BAD_END", "期末爆炸", "專題與學業都沒有達標"],
  ["COLLAPSE", "體力透支，壓力破百", "身體在期末結束前倒下"],
  ["ZEN", "佛系人生", "完全沒有寫過專題"],
  ["KNOWLEDGE_GOD", "知識之神", "知識含量達到 100"],
  ["WORK_KING", "打工皇帝", "最終金錢達到 3000"],
  ["HAPPY_STUDENT", "快樂大學生", "最終開心值達到 90"]
];
const DIFFICULTIES = {
  easy: {
    label: "簡單",
    energyCost: 0.8,
    stressGain: 0.8,
    weeklyTargets: [[18, 15], [45, 40], [75, 65]]
  },
  normal: {
    label: "普通",
    energyCost: 1,
    stressGain: 1,
    weeklyTargets: [[25, 22], [55, 50], [85, 75]]
  },
  hard: {
    label: "困難",
    energyCost: 1.2,
    stressGain: 1.25,
    weeklyTargets: [[32, 30], [65, 60], [92, 85]]
  }
};

const defaultState = {
  playerName: "侯佑諺",
  currentScene: "room",
  day: 1,
  energy: 100,
  stress: 10,
  money: 500,
  projectProgress: 0,
  studyProgress: 0,
  knowledge: 0,
  happiness: 50,
  hasLuckyCat: false,
  hasReferenceBook: false,
  difficulty: "normal",
  achievements: [],
  projectActionCount: 0,
  currentCharacterState: "computer",
  unlockedEndings: [],
  actionsLeft: MAX_ACTIONS
};

let gameState = { ...defaultState };
let dialogueQueue = [];
let toastTimer;
let audioContext;
let audioEnabled = localStorage.getItem("campusAudioEnabled") !== "false";
let musicVolume = Number(localStorage.getItem("campusMusicVolume") ?? 0.28);
let sfxVolume = Number(localStorage.getItem("campusSfxVolume") ?? 0.8);
let tutorialIndex = 0;
const tutorialSteps = [
  ["歡迎來到期末生存挑戰", "你有 21 天完成專題與學業目標。每天共有四個行動時段。"],
  ["管理核心數值", "體力耗盡且壓力達到 100 會觸發特殊失敗結局。開心值會影響好壞事件機率。"],
  ["知識與成長", "上課、查資料與讀書可以增加知識。知識越高，專題與學業進度提升越快。"],
  ["存檔與道具", "存檔 1 每天自動保存，2～4 可手動保存。超商的永久道具也會寫入存檔。"],
  ["彈幕與結局", "房間會播放當日彈幕。完成遊戲後，可在 Lobby 的結局收藏查看解鎖紀錄。"]
];

function setupAudio() {
  const music = document.querySelector("#backgroundMusic");
  music.volume = clamp(musicVolume, 0, 1);
  document.querySelector("#musicVolume").value = Math.round(musicVolume * 100);
  document.querySelector("#sfxVolume").value = Math.round(sfxVolume * 100);
  updateVolumeLabels();
  updateAudioButton();
}

function ensureBackgroundMusic() {
  if (!audioEnabled) return;
  const music = document.querySelector("#backgroundMusic");
  if (music.paused) music.play().catch(() => {});
}

function toggleAudio(event) {
  event.stopPropagation();
  audioEnabled = !audioEnabled;
  localStorage.setItem("campusAudioEnabled", String(audioEnabled));
  const music = document.querySelector("#backgroundMusic");
  if (audioEnabled) ensureBackgroundMusic();
  else music.pause();
  updateAudioButton();
}

function updateAudioButton() {
  const button = document.querySelector("#audioToggle");
  if (button) button.textContent = audioEnabled ? "全部開啟" : "全部靜音";
}

function playSound(type) {
  if (!audioEnabled) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const settings = {
    click: [520, 0.045, "square"],
    sleep: [180, 0.38, "sine"],
    save: [720, 0.18, "triangle"],
    load: [420, 0.22, "triangle"],
    period: [620, 0.3, "sine"]
  };
  const [frequency, duration, wave] = settings[type] || settings.click;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  if (type === "sleep") {
    oscillator.frequency.exponentialRampToValueAtTime(90, audioContext.currentTime + duration);
  }
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, 0.1 * sfxVolume),
    audioContext.currentTime + 0.015
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function toggleAudioPanel(event) {
  event.stopPropagation();
  const panel = document.querySelector("#audioPanel");
  const isOpen = panel.classList.toggle("open");
  panel.setAttribute("aria-hidden", String(!isOpen));
}

function updateMusicVolume(event) {
  musicVolume = Number(event.target.value) / 100;
  localStorage.setItem("campusMusicVolume", String(musicVolume));
  document.querySelector("#backgroundMusic").volume = musicVolume;
  updateVolumeLabels();
  if (musicVolume > 0) ensureBackgroundMusic();
}

function updateSfxVolume(event) {
  sfxVolume = Number(event.target.value) / 100;
  localStorage.setItem("campusSfxVolume", String(sfxVolume));
  updateVolumeLabels();
}

function updateVolumeLabels() {
  document.querySelector("#musicVolumeValue").textContent = `${Math.round(musicVolume * 100)}%`;
  document.querySelector("#sfxVolumeValue").textContent = `${Math.round(sfxVolume * 100)}%`;
}

function startTutorial() {
  tutorialIndex = 0;
  document.querySelector("#tutorialOverlay").classList.add("open");
  document.querySelector("#tutorialOverlay").setAttribute("aria-hidden", "false");
  renderTutorialStep();
}

function renderTutorialStep() {
  const [title, text] = tutorialSteps[tutorialIndex];
  document.querySelector("#tutorialStep").textContent = `${tutorialIndex + 1} / ${tutorialSteps.length}`;
  document.querySelector("#tutorialTitle").textContent = title;
  document.querySelector("#tutorialText").textContent = text;
  document.querySelector("#nextTutorial").textContent =
    tutorialIndex === tutorialSteps.length - 1 ? "開始遊戲" : "下一步";
}

function advanceTutorial() {
  if (tutorialIndex >= tutorialSteps.length - 1) {
    finishTutorial();
    return;
  }
  tutorialIndex += 1;
  renderTutorialStep();
}

function finishTutorial() {
  localStorage.setItem("campusTutorialSeen", "true");
  document.querySelector("#tutorialOverlay").classList.remove("open");
  document.querySelector("#tutorialOverlay").setAttribute("aria-hidden", "true");
}

const sceneData = {
  room: { name: "房間 / LOBBY", className: "scene-room" },
  gate: { name: "校門口", className: "scene-gate" },
  computer: { name: "電腦棟", className: "scene-computer" },
  classroom: { name: "教學棟", className: "scene-classroom" },
  teaching: { name: "上課中", className: "scene-teach" },
  professor: { name: "老師研究室", className: "scene-teacher" },
  library: { name: "圖書館", className: "scene-library" },
  store: { name: "校園超商", className: "scene-store" }
};

const actions = {
  project: {
    label: "寫專題",
    scene: "computer",
    run() {
      gameState.projectActionCount += 1;
      const gain = 10 + knowledgeBonus();
      applyEffects({ projectProgress: gain, stress: 12, energy: -15, happiness: -2 });
      setDialogue(gameState.playerName, `專題推進了 ${gain}%；知識讓你處理功能更有效率。`);
      if (Math.random() < badEventChance(0.22)) {
        applyEffects({ projectProgress: -6, energy: -8, stress: 14, happiness: -8 });
        queueDialogue("RANDOM EVENT", "突然出現嚴重 Bug！專題 -6、體力 -8、壓力 +14、開心 -8。");
      }
    }
  },
  research: {
    label: "上網查資料",
    scene: "room",
    run() {
      const projectResult = Math.random() < 0.5;
      const knowledgeGain = boostedKnowledge(8);
      const effects = { knowledge: knowledgeGain, stress: 7, energy: -9, happiness: -1 };
      effects[projectResult ? "projectProgress" : "studyProgress"] = 3;
      applyEffects(effects);
      const target = projectResult ? "專題" : "學業";
      setDialogue(gameState.playerName, `找到有用資料，知識含量 +${knowledgeGain}，${target}進度 +3。`);
    }
  },
  library: {
    label: "讀書",
    scene: "library",
    run() {
      const gain = 8 + knowledgeBonus();
      const knowledgeGain = boostedKnowledge(3);
      applyEffects({
        studyProgress: gain,
        stress: 10,
        energy: -13,
        knowledge: knowledgeGain,
        happiness: -2
      });
      setDialogue(gameState.playerName, `完成一輪複習，學業進度 +${gain}、知識含量 +${knowledgeGain}。`);
    }
  },
  homeReading: {
    label: "讀書",
    scene: "room",
    run() {
      applyEffects({ studyProgress: 10, stress: 4, energy: -6 });
      setDialogue(gameState.playerName, "你在房間安靜讀書，學業 +10、壓力 +4、體力 -6。");
    }
  },
  class: {
    label: "上課",
    scene: "teaching",
    run() {
      const studyGain = 6 + knowledgeBonus();
      const knowledgeGain = boostedKnowledge(10);
      applyEffects({
        studyProgress: studyGain,
        projectProgress: 2,
        knowledge: knowledgeGain,
        energy: -15,
        stress: 9,
        happiness: -2
      });
      setDialogue("老師", `今天的內容很實用。學業 +${studyGain}、專題 +2、知識含量 +${knowledgeGain}。`);
    }
  },
  work: {
    label: "打工賺錢",
    scene: "gate",
    run() {
      const pay = gameState.hasLuckyCat ? 600 : 300;
      applyEffects({ money: pay, energy: -20, stress: 9, happiness: -3 });
      setDialogue(
        gameState.playerName,
        `完成一個班次，金錢 +${pay}${gameState.hasLuckyCat ? "（招財貓加倍）" : ""}。`
      );
      const roll = Math.random();
      const badChance = badEventChance(0.15);
      if (roll < badChance) {
        applyEffects({ stress: 10, energy: -4, happiness: -6 });
        queueDialogue("RANDOM EVENT", "下班時突然下大雨，體力 -4、壓力 +10、開心 -6。");
      } else if (roll < badChance * 2) {
        applyEffects({ stress: 14, happiness: -8 });
        queueDialogue("RANDOM EVENT", "遇到奧客糾纏，壓力 +14、開心 -8。");
      }
    }
  },
  exercise: {
    label: "運動",
    scene: "gate",
    run() {
      applyEffects({ stress: -5, energy: -15, happiness: 4 });
      setDialogue(gameState.playerName, "運動後稍微振作，壓力 -5、體力 -15、開心 +4。");
    }
  },
  shower: {
    label: "洗澡",
    scene: "room",
    run() {
      applyEffects({ stress: -3, energy: 2, happiness: 3 });
      setDialogue(gameState.playerName, "洗完熱水澡，壓力 -3、體力 +2、開心 +3。");
    }
  },
  game: {
    label: "打遊戲",
    scene: "room",
    run() {
      applyEffects({ stress: -8, energy: -9, happiness: 12 });
      setDialogue(gameState.playerName, "玩一個時段放鬆，壓力 -8、體力 -9、開心 +12。");
      const roll = Math.random();
      const badChance = badEventChance(0.16);
      if (roll < 0.16 && gameState.actionsLeft > 0) {
        gameState.actionsLeft -= 1;
        applyEffects({ stress: -2, energy: -9, happiness: 5 });
        triggerPeriodEvent();
        queueDialogue("RANDOM EVENT", "再玩一個時段好了！你貪玩又消耗一個行動時段。");
      } else if (roll < 0.16 + badChance) {
        applyEffects({ stress: 16, happiness: -10 });
        queueDialogue("RANDOM EVENT", "連輸好幾場，壓力 +16、開心 -10。");
      }
    }
  },
  sleep: {
    label: "睡覺",
    scene: "room",
    run() {
      playSound("sleep");
      applyEffects({ energy: 22, stress: -6, happiness: 2 });
      setDialogue(gameState.playerName, "你睡了一個時段，體力 +22、壓力 -6、開心 +2。");
    }
  },
  professor: {
    label: "找老師討論",
    scene: "professor",
    async run() {
      applyEffects({ energy: -8, stress: 5, happiness: -1 });
      setDialogue("老師", "讓我看看你目前的狀況……");
      queueDialogue("老師", await askAIProfessor(gameState));
      if (Math.random() < goodEventChance(0.25)) {
        applyEffects({ projectProgress: 4, studyProgress: 3, happiness: 5 });
        queueDialogue("RANDOM EVENT", "老師的一句提示讓你獲得靈感：專題 +4、學業 +3、開心 +5。");
      }
    }
  }
};

const storeItems = [
  { name: "飯糰", price: 45, effects: { energy: 15 } },
  { name: "咖啡", price: 60, effects: { energy: 20, stress: 5 } },
  { name: "能量飲料", price: 80, effects: { energy: 30, stress: 10 } },
  { name: "巧克力", price: 35, effects: { stress: -5, energy: 5 } },
  { name: "便當", price: 90, effects: { energy: 25, stress: -3 } },
  {
    name: "招財貓",
    price: 1000,
    permanentKey: "hasLuckyCat",
    detail: "永久道具：打工報酬變成 2 倍"
  },
  {
    name: "參考書",
    price: 500,
    permanentKey: "hasReferenceBook",
    detail: "永久道具：獲得知識量變成 1.5 倍"
  },
  { name: "小黃書", price: 50, effects: { stress: -20, energy: -15 } }
];

const courses = [
  ["HTML", "建立網頁語意結構，安排標題、區塊、表單與內容。"],
  ["CSS", "設計版面、響應式介面、像素風元件及動畫效果。"],
  ["JavaScript", "處理遊戲狀態、事件、條件判斷與隨機結局。"],
  ["DOM 操作", "動態更新場景、對話、按鈕、數值與彈幕內容。"],
  ["表單處理", "驗證並送出玩家名稱、彈幕內容及商品操作。"],
  ["前後端連接", "使用 Fetch API 呼叫 Express REST API。"],
  ["資料庫 CRUD", "透過 Mongoose 新增、讀取及更新遊戲資料。"]
];

const features = [
  ["01", "劇情選項", "每次行動都會改變玩家狀態。"],
  ["02", "場景切換", "六個校園地點提供不同活動。"],
  ["03", "知識系統", "知識越高，專題與學業提升越快。"],
  ["04", "四格存檔", "自動存檔與三個手動存檔槽位。"],
  ["05", "隨機事件", "Bug、靈感、奧客與意外收穫。"],
  ["06", "多重結局", "第 21 天或體力歸零時判定命運。"]
];

document.addEventListener("DOMContentLoaded", () => {
  renderStaticCards();
  bindNavigation();
  bindForms();
  renderGame();
  loadDanmakuList();
  setupAudio();
  renderEndingCollection();
});

function renderStaticCards() {
  document.querySelector("#courseGrid").innerHTML = courses
    .map(
      ([title, text], index) => `
        <article class="course-card pixel-panel" data-index="${String(index + 1).padStart(2, "0")}">
          <p class="eyebrow">MODULE ${String(index + 1).padStart(2, "0")}</p>
          <h3>${title}</h3>
          <p>${text}</p>
        </article>`
    )
    .join("");

  document.querySelector("#featureGrid").innerHTML = features
    .map(
      ([number, title, text]) => `
        <article class="feature-card pixel-panel">
          <span>${number}</span><h3>${title}</h3><p>${text}</p>
        </article>`
    )
    .join("");
}

function bindNavigation() {
  document.addEventListener("click", (event) => {
    if (event.target.closest("button")) {
      ensureBackgroundMusic();
      playSound("click");
    }
    const screenButton = event.target.closest("[data-screen]");
    if (screenButton) showScreen(screenButton.dataset.screen);

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    if (actionButton.dataset.action === "new-game") openNameModal();
    if (actionButton.dataset.action === "continue-game") openLoadMenu(true);
  });

  document.querySelector("#cancelNameModal").addEventListener("click", closeNameModal);
  document.querySelector("#dialogueNext").addEventListener("click", showNextDialogue);
  document.querySelector("#refreshDanmaku").addEventListener("click", loadDanmakuList);
  document.querySelector("#audioToggle").addEventListener("click", toggleAudio);
  document.querySelector("#audioSettingsToggle").addEventListener("click", toggleAudioPanel);
  document.querySelector("#musicVolume").addEventListener("input", updateMusicVolume);
  document.querySelector("#sfxVolume").addEventListener("input", updateSfxVolume);
  document.querySelector("#nextTutorial").addEventListener("click", advanceTutorial);
  document.querySelector("#skipTutorial").addEventListener("click", finishTutorial);
  document.querySelector("#demoEndingButton").addEventListener("click", runEndingDemo);
  document.querySelector("#unlockAllEndingsButton").addEventListener("click", unlockAllEndings);
}

function bindForms() {
  document.querySelector("#nameForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const playerName = document.querySelector("#playerNameInput").value.trim();
    const difficulty = document.querySelector("#difficultySelect").value;
    gameState = { ...defaultState, playerName, difficulty };
    randomRoomCharacterState();
    localStorage.setItem("campusGamePlayer", playerName);
    closeNameModal();
    showScreen("gameScreen");
    setDialogue(
      "SYSTEM",
      `${playerName}，你選擇了「${DIFFICULTIES[difficulty].label}」難度。距離期末只剩 21 天。`
    );
    renderGame();
    await showTimeTransition(gameState.day, TIME_PERIODS[0]);
    if (!localStorage.getItem("campusTutorialSeen")) {
      startTutorial();
    }
  });
  document.querySelector("#danmakuForm").addEventListener("submit", submitDanmaku);
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.id === screenId);
  });
  if (screenId === "danmakuScreen") {
    checkDanmakuStorage();
    loadDanmakuList();
  }
  if (screenId === "collectionScreen") renderEndingCollection();
}

async function checkDanmakuStorage() {
  const status = document.querySelector("#danmakuStorageStatus");
  if (!status) return;
  status.className = "storage-status checking";
  status.textContent = "正在檢查彈幕資料庫…";

  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    if (!response.ok) throw new Error("伺服器未回應");
    const health = await response.json();
    if (health.persistent) {
      status.className = "storage-status persistent";
      status.textContent = "MongoDB 已連線：彈幕會永久保存，網站重新啟動後仍會存在。";
    } else if (health.requiresDatabase) {
      status.className = "storage-status offline";
      status.textContent = "正式環境的 MongoDB 尚未連線：目前禁止送出彈幕，請在 Render 設定正確的 MONGODB_URI。";
    } else {
      status.className = "storage-status";
      status.textContent = "目前為記憶體暫存：彈幕可立即播放，但伺服器重新啟動後會消失。正式上線請設定 MONGODB_URI。";
    }
  } catch (error) {
    status.className = "storage-status offline";
    status.textContent = "無法連接網站伺服器。請先啟動 Node.js，或確認部署服務仍在運行。";
  }
}

function openNameModal() {
  const modal = document.querySelector("#nameModal");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.querySelector("#playerNameInput").focus();
}

function closeNameModal() {
  const modal = document.querySelector("#nameModal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function renderGame(menu = "main") {
  renderStats();
  renderScene();
  if (menu === "main") renderMainActions();
}

function renderStats() {
  const stats = [
    ["energy", "體力", gameState.energy, 100],
    ["stress", "壓力", gameState.stress, 100],
    ["money", "金錢", gameState.money, 1000],
    ["projectProgress", "專題", gameState.projectProgress, 100],
    ["studyProgress", "學業", gameState.studyProgress, 100],
    ["knowledge", "知識", gameState.knowledge, 100],
    ["happiness", "開心", gameState.happiness, 100]
  ];

  document.querySelector("#dayValue").textContent = String(gameState.day).padStart(2, "0");
  document.querySelector("#difficultyValue").textContent =
    (DIFFICULTIES[gameState.difficulty] || DIFFICULTIES.normal).label;
  document.querySelector("#statsBar").innerHTML = stats
    .map(([key, label, value, max]) => {
      const display = key === "money" ? `$${value}` : `${value}%`;
      const width = clamp((value / max) * 100, 0, 100);
      return `
        <div class="stat ${key}">
          <div class="stat-label"><span>${label}</span><b>${display}</b></div>
          <div class="stat-track"><div class="stat-fill" style="width:${width}%"></div></div>
        </div>`;
    })
    .join("");
  updateTimeClass();
}

function renderScene() {
  const scene = sceneData[gameState.currentScene] || sceneData.room;
  document.querySelector("#sceneBg").className = `scene-bg ${scene.className}`;
  document.querySelector("#sceneName").textContent = scene.name;
  const character = document.querySelector("#roomCharacter");
  if (gameState.currentScene === "room") {
    character.classList.remove("hidden");
    loadDayDanmaku();
  } else {
    character.classList.add("hidden");
    document.querySelector("#danmakuStage").innerHTML = "";
  }
  updateTimeClass();
}

function updateTimeClass() {
  const gameScene = document.querySelector("#gameScene");
  if (!gameScene) return;
  const elapsedActions = clamp(MAX_ACTIONS - gameState.actionsLeft, 0, 3);
  gameScene.classList.remove(...TIME_CLASSES);
  gameScene.classList.add(TIME_CLASSES[elapsedActions]);
}

function renderMainActions() {
  setActionPanelCentered(false);
  renderActionMenu([
    { label: "回家", handler: openHomeMenu },
    { label: "學校", handler: openSchoolMenu },
    { label: "圖書館", action: "library" },
    { label: "打工賺錢", action: "work" },
    { label: "去超商", handler: openStore },
    { label: "道具欄", handler: openInventoryMenu },
    { label: "成就", handler: openAchievementMenu },
    { label: "儲存", handler: openSaveMenu },
    { label: "載入", handler: () => openLoadMenu(false) },
    { label: "睡覺", action: "sleep", className: "sleep" }
  ]);
}

function openHomeMenu() {
  gameState.currentScene = "room";
  randomRoomCharacterState();
  renderScene();
  setActionPanelCentered(false);
  setDialogue("SYSTEM", "回到房間。你想做什麼？");
  renderActionMenu([
    { label: "睡覺", action: "sleep" },
    { label: "洗澡", action: "shower" },
    { label: "打遊戲", action: "game" },
    { label: "寫專題", action: "project" },
    { label: "上網查資料", action: "research" },
    { label: "讀書", action: "homeReading" },
    backMenuItem()
  ]);
}

function openSchoolMenu() {
  setActionPanelCentered(false);
  gameState.currentScene = "classroom";
  renderScene();
  if (Math.random() < badEventChance(0.18)) {
    applyEffects({ energy: -8, stress: 12, happiness: -10 });
    setDialogue("RANDOM EVENT", "去學校的路上突然下大雨！體力 -8、壓力 +12、開心 -10。");
    renderStats();
    if (checkCollapseEnding()) return;
  } else {
    setDialogue("SYSTEM", "來到學校。今天要安排哪項活動？");
  }
  renderActionMenu([
    { label: "上課", action: "class" },
    { label: "運動", action: "exercise" },
    { label: "找老師討論", action: "professor" },
    backMenuItem()
  ]);
}

function renderActionMenu(items) {
  document.querySelector("#actionsLeft").textContent = gameState.actionsLeft;
  const container = document.querySelector("#actionButtons");
  container.innerHTML = items
    .map(
      (item, index) => `
        <button class="action-button ${item.className || ""}" data-menu-index="${index}"
          ${gameState.actionsLeft <= 0 && !item.free && !item.handler ? "disabled" : ""}>
          <span class="action-label">${item.label}</span>
          ${item.detail ? `<small class="action-detail">${item.detail}</small>` : ""}
        </button>`
    )
    .join("");

  container.querySelectorAll("[data-menu-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = items[Number(button.dataset.menuIndex)];
      if (item.action) executeAction(item.action);
      else if (item.handler) item.handler();
    });
  });
}

function setActionPanelCentered(centered) {
  document.querySelector(".action-panel").classList.toggle("centered", centered);
}

function backMenuItem() {
  return { label: "← 返回", handler: renderMainActions, free: true, className: "sleep" };
}

async function executeAction(actionId) {
  const action = actions[actionId];
  if (!action) return;
  if (gameState.actionsLeft <= 0) {
    setDialogue("SYSTEM", "今天已經沒有行動時段了，回家睡覺吧。");
    return;
  }

  gameState.currentScene = action.scene;
  gameState.actionsLeft -= 1;
  await action.run();
  setCharacterForAction(actionId);
  triggerPeriodEvent();
  await triggerNpcEvent();
  checkAchievements();
  renderStats();
  renderScene();

  if (gameState.actionsLeft > 0) {
    const nextPeriodIndex = MAX_ACTIONS - gameState.actionsLeft;
    await showTimeTransition(gameState.day, TIME_PERIODS[nextPeriodIndex]);
  }
  if (checkCollapseEnding()) return;
  if (gameState.actionsLeft <= 0) {
    queueDialogue("SYSTEM", "今天的行動時段已用完，自動進入下一天。");
    await endDay(true);
    return;
  }
  renderMainActions();
}

function setCharacterState(state) {
  const character = document.querySelector("#roomCharacter");
  const nextState = characterStates[state] ? state : "computer";
  gameState.currentCharacterState = nextState;
  if (!character) return;

  character.classList.add("changing");
  setTimeout(() => {
    character.src = characterStates[nextState];
    character.alt = `主角狀態：${nextState}`;
    character.classList.remove("changing");
  }, 180);
}

function randomRoomCharacterState() {
  const roll = Math.random();
  if (roll < 0.4) setCharacterState("computer");
  else if (roll < 0.65) setCharacterState("seal");
  else if (roll < 0.85) setCharacterState("music");
  else setCharacterState("reading");
}

function setCharacterForAction(actionId) {
  const stateMap = {
    project: "computer",
    research: "computer",
    game: "computer",
    professor: "computer",
    shower: "seal",
    sleep: "seal",
    exercise: "music",
    library: "reading",
    homeReading: "reading",
    class: "reading"
  };
  if (gameState.currentScene === "room" && gameState.stress >= 80) {
    setCharacterState("seal");
    return;
  }
  setCharacterState(stateMap[actionId] || gameState.currentCharacterState);
}

function showTimeTransition(day, period) {
  playSound("period");
  const transition = document.querySelector("#timeTransition");
  document.querySelector("#timeTransitionDay").textContent = `第 ${day} 天`;
  document.querySelector("#timeTransitionPeriod").textContent = period;
  transition.classList.add("show");

  return new Promise((resolve) => {
    setTimeout(() => {
      transition.classList.remove("show");
      setTimeout(resolve, 220);
    }, 900);
  });
}

function triggerPeriodEvent() {
  if (Math.random() < goodEventChance(0.08)) {
    applyEffects({ money: 50, happiness: 3 });
    queueDialogue("GOOD EVENT", "你在路上撿到 50 元！金錢 +50、開心 +3。");
  }
}

async function triggerNpcEvent() {
  if (Math.random() >= 0.12) return;

  const events = [
    {
      title: "同學的邀約",
      description: "同學邀你去吃宵夜，要一起去嗎？",
      allowedPeriodIndexes: [3],
      choices: [
        {
          label: "一起去",
          result: "你和同學聊了很多，心情變好了。",
          effects: { money: -120, happiness: 12, stress: -6 }
        },
        {
          label: "婉拒邀約",
          result: "你留下來處理自己的事情。",
          effects: { projectProgress: 3, happiness: -3 }
        }
      ]
    },
    {
      title: "組員失聯",
      description: "組員突然已讀不回，你要怎麼處理？",
      choices: [
        {
          label: "自己扛下來",
          result: "你完成了組員的部分，但累得半死。",
          effects: { projectProgress: 6, energy: -10, stress: 12 }
        },
        {
          label: "找老師協助",
          result: "老師協助聯絡組員，事情暫時穩住。",
          effects: { stress: 4, happiness: 3 }
        }
      ]
    },
    {
      title: "學長姐的筆記",
      description: "學長姐願意分享整理好的考試筆記。",
      choices: [
        {
          label: "請喝飲料交換",
          result: "筆記非常實用，你快速掌握了重點。",
          effects: { money: -80, knowledge: 10, studyProgress: 5 }
        },
        {
          label: "自己慢慢整理",
          result: "雖然比較慢，但你仍整理出一些內容。",
          effects: { knowledge: 4, energy: -5 }
        }
      ]
    }
  ];

  const completedPeriodIndex = clamp(
    MAX_ACTIONS - gameState.actionsLeft - 1,
    0,
    TIME_PERIODS.length - 1
  );
  const eligibleEvents = events.filter((event) =>
    !event.allowedPeriodIndexes ||
    event.allowedPeriodIndexes.includes(completedPeriodIndex)
  );
  if (!eligibleEvents.length) return;
  const event = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
  await showChoiceEvent(event);
}

function showChoiceEvent(event) {
  const modal = document.querySelector("#choiceModal");
  document.querySelector("#choiceTitle").textContent = event.title;
  document.querySelector("#choiceDescription").textContent = event.description;
  const buttons = document.querySelector("#choiceButtons");
  buttons.innerHTML = event.choices
    .map((choice, index) => `<button type="button" data-choice="${index}">${choice.label}</button>`)
    .join("");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  return new Promise((resolve) => {
    buttons.querySelectorAll("[data-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        const choice = event.choices[Number(button.dataset.choice)];
        const before = { ...gameState };
        applyEffects(choice.effects);
        const effectText = describeActualEffects(before, gameState, choice.effects);
        setDialogue(
          "NPC EVENT",
          `你選擇了「${choice.label}」。${choice.result} 效果：${effectText}。`
        );
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        resolve();
      });
    });
  });
}

function describeActualEffects(before, after, effects) {
  const labels = {
    energy: "體力",
    stress: "壓力",
    money: "金錢",
    projectProgress: "專題",
    studyProgress: "學業",
    knowledge: "知識",
    happiness: "開心"
  };
  return Object.keys(effects)
    .map((key) => {
      const value = after[key] - before[key];
      return `${labels[key] || key} ${value > 0 ? "+" : ""}${value}`;
    })
    .join("、");
}

function goodEventChance(baseChance) {
  return clamp(baseChance + (gameState.happiness - 50) * 0.0025, 0.02, 0.35);
}

function badEventChance(baseChance) {
  return clamp(baseChance + (50 - gameState.happiness) * 0.003, 0.04, 0.45);
}

function knowledgeBonus() {
  return Math.floor(gameState.knowledge / 20);
}

function boostedKnowledge(amount) {
  return gameState.hasReferenceBook ? Math.ceil(amount * 1.5) : amount;
}

function applyEffects(effects) {
  Object.entries(effects).forEach(([key, change]) => {
    let adjustedChange = change;
    const difficulty = DIFFICULTIES[gameState.difficulty] || DIFFICULTIES.normal;
    if (key === "energy" && change < 0) {
      adjustedChange = Math.round(change * difficulty.energyCost);
    }
    if (key === "stress" && change > 0) {
      adjustedChange = Math.round(change * difficulty.stressGain);
    }
    gameState[key] = (gameState[key] || 0) + adjustedChange;
  });
  gameState.energy = clamp(gameState.energy, 0, 100);
  gameState.stress = clamp(gameState.stress, 0, 100);
  gameState.money = Math.max(0, gameState.money);
  gameState.projectProgress = clamp(gameState.projectProgress, 0, 100);
  gameState.studyProgress = clamp(gameState.studyProgress, 0, 100);
  gameState.knowledge = clamp(gameState.knowledge, 0, 100);
  gameState.happiness = clamp(gameState.happiness, 0, 100);
}

function openInventoryMenu() {
  const inventory = [
    gameState.hasLuckyCat ? "招財貓：打工報酬 2 倍" : null,
    gameState.hasReferenceBook ? "參考書：知識獲得量 1.5 倍" : null
  ].filter(Boolean);

  setDialogue(
    "INVENTORY",
    inventory.length ? `持有道具：${inventory.join("、")}` : "目前沒有永久道具。"
  );
  renderActionMenu([
    ...inventory.map((item) => ({ label: item, handler: () => {}, free: true })),
    backMenuItem()
  ]);
}

function openAchievementMenu() {
  checkAchievements();
  const unlocked = gameState.achievements.length
    ? gameState.achievements
    : ["尚未解鎖成就"];
  setDialogue("ACHIEVEMENT", `已解鎖 ${gameState.achievements.length} 個成就。`);
  renderActionMenu([
    ...unlocked.map((item) => ({ label: item, handler: () => {}, free: true })),
    backMenuItem()
  ]);
}

function checkAchievements() {
  const candidates = [
    ["專題啟動", gameState.projectActionCount >= 1],
    ["知識份子", gameState.knowledge >= 60],
    ["知識之神", gameState.knowledge >= 100],
    ["打工戰士", gameState.money >= 1500],
    ["富可敵校", gameState.money >= 3000],
    ["快樂大學生", gameState.happiness >= 90],
    ["道具收藏家", gameState.hasLuckyCat && gameState.hasReferenceBook],
    ["撐過兩週", gameState.day >= 14]
  ];

  candidates.forEach(([name, achieved]) => {
    if (achieved && !gameState.achievements.includes(name)) {
      gameState.achievements.push(name);
      showToast(`成就解鎖：${name}`);
    }
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setDialogue(speaker, text) {
  dialogueQueue = [];
  document.querySelector("#speakerName").textContent = speaker;
  document.querySelector("#dialogueText").textContent = text;
}

function queueDialogue(speaker, text) {
  dialogueQueue.push({ speaker, text });
}

function showNextDialogue() {
  const next = dialogueQueue.shift();
  if (!next) return;
  document.querySelector("#speakerName").textContent = next.speaker;
  document.querySelector("#dialogueText").textContent = next.text;
}

// Future AI integration point: replace this mock logic with an API request.
async function askAIProfessor(state) {
  if (state.projectProgress >= 80) {
    return "目前進度不錯，可以開始整理報告與準備展示。";
  }
  if (state.stress > 70) {
    return "壓力太高會影響效率，先休息一下再回來做。";
  }
  if (state.projectProgress < 40) {
    return "你目前專題進度偏低，先不要加太多功能，請先完成基本架構。";
  }
  return "進度有在前進。先確認核心功能能完整操作，再補視覺效果。";
}

function openStore() {
  setActionPanelCentered(false);
  gameState.currentScene = "store";
  renderScene();
  setDialogue("超商店員", "歡迎光臨。購買商品不消耗行動時段。");
  renderStoreMenu();
}

function renderStoreMenu() {
  renderActionMenu([
    ...storeItems.map((item) => ({
      label: `${item.name} $${item.price}`,
      detail: item.permanentKey && gameState[item.permanentKey]
        ? "已持有"
        : item.detail || formatEffects(item.effects),
      handler: () => buyItem(item),
      free: true
    })),
    backMenuItem()
  ]);
}

function formatEffects(effects) {
  if (!effects) return "";
  const labels = {
    energy: "體力",
    stress: "壓力",
    happiness: "開心",
    knowledge: "知識",
    projectProgress: "專題",
    studyProgress: "學業"
  };
  return Object.entries(effects)
    .map(([key, value]) => `${labels[key] || key} ${value > 0 ? "+" : ""}${value}`)
    .join(" / ");
}

function buyItem(item) {
  if (item.permanentKey && gameState[item.permanentKey]) {
    setDialogue("超商店員", `你已經持有「${item.name}」。`);
    return;
  }
  if (gameState.money < item.price) {
    setDialogue("超商店員", "金錢不足，無法購買。");
    return;
  }
  gameState.money -= item.price;
  if (item.effects) applyEffects(item.effects);
  if (item.permanentKey) gameState[item.permanentKey] = true;
  setDialogue("超商店員", `購買「${item.name}」成功。`);
  checkAchievements();
  renderStats();
  if (!checkCollapseEnding()) renderStoreMenu();
}

function openSaveMenu() {
  setDialogue("SAVE SYSTEM", "存檔 1 是每日自動存檔；存檔 2～4 可手動覆蓋。");
  renderActionMenu([
    {
      label: "存檔 1 / AUTO",
      handler: () => {
        setDialogue("SAVE SYSTEM", "存檔 1 僅在每天結束時自動儲存。");
        showToast("存檔 1 僅在每天結束時自動儲存。");
      },
      free: true
    },
    { label: "存檔 2", handler: () => saveGame(2, false), free: true },
    { label: "存檔 3", handler: () => saveGame(3, false), free: true },
    { label: "存檔 4", handler: () => saveGame(4, false), free: true },
    backMenuItem()
  ]);
}

async function openLoadMenu(fromLobby) {
  const playerName = localStorage.getItem("campusGamePlayer") || defaultState.playerName;
  if (fromLobby) {
    showScreen("gameScreen");
    gameState.playerName = playerName;
    renderGame();
  }
  setActionPanelCentered(false);
  setDialogue("LOAD SYSTEM", "正在檢查存檔資料……");

  const slots = await Promise.all(
    [1, 2, 3, 4].map(async (slot) => {
      try {
        const response = await fetch(`/api/save/${encodeURIComponent(playerName)}/${slot}`);
        if (response.status === 404) return { slot, data: null };
        if (!response.ok) throw new Error("讀取失敗");
        return { slot, data: await response.json() };
      } catch (error) {
        return { slot, data: null };
      }
    })
  );

  setDialogue("LOAD SYSTEM", "選擇要載入的存檔槽位。");
  renderActionMenu([
    ...slots.map(({ slot, data }) => ({
      label: `存檔 ${slot}${slot === 1 ? " / AUTO" : ""}`,
      detail: data
        ? `DAY ${data.day} / 剩餘 ${Number.isInteger(data.actionsLeft) ? data.actionsLeft : MAX_ACTIONS} 次`
        : "NO DATA",
      handler: data
        ? () => loadGame(slot)
        : () => setDialogue("LOAD SYSTEM", `存檔 ${slot}：NO DATA`),
      free: true
    })),
    backMenuItem()
  ]);
}

async function loadGame(slot) {
  const playerName = localStorage.getItem("campusGamePlayer") || gameState.playerName;
  try {
    const response = await fetch(`/api/save/${encodeURIComponent(playerName)}/${slot}`);
    if (response.status === 404) {
      setDialogue("LOAD SYSTEM", `存檔 ${slot}：NO DATA`);
      return;
    }
    if (!response.ok) throw new Error("讀取失敗");
    const save = await response.json();
    playSound("load");
    const savedActionsLeft = Number.isInteger(save.actionsLeft)
      ? clamp(save.actionsLeft, 0, MAX_ACTIONS)
      : MAX_ACTIONS;
    gameState = { ...defaultState, ...save, actionsLeft: savedActionsLeft };
    setCharacterState(gameState.currentCharacterState);
    setDialogue(
      "LOAD SYSTEM",
      `已載入存檔 ${slot}：DAY ${gameState.day}，剩餘 ${gameState.actionsLeft} 次行動。`
    );
    renderGame();
    const periodIndex = clamp(MAX_ACTIONS - gameState.actionsLeft, 0, TIME_PERIODS.length - 1);
    await showTimeTransition(gameState.day, TIME_PERIODS[periodIndex]);
  } catch (error) {
    setDialogue("LOAD SYSTEM", "無法連接存檔伺服器。");
  }
}

async function endDay(automatic = false) {
  gameState.currentScene = "room";

  if (gameState.day % 7 === 0) {
    evaluateWeeklyProgress();
    checkAchievements();
    if (checkCollapseEnding()) return;
  }

  if (gameState.day >= MAX_DAY) {
    await saveGame(1, true);
    showEnding();
    return;
  }

  gameState.day += 1;
  gameState.actionsLeft = MAX_ACTIONS;
  randomRoomCharacterState();
  await saveGame(1, true);
  await showTimeTransition(gameState.day, TIME_PERIODS[0]);
  setDialogue(
    "SYSTEM",
    automatic
      ? `行動時段用完。第 ${gameState.day} 天自動開始，存檔 1 已更新。`
      : `早安。第 ${gameState.day} 天開始，遊戲已自動存檔。`
  );
  renderGame();
}

function evaluateWeeklyProgress() {
  const weekIndex = Math.min(2, Math.floor((gameState.day - 1) / 7));
  const difficulty = DIFFICULTIES[gameState.difficulty] || DIFFICULTIES.normal;
  const [projectTarget, studyTarget] = difficulty.weeklyTargets[weekIndex];
  const projectPassed = gameState.projectProgress >= projectTarget;
  const studyPassed = gameState.studyProgress >= studyTarget;

  if (projectPassed && studyPassed) {
    applyEffects({ money: 150, happiness: 8, stress: -5 });
    queueDialogue(
      "WEEKLY REPORT",
      `第 ${weekIndex + 1} 週進度達標！專題目標 ${projectTarget}、學業目標 ${studyTarget}，獲得獎勵。`
    );
    showToast(`第 ${weekIndex + 1} 週進度達標`);
  } else {
    applyEffects({ stress: 15, happiness: -10 });
    queueDialogue(
      "WEEKLY REPORT",
      `第 ${weekIndex + 1} 週進度未達標。目標：專題 ${projectTarget}、學業 ${studyTarget}。`
    );
    showToast(`第 ${weekIndex + 1} 週進度未達標`);
  }
}

async function saveGame(slot = 1, automatic = false) {
  const payload = {
    playerName: gameState.playerName,
    slot,
    currentScene: gameState.currentScene,
    day: gameState.day,
    actionsLeft: gameState.actionsLeft,
    energy: gameState.energy,
    stress: gameState.stress,
    money: gameState.money,
    projectProgress: gameState.projectProgress,
    studyProgress: gameState.studyProgress,
    knowledge: gameState.knowledge,
    happiness: gameState.happiness,
    hasLuckyCat: gameState.hasLuckyCat,
    hasReferenceBook: gameState.hasReferenceBook,
    difficulty: gameState.difficulty,
    achievements: gameState.achievements,
    projectActionCount: gameState.projectActionCount,
    currentCharacterState: gameState.currentCharacterState,
    unlockedEndings: gameState.unlockedEndings
  };

  try {
    const response = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("儲存失敗");
    playSound("save");
    localStorage.setItem("campusGamePlayer", gameState.playerName);
    showToast(automatic ? "新的一天開始，存檔 1 已自動儲存。" : `存檔 ${slot} 儲存成功。`);
    if (!automatic) openSaveMenu();
  } catch (error) {
    localStorage.setItem(`campusGameBackup${slot}`, JSON.stringify(payload));
    showToast("伺服器存檔失敗，已暫存於瀏覽器。");
  }
}

function checkCollapseEnding() {
  if (gameState.energy > 0 || gameState.stress < 100) return false;
  showEnding("collapse");
  return true;
}

function showEnding(type = "deadline") {
  const project = gameState.projectProgress;
  const study = gameState.studyProgress;
  let ending;

  if (type === "collapse") {
    ending = [
      "F",
      "體力透支，壓力破百",
      "你的體力已經耗盡，壓力也突破 100。身體終於撐不住，在期末結束前倒下了。"
    ];
  } else if (gameState.projectActionCount === 0) {
    ending = [
      "???",
      "佛系人生",
      "三週以來你完全沒有寫過專題。專題沒有完成，但你證明了逃避也需要堅持。"
    ];
  } else if (gameState.knowledge >= 100) {
    ending = ["S", "知識之神", "你的知識含量達到頂峰，老師甚至開始向你詢問技術問題。"];
  } else if (gameState.money >= 3000) {
    ending = ["$", "打工皇帝", "期末成果普通，但你的存款已經超越大多數同學。"];
  } else if (gameState.happiness >= 90) {
    ending = ["H", "快樂大學生", "不論結果如何，你成功守住了自己的快樂與生活。"];
  } else if (project >= 90 && study >= 80) {
    ending = ["A+", "100% ALL PASS", "你成功完成期末專題，也順利通過本學期課程。"];
  } else if (project >= 90 && study >= 60) {
    ending = Math.random() < 0.7
      ? ["A", "70% ALL PASS", "最後的運氣站在你這邊，專題與學業都順利通過。"]
      : ["B", "專題通過，學業被當", "專題成果很完整，但部分課程成績沒有達標。"];
  } else if (project >= 80 && study >= 40) {
    ending = Math.random() < 0.4
      ? ["B+", "40% ALL PASS", "你在最後關頭驚險守住所有成果。"]
      : ["B", "專題通過，學業危險", "專題成功完成，但學業進度不足。"];
  } else if (project < 60 && study >= 70) {
    ending = ["C", "學業通過但專題失敗", "雖然學業勉強通過，但期末專題沒有完成。"];
  } else if (project < 60 && study < 70) {
    ending = ["F", "期末爆炸", "專題與學業都沒有達標，期末爆炸了。"];
  } else {
    ending = ["C+", "差一點完成", "你撐過了三週，但部分目標仍差最後一步。"];
  }

  unlockEnding(getEndingCode(type, project, study));
  document.querySelector("#endingGrade").textContent = ending[0];
  document.querySelector("#endingTitle").textContent = ending[1];
  document.querySelector("#endingDescription").textContent = ending[2];
  document.querySelector("#endingStats").innerHTML = [
    ["最終專題進度", `${project}%`],
    ["最終學業進度", `${study}%`],
    ["知識含量", `${gameState.knowledge}%`],
    ["最終開心值", `${gameState.happiness}%`],
    ["最終壓力", `${gameState.stress}%`],
    ["最終體力", `${gameState.energy}%`],
    ["最終金錢", `$${gameState.money}`]
  ]
    .map(([label, value]) =>
      `<div class="ending-stat"><span>${label}</span><strong>${value}</strong></div>`
    )
    .join("");
  showScreen("endingScreen");
}

function getEndingCode(type, project, study) {
  if (type === "collapse") return "COLLAPSE";
  if (gameState.projectActionCount === 0) return "ZEN";
  if (gameState.knowledge >= 100) return "KNOWLEDGE_GOD";
  if (gameState.money >= 3000) return "WORK_KING";
  if (gameState.happiness >= 90) return "HAPPY_STUDENT";
  if (project >= 90 && study >= 80) return "ALL_PASS";
  if (project >= 90 && study >= 60) return "HIGH_PASS";
  if (project >= 80 && study >= 40) return "PROJECT_PASS";
  if (project < 60 && study >= 70) return "STUDY_PASS";
  if (project < 60 && study < 70) return "BAD_END";
  return "PROJECT_PASS";
}

function unlockEnding(code) {
  if (!gameState.unlockedEndings.includes(code)) {
    gameState.unlockedEndings.push(code);
    showToast("新結局已加入收藏");
  }
  const localUnlocked = new Set(
    JSON.parse(localStorage.getItem("campusUnlockedEndings") || "[]")
  );
  localUnlocked.add(code);
  localStorage.setItem("campusUnlockedEndings", JSON.stringify([...localUnlocked]));
  renderEndingCollection();
  saveGame(1, true);
}

function getUnlockedEndings() {
  return new Set([
    ...(gameState.unlockedEndings || []),
    ...JSON.parse(localStorage.getItem("campusUnlockedEndings") || "[]")
  ]);
}

function runEndingDemo() {
  playSound("load");
  gameState = {
    ...defaultState,
    playerName: localStorage.getItem("campusGamePlayer") || gameState.playerName || "Demo Player",
    day: MAX_DAY,
    actionsLeft: 0,
    energy: 76,
    stress: 28,
    money: 1280,
    projectProgress: 96,
    studyProgress: 88,
    knowledge: 72,
    happiness: 80,
    projectActionCount: 8,
    currentScene: "room",
    currentCharacterState: "computer",
    unlockedEndings: [...getUnlockedEndings()]
  };
  setCharacterState(gameState.currentCharacterState);
  showEnding("deadline");
}

function unlockAllEndings() {
  const allCodes = ENDING_CATALOG.map(([code]) => code);
  gameState.unlockedEndings = [...new Set([...(gameState.unlockedEndings || []), ...allCodes])];
  localStorage.setItem("campusUnlockedEndings", JSON.stringify(gameState.unlockedEndings));
  playSound("save");
  renderEndingCollection();
  saveGame(1, true);
  showToast("已快速解鎖所有結局收藏。");
}

function renderEndingCollection() {
  const container = document.querySelector("#endingCollection");
  if (!container) return;
  const unlocked = getUnlockedEndings();
  container.innerHTML = ENDING_CATALOG.map(([code, title, description]) => {
    const isUnlocked = unlocked.has(code);
    return `
      <article class="collection-card pixel-panel ${isUnlocked ? "" : "locked"}">
        <p class="eyebrow">${isUnlocked ? "UNLOCKED" : "LOCKED"}</p>
        <strong>${isUnlocked ? title : "？？？"}</strong>
        <p>${isUnlocked ? description : "完成特定條件後解鎖此結局。"}</p>
      </article>`;
  }).join("");
}

async function submitDanmaku(event) {
  event.preventDefault();
  const submitButton = document.querySelector("#danmakuSubmitButton");
  const formElement = event.currentTarget;
  const form = new FormData(event.currentTarget);
  const payload = {
    name: form.get("name"),
    content: form.get("content"),
    color: form.get("color"),
    day: Number(form.get("day"))
  };
  const message = document.querySelector("#danmakuFormMessage");

  try {
    submitButton.disabled = true;
    submitButton.textContent = "傳送中…";
    message.textContent = "正在儲存彈幕，請稍候…";
    const response = await fetch("/api/danmaku", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    message.textContent = data.persistent
      ? "彈幕已寫入 MongoDB，重新整理或重新上線後仍會存在。"
      : "彈幕已送出，但目前只存於伺服器記憶體，重新啟動後會消失。";
    resetDanmakuForm(formElement);
    await loadDanmakuList();
    revealDanmakuListOnMobile();
    if (gameState.day === payload.day && gameState.currentScene === "room") {
      await loadDayDanmaku();
    }
  } catch (error) {
    const wasSaved = await verifyDanmakuWasSaved(payload);
    if (wasSaved) {
      message.textContent = "彈幕已成功儲存。手機連線回應較慢，但資料已寫入 MongoDB。";
      resetDanmakuForm(formElement);
      await loadDanmakuList();
      revealDanmakuListOnMobile();
    } else {
      message.textContent =
        error instanceof TypeError
          ? "目前無法確認伺服器回應，彈幕尚未送出，請稍後再試。"
          : error.message || "彈幕新增失敗";
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "傳送彈幕";
  }
}

function resetDanmakuForm(formElement) {
  formElement.reset();
  formElement.elements.color.value = "#55f7d2";
  formElement.elements.day.value = "1";
}

async function verifyDanmakuWasSaved(payload) {
  try {
    const response = await fetch("/api/danmaku", {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return false;
    const items = await response.json();
    return items.some((item) =>
      item.name === payload.name &&
      item.content === payload.content &&
      Number(item.day) === Number(payload.day)
    );
  } catch (error) {
    return false;
  }
}

function revealDanmakuListOnMobile() {
  if (!window.matchMedia("(max-width: 760px)").matches) return;
  document.querySelector(".danmaku-list-panel")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

async function loadDanmakuList() {
  const list = document.querySelector("#danmakuList");
  list.innerHTML = "<p>讀取中...</p>";
  try {
    const response = await fetch("/api/danmaku", { cache: "no-store" });
    if (!response.ok) throw new Error("讀取失敗");
    const items = await response.json();
    list.innerHTML = items.length
      ? items.map(renderDanmakuItem).join("")
      : '<p class="form-message">資料庫目前沒有彈幕，遊戲會顯示預設訊息。</p>';
    list.querySelectorAll("[data-delete-danmaku]").forEach((button) => {
      button.addEventListener("click", () => deleteDanmaku(button.dataset.deleteDanmaku));
    });
  } catch (error) {
    list.innerHTML =
      '<p class="form-message">無法連接彈幕 API。請確認伺服器已啟動，正式部署時請查看 Render 服務是否休眠或啟動失敗。</p>';
  }
}

function renderDanmakuItem(item) {
  return `
    <article class="danmaku-item" style="border-color:${item.color}">
      <button class="danmaku-delete" data-delete-danmaku="${escapeHtml(item._id)}">刪除</button>
      <small>DAY ${item.day}</small>
      <strong style="color:${item.color}">${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.content)}</span>
    </article>`;
}

async function deleteDanmaku(id) {
  if (!window.confirm("確定要刪除這則彈幕嗎？")) return;
  try {
    const response = await fetch(`/api/danmaku/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    showToast("彈幕已刪除");
    await loadDanmakuList();
    if (gameState.currentScene === "room") await loadDayDanmaku();
  } catch (error) {
    showToast(error.message || "刪除彈幕失敗");
  }
}

async function loadDayDanmaku() {
  const stage = document.querySelector("#danmakuStage");
  stage.innerHTML = "";
  if (gameState.currentScene !== "room") return;

  let items = [];
  try {
    const response = await fetch(`/api/danmaku/${gameState.day}`);
    if (response.ok) items = await response.json();
  } catch (error) {
    // API unavailable: use the default room messages below.
  }

  if (!items.length) {
    items = [
      { name: "路過同學", content: "期末加油，先做完再說！", color: "#55f7d2" },
      { name: "昨日的你", content: "記得存檔，也記得睡覺。", color: "#ffd166" },
      { name: "匿名", content: "Bug 修不完，但期限會到。", color: "#ff5ba8" }
    ];
  }

  items.slice(0, 12).forEach((item, index) => {
    const element = document.createElement("div");
    element.className = "flying-danmaku";
    element.textContent = `${item.name}: ${item.content}`;
    element.style.color = item.color;
    element.style.top = `${15 + (index % 5) * 30}px`;
    element.style.animationDuration = `${20 + (index % 4) * 3}s`;
    element.style.animationDelay = `${index * -1.7}s`;
    stage.appendChild(element);
  });
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value);
  return element.innerHTML;
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

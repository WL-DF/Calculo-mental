// --- Elementos do DOM ---
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const statsModal = document.getElementById('stats-modal');

// Inputs Config
const xMinInput = document.getElementById('x-min');
const xMaxInput = document.getElementById('x-max');
const yMinInput = document.getElementById('y-min');
const yMaxInput = document.getElementById('y-max');
const decimalsCheck = document.getElementById('allow-decimals');
const targetScoreInput = document.getElementById('target-score');
const timeBtns = document.querySelectorAll('.time-btn');

// Game Elements
const questionDisplay = document.getElementById('question-display');
const answerInput = document.getElementById('answer-input');
const timeDisplay = document.getElementById('time-left');
const scoreDisplay = document.getElementById('score');
const scoreTargetDisplay = document.getElementById('score-target');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');

// Stats Elements
const finalScoreEl = document.getElementById('final-score');
const avgSpeedEl = document.getElementById('avg-speed');
const slowListEl = document.getElementById('slow-list');
const restartBtn = document.getElementById('restart-btn');

// --- Estado ---
let config = {
    duration: 60,
    targetScore: 0,
    ops: [],
    xRange: [1, 50],
    yRange: [1, 50],
    decimals: false
};

let gameState = {
    timer: null,
    timeLeft: 0,
    score: 0,
    currentAnswer: 0,
    questionStartTime: 0,
    history: [] 
};

// --- Configuração ---

// Timer
timeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        timeBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        config.duration = parseInt(btn.dataset.time);
    });
});

// START
document.getElementById('start-btn').addEventListener('click', () => {
    // 1. Operações
    config.ops = [];
    if (document.getElementById('op-add').checked) config.ops.push('+');
    if (document.getElementById('op-sub').checked) config.ops.push('-');
    if (document.getElementById('op-mul').checked) config.ops.push('*');
    if (document.getElementById('op-div').checked) config.ops.push('/');

    if (config.ops.length === 0) return alert("Selecione pelo menos uma operação!");

    // 2. Ranges e Meta
    config.xRange = [parseFloat(xMinInput.value), parseFloat(xMaxInput.value)];
    config.yRange = [parseFloat(yMinInput.value), parseFloat(yMaxInput.value)];
    config.decimals = decimalsCheck.checked;
    
    let metaVal = parseInt(targetScoreInput.value);
    config.targetScore = isNaN(metaVal) ? 0 : metaVal;

    if (config.xRange[0] >= config.xRange[1] || config.yRange[0] >= config.yRange[1]) {
        return alert("O valor Mínimo deve ser menor que o Máximo.");
    }

    startGame();
});

// --- Lógica do Jogo ---

function startGame() {
    gameState.score = 0;
    gameState.timeLeft = config.duration;
    gameState.history = [];
    
    scoreDisplay.innerText = "0";
    
    if (config.targetScore > 0) {
        scoreTargetDisplay.innerText = ` / ${config.targetScore}`;
        progressContainer.classList.remove('hidden');
        updateProgress();
    } else {
        scoreTargetDisplay.innerText = "";
        progressContainer.classList.add('hidden');
    }

    if (config.duration >= 99999) {
        timeDisplay.innerText = "∞";
    } else {
        timeDisplay.innerText = gameState.timeLeft;
        gameState.timer = setInterval(() => {
            gameState.timeLeft--;
            timeDisplay.innerText = gameState.timeLeft;
            if (gameState.timeLeft <= 0) endGame();
        }, 1000);
    }

    setupScreen.classList.add('hidden');
    statsModal.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    answerInput.focus();
    generateQuestion();
}

function updateProgress() {
    if (config.targetScore <= 0) return;
    const pct = (gameState.score / config.targetScore) * 100;
    progressBar.style.width = `${pct}%`;
}

function generateQuestion() {
    const op = config.ops[Math.floor(Math.random() * config.ops.length)];
    let x = randomNum(config.xRange[0], config.xRange[1], config.decimals);
    let y = randomNum(config.yRange[0], config.yRange[1], config.decimals);
    
    let displayQ = "";
    let correctA = 0;

    if (op === '+') {
        correctA = fixNum(x + y);
        displayQ = `${x} + ${y}`;
    } 
    else if (op === '-') {
        let total = fixNum(x + y);
        correctA = y; 
        displayQ = `${total} - ${x}`;
    } 
    else if (op === '*') {
        correctA = fixNum(x * y);
        displayQ = `${x} × ${y}`;
    } 
    else if (op === '/') {
        let total = fixNum(x * y);
        if (x === 0) x = 1; 
        correctA = y; 
        displayQ = `${total} ÷ ${x}`;
    }

    gameState.currentAnswer = correctA.toString();
    questionDisplay.innerText = displayQ;
    
    questionDisplay.classList.remove('pop-anim');
    void questionDisplay.offsetWidth; 
    questionDisplay.classList.add('pop-anim');

    gameState.questionStartTime = Date.now();
    answerInput.value = "";
    answerInput.focus();
}

function randomNum(min, max, isDecimal) {
    let num = Math.random() * (max - min) + min;
    return isDecimal ? parseFloat(num.toFixed(1)) : Math.floor(num);
}

function fixNum(num) {
    return config.decimals ? parseFloat(num.toFixed(1)) : Math.round(num);
}

answerInput.addEventListener('input', (e) => {
    if (e.target.value === gameState.currentAnswer) {
        handleCorrectAnswer();
    }
});

function handleCorrectAnswer() {
    gameState.score++;
    scoreDisplay.innerText = gameState.score;
    updateProgress();

    const timeTaken = (Date.now() - gameState.questionStartTime) / 1000;
    gameState.history.push({
        question: questionDisplay.innerText,
        answer: gameState.currentAnswer,
        time: timeTaken
    });

    if (config.targetScore > 0 && gameState.score >= config.targetScore) {
        endGame();
        return;
    }

    generateQuestion();
}

document.getElementById('stop-btn').addEventListener('click', endGame);

function endGame() {
    clearInterval(gameState.timer);
    
    finalScoreEl.innerText = gameState.score;
    
    let totalTime = gameState.history.reduce((acc, cur) => acc + cur.time, 0);
    let avg = gameState.score > 0 ? (totalTime / gameState.score).toFixed(2) : "0.00";
    avgSpeedEl.innerText = `${avg}s`;

    const slowOnes = gameState.history.filter(h => h.time > 5);
    slowListEl.innerHTML = "";
    
    if (slowOnes.length === 0 && gameState.history.length > 0) {
        slowListEl.innerHTML = "<li>⚡ Rápido como um raio!</li>";
    } else if (gameState.history.length === 0) {
        slowListEl.innerHTML = "<li>Nenhuma conta resolvida.</li>";
    } else {
        slowOnes.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<b>${item.question}</b> = ${item.answer} <span style="color:var(--danger)">(${item.time.toFixed(1)}s)</span>`;
            slowListEl.appendChild(li);
        });
    }

    gameScreen.classList.add('hidden');
    statsModal.classList.remove('hidden');
}

restartBtn.addEventListener('click', () => {
    statsModal.classList.add('hidden');
    setupScreen.classList.remove('hidden');
});

// --- DARK MODE LOGIC ---
const themeBtn = document.getElementById('theme-toggle');
const body = document.body;

// Carregar preferência salva
if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark-mode');
    themeBtn.innerText = '☀️';
}

themeBtn.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        themeBtn.innerText = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        themeBtn.innerText = '🌙';
        localStorage.setItem('theme', 'light');
    }
});
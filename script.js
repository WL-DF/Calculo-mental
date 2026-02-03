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
    targetScore: 0, // 0 = sem meta (infinito)
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

// Timer Seleção
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

    if (config.ops.length === 0) return alert("Selecione uma operação!");

    // 2. Ranges e Meta
    config.xRange = [parseFloat(xMinInput.value), parseFloat(xMaxInput.value)];
    config.yRange = [parseFloat(yMinInput.value), parseFloat(yMaxInput.value)];
    config.decimals = decimalsCheck.checked;
    
    // Ler meta de questões (se vazio ou 0, vira 0)
    let metaVal = parseInt(targetScoreInput.value);
    config.targetScore = isNaN(metaVal) ? 0 : metaVal;

    if (config.xRange[0] >= config.xRange[1] || config.yRange[0] >= config.yRange[1]) {
        return alert("Mínimo deve ser menor que Máximo.");
    }

    startGame();
});

// --- Lógica do Jogo ---

function startGame() {
    gameState.score = 0;
    gameState.timeLeft = config.duration;
    gameState.history = [];
    
    scoreDisplay.innerText = "0";
    
    // Configura UI da Meta
    if (config.targetScore > 0) {
        scoreTargetDisplay.innerText = ` / ${config.targetScore}`;
        progressContainer.classList.remove('hidden');
        updateProgress();
    } else {
        scoreTargetDisplay.innerText = "";
        progressContainer.classList.add('hidden');
    }

    // Configura Timer
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
    
    // Animação leve ao trocar
    questionDisplay.classList.remove('pop-anim');
    void questionDisplay.offsetWidth; // trigger reflow
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

// Input Listener
answerInput.addEventListener('input', (e) => {
    if (e.target.value === gameState.currentAnswer) {
        handleCorrectAnswer();
    }
});

function handleCorrectAnswer() {
    gameState.score++;
    scoreDisplay.innerText = gameState.score;
    updateProgress();

    // Stats
    const timeTaken = (Date.now() - gameState.questionStartTime) / 1000;
    gameState.history.push({
        question: questionDisplay.innerText,
        answer: gameState.currentAnswer,
        time: timeTaken
    });

    // Checar Meta
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
    
    // Calcular velocidade média
    let totalTime = gameState.history.reduce((acc, cur) => acc + cur.time, 0);
    let avg = gameState.score > 0 ? (totalTime / gameState.score).toFixed(2) : "0.00";
    avgSpeedEl.innerText = `${avg}s`;

    // Lista de Lentos
    const slowOnes = gameState.history.filter(h => h.time > 5);
    slowListEl.innerHTML = "";
    
    if (slowOnes.length === 0 && gameState.history.length > 0) {
        slowListEl.innerHTML = "<li>⚡ Você foi rápido em todas!</li>";
    } else if (gameState.history.length === 0) {
        slowListEl.innerHTML = "<li>Nada respondido.</li>";
    } else {
        slowOnes.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<b>${item.question}</b> = ${item.answer} <span style="color:red">(${item.time.toFixed(1)}s)</span>`;
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
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

// --- Configuração da Divisão ---
const opDivCheck = document.getElementById('op-div');
const divOptionsContainer = document.getElementById('div-advanced-options');
const inverseDivCheck = document.getElementById('inverse-div'); 
const brokenIntDivCheck = document.getElementById('broken-int-div'); 

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

// Variável para armazenar pares pré-calculados de divisão exata
let validDivisionPairs = [];

// --- Lógica de Interface (UI Logic) ---

function toggleDivOptions() {
    if (opDivCheck.checked) {
        divOptionsContainer.classList.remove('hidden');
        if (decimalsCheck.checked) {
            brokenIntDivCheck.checked = true;
            inverseDivCheck.checked = false;
        }
    } else {
        divOptionsContainer.classList.add('hidden');
    }
}
opDivCheck.addEventListener('change', toggleDivOptions);

decimalsCheck.addEventListener('change', () => {
    if (decimalsCheck.checked && opDivCheck.checked) {
        brokenIntDivCheck.checked = true;
        inverseDivCheck.checked = false;
    }
});

inverseDivCheck.addEventListener('change', () => {
    if (inverseDivCheck.checked) brokenIntDivCheck.checked = false;
});

brokenIntDivCheck.addEventListener('change', () => {
    if (brokenIntDivCheck.checked) inverseDivCheck.checked = false;
});

// --- Estado do Jogo ---
let config = {
    duration: 60,
    targetScore: 0,
    ops: [],
    xRange: [1, 50],
    yRange: [1, 50],
    decimals: false,
    inverseDiv: false,
    brokenIntDiv: false
};

let gameState = {
    timer: null,
    timeLeft: 0,
    score: 0,
    currentAnswer: 0,
    currentQuestionText: "",
    questionStartTime: 0,
    history: [] 
};

// --- Configuração e Início ---

timeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        timeBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        config.duration = parseInt(btn.dataset.time);
    });
});

document.getElementById('start-btn').addEventListener('click', () => {
    config.ops = [];
    if (document.getElementById('op-add').checked) config.ops.push('+');
    if (document.getElementById('op-sub').checked) config.ops.push('-');
    if (document.getElementById('op-mul').checked) config.ops.push('*');
    if (document.getElementById('op-div').checked) config.ops.push('/');

    if (config.ops.length === 0) return alert("Selecione pelo menos uma operação!");

    config.xRange = [parseFloat(xMinInput.value), parseFloat(xMaxInput.value)];
    config.yRange = [parseFloat(yMinInput.value), parseFloat(yMaxInput.value)];
    config.decimals = decimalsCheck.checked;
    
    config.inverseDiv = inverseDivCheck.checked;
    config.brokenIntDiv = brokenIntDivCheck.checked;
    
    let metaVal = parseInt(targetScoreInput.value);
    config.targetScore = isNaN(metaVal) ? 0 : metaVal;

    if (config.xRange[0] >= config.xRange[1] || config.yRange[0] >= config.yRange[1]) {
        return alert("O valor Mínimo deve ser menor que o Máximo.");
    }

    // Se tiver divisão padrão, calculamos os pares antes de começar
    if (config.ops.includes('/') && !config.decimals && !config.inverseDiv && !config.brokenIntDiv) {
        precomputeValidDivisions();
    }

    startGame();
});

// --- Motor do Jogo ---

// PRÉ-CÁLCULO INTELIGENTE (Para divisão padrão)
function precomputeValidDivisions() {
    validDivisionPairs = [];
    
    const xMin = config.xRange[0];
    const xMax = config.xRange[1];
    const yMin = config.yRange[0];
    const yMax = config.yRange[1];

    for (let d = yMin; d <= yMax; d++) {
        if (d === 0) continue; 
        
        let firstMult = Math.ceil(xMin / d) * d;
        if (firstMult < xMin) firstMult += d; 

        for (let n = firstMult; n <= xMax; n += d) {
            // EVITAR RESULTADOS IGUAIS A 1 (exceto se inevitável)
            if (n !== d) {
                validDivisionPairs.push({ num: n, den: d });
            }
        }
    }
    
    // Se a lista ficou vazia, permite X=Y
    if (validDivisionPairs.length === 0) {
        for (let d = yMin; d <= yMax; d++) {
            if (d !== 0 && d >= xMin && d <= xMax) {
                validDivisionPairs.push({ num: d, den: d });
            }
        }
    }
}

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
    
    answerInput.value = "";
    answerInput.focus();
    generateQuestion();
}

function updateProgress() {
    if (config.targetScore <= 0) return;
    const pct = (gameState.score / config.targetScore) * 100;
    progressBar.style.width = `${pct}%`;
}

function truncateToTwoDecimals(num) {
    return Math.floor(num * 100) / 100;
}

function generateQuestion() {
    const op = config.ops[Math.floor(Math.random() * config.ops.length)];
    
    let x, y;
    
    // Gera X e Y padrão para +, -, *
    if (op !== '/') {
        x = randomNum(config.xRange[0], config.xRange[1], config.decimals);
        y = randomNum(config.yRange[0], config.yRange[1], config.decimals);
    }
    
    let correctA = 0;
    let htmlContent = "";
    let plainText = "";

    if (op === '+') {
        correctA = truncateToTwoDecimals(x + y);
        htmlContent = `${x} + ${y}`;
        plainText = `${x} + ${y}`;
    } 
    else if (op === '-') {
        let total = truncateToTwoDecimals(x + y);
        correctA = y; 
        htmlContent = `${total} - ${x}`;
        plainText = `${total} - ${x}`;
    } 
    else if (op === '*') {
        correctA = truncateToTwoDecimals(x * y);
        htmlContent = `${x} × ${y}`;
        plainText = `${x} * ${y}`;
    } 
    else if (op === '/') {
        let num, den;

        // Se for divisão especial (Decimal, Invertida, Quebrada)
        if (config.inverseDiv || config.brokenIntDiv || config.decimals) {
            x = randomNum(config.xRange[0], config.xRange[1], config.decimals);
            y = randomNum(config.yRange[0], config.yRange[1], config.decimals);

            let big = (x > y) ? x : y;
            let small = (x > y) ? y : x;
            if (small === 0) small = 1; 
            if (big === 0) big = 1; 

            if (config.inverseDiv) {
                num = small; den = big;
            } else if (config.brokenIntDiv) {
                num = big; den = small;
            } else { 
                num = x; den = (y === 0) ? 1 : y;
            }
            correctA = truncateToTwoDecimals(num / den);
            
        } else {
            // MODO PADRÃO OTIMIZADO (Usa lista pré-calculada)
            if (validDivisionPairs.length > 0) {
                const randomIndex = Math.floor(Math.random() * validDivisionPairs.length);
                const pair = validDivisionPairs[randomIndex];
                num = pair.num;
                den = pair.den;
            } else {
                // Fallback (se a lista estiver vazia por ranges ruins)
                num = Math.floor(randomNum(config.xRange[0], config.xRange[1], false));
                if (num === 0) num = 1;
                den = num; 
            }
            correctA = num / den;
        }

        htmlContent = `
            <div class="fraction">
                <span class="numerator">${num}</span>
                <span class="denominator">${den}</span>
            </div>`;
        
        plainText = `${num} / ${den}`;
    }

    gameState.currentAnswer = correctA;
    gameState.currentQuestionText = plainText;
    
    questionDisplay.innerHTML = htmlContent;
    questionDisplay.classList.remove('pop-anim');
    void questionDisplay.offsetWidth; 
    questionDisplay.classList.add('pop-anim');

    gameState.questionStartTime = Date.now();
    answerInput.value = "";
    answerInput.focus();
}

function randomNum(min, max, isDecimal) {
    if (isDecimal) {
        let num = Math.random() * (max - min) + min;
        return parseFloat(num.toFixed(2));
    } else {
        // Correção aplicada: Inclui o MAX no sorteio
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

answerInput.addEventListener('input', (e) => {
    let userVal = e.target.value;
    if (userVal === '') return;
    
    userVal = userVal.replace(',', '.');
    let valFloat = parseFloat(userVal);

    if (Math.abs(valFloat - gameState.currentAnswer) < 0.00001) {
        handleCorrectAnswer();
    }
});

function handleCorrectAnswer() {
    gameState.score++;
    scoreDisplay.innerText = gameState.score;
    updateProgress();

    const timeTaken = (Date.now() - gameState.questionStartTime) / 1000;
    gameState.history.push({
        question: gameState.currentQuestionText,
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

// Inicializar
toggleDivOptions();

// Dark Mode
const themeBtn = document.getElementById('theme-toggle');
const body = document.body;
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
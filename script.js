/**
 * APENAS DIVERSÃO / JUST FUN - Slot Machine JavaScript
 * Tema: Parque de Diversões Virtual
 * Autor: Thiago Freitas
 * Versão: 1.0.0
 */

// =============================================
// CONFIGURAÇÃO E CONSTANTES
// =============================================
const CONFIG = {
    // Símbolos do jogo
    symbols: ['🎪', '🎡', '🎢', '🎠', '🍭'],
    
    // Tabela de pagamentos
    payouts: {
        threeOfKind: 10,
        twoOfKind: 5,
        jackpot: 50  // 3x 🎪 (tenda de circo)
    },
    
    // Configurações de animação
    animation: {
        spinDuration: {
            min: 1500,
            max: 3000
        },
        symbolDelay: 200,
        countUpDuration: 1000
    },
    
    // Créditos iniciais
    initialCredits: 100,
    betCost: 1,
    
    // Idiomas
    languages: {
        pt: {
            spin: 'GIRAR',
            credits: 'Créditos',
            bet: 'Aposta',
            howToPlay: 'ℹ️ Como Jogar',
            welcome: 'Bem-vindo! Pressione GIRAR para começar',
            spinning: 'Girando...',
            win: 'Você ganhou!',
            lose: 'Tente novamente!',
            jackpot: '🎉 JACKPOT! 🎉',
            noCredits: 'Sem créditos! Jogo finalizado.',
            paytable: 'Tabela de Pagamento',
            symbols: 'Símbolos',
            threeMatch: '3 iguais = 10x aposta',
            twoMatch: '2 iguais = 2x aposta',
            jackpotInfo: '= JACKPOT (50x)'
        },
        en: {
            spin: 'SPIN',
            credits: 'Credits',
            bet: 'Bet',
            howToPlay: 'ℹ️ How to Play',
            welcome: 'Welcome! Press SPIN to start',
            spinning: 'Spinning...',
            win: 'You won!',
            lose: 'Try again!',
            jackpot: '🎉 JACKPOT! 🎉',
            noCredits: 'No credits! Game over.',
            paytable: 'Paytable',
            symbols: 'Symbols',
            threeMatch: '3 of a kind = 10x bet',
            twoMatch: '2 of a kind = 2x bet',
            jackpotInfo: '= JACKPOT (50x)'
        }
    }
};

// =============================================
// ESTADO DO JOGO
// =============================================
const gameState = {
    credits: CONFIG.initialCredits,
    currentBet: 1,
    isSpinning: false,
    currentLanguage: 'pt',
    soundEnabled: true,
    reelResults: [null, null, null],
    animationTimeouts: []
};

// =============================================
// CACHE DE ELEMENTOS DOM
// =============================================
const elements = {
    // Rolos e símbolos
    reels: null,
    reelStrips: null,
    
    // Controles
    spinButton: null,
    betIncrease: null,
    betDecrease: null,
    languageButtons: null,
    soundToggle: null,
    infoToggle: null,
    
    // Displays
    creditsValue: null,
    betValue: null,
    messageDisplay: null,
    messages: null,
    winAmount: null,
    infoContent: null,
    
    // Elementos com texto traduzível
    textElements: null
};

// =============================================
// SISTEMA DE SOM
// =============================================
const audioManager = {
    sounds: {
        spin: null,
        win: null,
        lose: null,
        jackpot: null,
        click: null,
        ambience: null
    },
    
    init() {
        // Criar sons usando Web Audio API ou elementos Audio
        try {
            // Som de giro
            this.sounds.spin = this.createSound([800, 1200], 0.5);
            
            // Som de vitória
            this.sounds.win = this.createSound([1000, 1500, 2000], 0.3);
            
            // Som de derrota
            this.sounds.lose = this.createSound([400, 300], 0.2);
            
            // Som de jackpot
            this.sounds.jackpot = this.createSound([1000, 1200, 1500, 1800, 2000], 0.5);
            
            // Som de clique
            this.sounds.click = this.createSound([600], 0.1);
        } catch (e) {
            console.log('Áudio não suportado:', e);
        }
    },
    
    createSound(frequencies, duration) {
        // Simulação de criação de som (simplificado)
        return {
            play: () => {
                if (!gameState.soundEnabled) return;
                
                // Usar Web Audio API para gerar tons
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    frequencies.forEach((freq, index) => {
                        setTimeout(() => {
                            oscillator.frequency.value = freq;
                        }, index * 100);
                    });
                    
                    gainNode.gain.value = 0.1;
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + duration);
                } catch (e) {
                    // Fallback silencioso
                }
            }
        };
    },
    
    play(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName].play();
        }
    }
};

// =============================================
// FUNÇÕES PRINCIPAIS
// =============================================

/**
 * Inicializa o jogo
 */
function initGame() {
    // Cachear elementos DOM
    cacheElements();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Inicializar sistema de som
    audioManager.init();
    
    // Definir idioma inicial
    changeLanguage('pt');
    
    // Atualizar displays
    updateCreditsDisplay();
    updateBetDisplay();
    
    // Mostrar mensagem de boas-vindas
    showMessage('welcome');
    
    // Adicionar classe de inicialização
    document.body.classList.add('game-initialized');
    
    // Animação de entrada
    playIntroAnimation();
}

/**
 * Cacheia referências aos elementos DOM
 */
function cacheElements() {
    // Rolos
    elements.reels = document.querySelectorAll('.reel');
    elements.reelStrips = document.querySelectorAll('.reel-strip');
    
    // Controles
    elements.spinButton = document.getElementById('spinButton');
    elements.betIncrease = document.getElementById('betIncrease');
    elements.betDecrease = document.getElementById('betDecrease');
    elements.languageButtons = document.querySelectorAll('.lang-btn');
    elements.soundToggle = document.getElementById('soundToggle');
    elements.infoToggle = document.getElementById('infoToggle');
    
    // Displays
    elements.creditsValue = document.getElementById('creditsValue');
    elements.betValue = document.getElementById('betValue');
    elements.messageDisplay = document.getElementById('messageDisplay');
    elements.messages = document.querySelectorAll('.message');
    elements.winAmount = document.getElementById('winAmount');
    elements.infoContent = document.getElementById('infoContent');
    
    // Elementos com texto
    elements.textElements = document.querySelectorAll('[data-pt][data-en]');
}

/**
 * Configura todos os event listeners
 */
function setupEventListeners() {
    // Botão Girar
    elements.spinButton.addEventListener('click', handleSpin);
    
    // Controles de aposta
    elements.betIncrease.addEventListener('click', () => changeBet(1));
    elements.betDecrease.addEventListener('click', () => changeBet(-1));
    
    // MELHORIAS NO SELETOR DE IDIOMA - MAIS SENSÍVEL E RESPONSIVO
    elements.languageButtons.forEach(btn => {
        // Aumentar área clicável
        btn.style.cursor = 'pointer';
        btn.style.position = 'relative';
        
        // Criar área clicável maior invisível
        const clickArea = document.createElement('div');
        clickArea.style.position = 'absolute';
        clickArea.style.inset = '-10px'; // Expande 10px em todas as direções
        clickArea.style.zIndex = '1';
        btn.appendChild(clickArea);
        
        // Múltiplos eventos para máxima responsividade
        const handleLanguageChange = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const lang = btn.dataset.lang;
            const newLang = lang === 'pt-BR' ? 'pt' : 'en';
            
            // Feedback visual imediato
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 100);
            
            changeLanguage(newLang);
            audioManager.play('click');
        };
        
        // Adicionar múltiplos listeners para garantir responsividade
        btn.addEventListener('click', handleLanguageChange);
        btn.addEventListener('touchstart', handleLanguageChange, { passive: false });
        
        // Melhorar feedback visual no hover
        btn.addEventListener('mouseenter', () => {
            if (!btn.classList.contains('active')) {
                btn.style.transform = 'scale(1.1)';
                btn.style.boxShadow = '0 0 20px rgba(162, 210, 255, 0.8)';
            }
        });
        
        btn.addEventListener('mouseleave', () => {
            if (!btn.classList.contains('active')) {
                btn.style.transform = '';
                btn.style.boxShadow = '';
            }
        });
        
        // Prevenir problemas de toque em mobile
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
        });
    });
    
    // Toggle de som
    elements.soundToggle?.addEventListener('click', toggleSound);
    
    // Toggle de informações
    elements.infoToggle?.addEventListener('click', toggleInfo);
    
    // Prevenir zoom em mobile
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    });
}

/**
 * Manipula o clique no botão girar
 */
function handleSpin() {
    if (gameState.isSpinning) return;
    
    // Verificar créditos
    if (gameState.credits < gameState.currentBet) {
        showMessage('noCredits');
        shakeElement(elements.creditsValue.parentElement);
        return;
    }
    
    // Vibração tátil (se disponível)
    if ('vibrate' in navigator) {
        navigator.vibrate(50);
    }
    
    // Iniciar giro
    spinReels();
}

/**
 * Executa a animação de giro dos rolos
 */
async function spinReels() {
    gameState.isSpinning = true;
    
    // Desabilitar botão
    elements.spinButton.disabled = true;
    elements.spinButton.classList.add('loading');
    
    // Deduzir aposta
    updateCredits(-gameState.currentBet);
    
    // Tocar som de giro
    audioManager.play('spin');
    
    // Mostrar mensagem de girando
    showMessage('spinning');
    
    // Limpar classes anteriores
    clearPreviousResults();
    
    // Animar cada rolo
    const spinPromises = Array.from(elements.reels).map((reel, index) => {
        return animateReel(reel, index);
    });
    
    // Aguardar todos os rolos pararem
    await Promise.all(spinPromises);
    
    // Calcular resultado
    calculateResult();
    
    // Reabilitar botão
    gameState.isSpinning = false;
    elements.spinButton.disabled = false;
    elements.spinButton.classList.remove('loading');
}

/**
 * Anima um rolo individual
 */
async function animateReel(reel, index) {
    const strip = reel.querySelector('.reel-strip');
    const duration = CONFIG.animation.spinDuration.min + 
                    (Math.random() * (CONFIG.animation.spinDuration.max - CONFIG.animation.spinDuration.min)) +
                    (index * CONFIG.animation.symbolDelay);
    
    // Adicionar classe de spinning
    reel.classList.add('spinning');
    
    // Gerar resultado aleatório
    const result = Math.floor(Math.random() * CONFIG.symbols.length);
    gameState.reelResults[index] = result;
    
    // Animar com CSS
    return new Promise(resolve => {
        setTimeout(() => {
            // Parar animação
            reel.classList.remove('spinning');
            
            // Definir símbolo final
            setReelSymbol(strip, result);
            
            // Adicionar efeito de bounce
            reel.classList.add('bounce');
            setTimeout(() => reel.classList.remove('bounce'), 300);
            
            resolve();
        }, duration);
    });
}

/**
 * Define o símbolo visível em um rolo
 */
function setReelSymbol(strip, symbolIndex) {
    const symbolHeight = 150; // Altura de cada símbolo em pixels
    const offset = -symbolIndex * symbolHeight;
    strip.style.transform = `translateY(${offset}px)`;
}

/**
 * Calcula o resultado do giro
 */
function calculateResult() {
    const results = gameState.reelResults;
    const symbols = results.map(index => CONFIG.symbols[index]);
    
    // Verificar combinações
    let winAmount = 0;
    let winType = null;
    
    // Verificar 3 iguais
    if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
        if (symbols[0] === '🎪') {
            // Jackpot!
            winAmount = gameState.currentBet * CONFIG.payouts.jackpot;
            winType = 'jackpot';
        } else {
            // 3 iguais normal
            winAmount = gameState.currentBet * CONFIG.payouts.threeOfKind;
            winType = 'threeOfKind';
        }
        
        // Destacar todos os símbolos
        highlightWinningSymbols([0, 1, 2]);
    }
    // Verificar 2 iguais
    else if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {
        winAmount = gameState.currentBet * CONFIG.payouts.twoOfKind;
        winType = 'twoOfKind';
        
        // Destacar símbolos vencedores
        if (symbols[0] === symbols[1]) highlightWinningSymbols([0, 1]);
        else if (symbols[1] === symbols[2]) highlightWinningSymbols([1, 2]);
        else highlightWinningSymbols([0, 2]);
    }
    
    // Processar resultado
    if (winAmount > 0) {
        processWin(winAmount, winType);
    } else {
        processLoss();
    }
}

/**
 * Processa uma vitória
 */
function processWin(amount, winType) {
    // Atualizar créditos com animação
    updateCredits(amount, true);
    
    // Mostrar mensagem apropriada
    if (winType === 'jackpot') {
        showMessage('jackpot');
        audioManager.play('jackpot');
        createConfettiEffect();
        shakeScreen();
    } else {
        showMessage('win', amount);
        audioManager.play('win');
        if (winType === 'threeOfKind') {
            createConfettiEffect();
        }
    }
    
    // Vibração de vitória
    if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
    }
}

/**
 * Processa uma derrota
 */
function processLoss() {
    showMessage('lose');
    audioManager.play('lose');
    
    // Verificar se acabaram os créditos
    if (gameState.credits === 0) {
        setTimeout(() => {
            showMessage('noCredits');
            // Oferecer reinício após 3 segundos
            setTimeout(() => {
                if (confirm(gameState.currentLanguage === 'pt' ? 
                    'Deseja jogar novamente?' : 
                    'Do you want to play again?')) {
                    resetGame();
                }
            }, 3000);
        }, 1500);
    }
}

/**
 * Destaca símbolos vencedores
 */
function highlightWinningSymbols(indices) {
    indices.forEach(index => {
        const reel = elements.reels[index];
        const symbols = reel.querySelectorAll('.symbol');
        const visibleSymbol = symbols[gameState.reelResults[index]];
        
        if (visibleSymbol) {
            visibleSymbol.classList.add('winner');
        }
    });
}

/**
 * Atualiza o display de créditos
 */
function updateCredits(amount, animate = false) {
    const oldCredits = gameState.credits;
    gameState.credits += amount;
    
    if (animate && amount > 0) {
        // Animação de contagem
        animateCounter(elements.creditsValue, oldCredits, gameState.credits, CONFIG.animation.countUpDuration);
    } else {
        elements.creditsValue.textContent = gameState.credits;
    }
    
    // Efeito visual no display
    elements.creditsValue.parentElement.classList.add('pulse');
    setTimeout(() => {
        elements.creditsValue.parentElement.classList.remove('pulse');
    }, 300);
}

/**
 * Anima um contador numérico
 */
function animateCounter(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16); // 60 FPS
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        
        element.textContent = Math.floor(current);
    }, 16);
}

/**
 * Mostra uma mensagem
 */
function showMessage(type, amount = 0) {
    // Ocultar todas as mensagens
    elements.messages.forEach(msg => {
        msg.classList.remove('active');
        msg.style.display = 'none';
    });
    
    // Mostrar mensagem específica
    const message = document.querySelector(`.message[data-type="${type}"]`);
    if (message) {
        message.style.display = 'block';
        
        // Se for mensagem de vitória, atualizar valor
        if (type === 'win' && amount > 0) {
            elements.winAmount.textContent = amount;
        }
        
        // Adicionar com pequeno delay para triggerar animação
        requestAnimationFrame(() => {
            message.classList.add('active');
        });
    }
}

/**
 * Altera o idioma do jogo - VERSÃO MELHORADA
 */
function changeLanguage(lang) {
    gameState.currentLanguage = lang;
    
    // Atualizar atributo no HTML com feedback imediato
    document.documentElement.setAttribute('data-language', lang === 'pt' ? 'pt-BR' : 'en-GB');
    
    // Atualizar botões de idioma com transição suave
    elements.languageButtons.forEach(btn => {
        const shouldBeActive = btn.dataset.lang === (lang === 'pt' ? 'pt-BR' : 'en-GB');
        
        if (shouldBeActive) {
            btn.classList.add('active');
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 0 20px rgba(205, 180, 219, 0.5)';
        } else {
            btn.classList.remove('active');
            btn.style.transform = '';
            btn.style.boxShadow = '';
        }
    });
    
    // Atualizar todos os textos com verificação aprimorada
    document.querySelectorAll('[data-pt][data-en]').forEach(element => {
        const ptText = element.getAttribute('data-pt');
        const enText = element.getAttribute('data-en');
        
        // Aplicar texto com fade suave
        element.style.opacity = '0.7';
        
        setTimeout(() => {
            if (lang === 'pt' && ptText) {
                element.textContent = ptText;
            } else if (lang === 'en' && enText) {
                element.textContent = enText;
            }
            element.style.opacity = '1';
        }, 50);
    });
    
    // Feedback visual adicional
    document.body.classList.add('language-changing');
    setTimeout(() => {
        document.body.classList.remove('language-changing');
    }, 300);
}

/**
 * Altera o valor da aposta
 */
function changeBet(delta) {
    const newBet = gameState.currentBet + delta;
    
    // Validar limites
    if (newBet >= 1 && newBet <= Math.min(10, gameState.credits)) {
        gameState.currentBet = newBet;
        updateBetDisplay();
        audioManager.play('click');
    }
}

/**
 * Atualiza o display da aposta
 */
function updateBetDisplay() {
    elements.betValue.textContent = gameState.currentBet;
}

/**
 * Toggle do som
 */
function toggleSound() {
    gameState.soundEnabled = !gameState.soundEnabled;
    
    const soundOn = elements.soundToggle.querySelector('.sound-on');
    const soundOff = elements.soundToggle.querySelector('.sound-off');
    
    if (gameState.soundEnabled) {
        soundOn.style.display = 'block';
        soundOff.style.display = 'none';
    } else {
        soundOn.style.display = 'none';
        soundOff.style.display = 'block';
    }
    
    audioManager.play('click');
}

/**
 * Toggle das informações do jogo
 */
function toggleInfo() {
    const isVisible = elements.infoContent.style.display === 'block';
    elements.infoContent.style.display = isVisible ? 'none' : 'block';
    audioManager.play('click');
}

// =============================================
// EFEITOS ESPECIAIS
// =============================================

/**
 * Cria efeito de confete
 */
function createConfettiEffect() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    
    // Criar múltiplas partículas
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.backgroundColor = ['#ffafcc', '#cdb4db', '#a2d2ff', '#ffef9f'][Math.floor(Math.random() * 4)];
        container.appendChild(confetti);
    }
    
    // Remover após animação
    setTimeout(() => {
        container.remove();
    }, 3000);
}

/**
 * Efeito de shake na tela
 */
function shakeScreen() {
    document.body.classList.add('shake');
    setTimeout(() => {
        document.body.classList.remove('shake');
    }, 500);
}

/**
 * Shake em elemento específico
 */
function shakeElement(element) {
    element.classList.add('shake');
    setTimeout(() => {
        element.classList.remove('shake');
    }, 500);
}

/**
 * Animação de entrada do jogo
 */
function playIntroAnimation() {
    // Adicionar balões flutuantes
    const balloons = ['🎈', '🎈', '🎈'];
    balloons.forEach((balloon, index) => {
        setTimeout(() => {
            const el = document.createElement('div');
            el.className = 'intro-balloon';
            el.textContent = balloon;
            el.style.left = (20 + index * 30) + '%';
            document.body.appendChild(el);
            
            setTimeout(() => el.remove(), 3000);
        }, index * 200);
    });
}

/**
 * Limpa resultados anteriores
 */
function clearPreviousResults() {
    document.querySelectorAll('.symbol.winner').forEach(symbol => {
        symbol.classList.remove('winner');
    });
}

/**
 * Reinicia o jogo
 */
function resetGame() {
    gameState.credits = CONFIG.initialCredits;
    gameState.currentBet = 1;
    gameState.isSpinning = false;
    
    updateCreditsDisplay();
    updateBetDisplay();
    showMessage('welcome');
    clearPreviousResults();
}

/**
 * Atualiza display de créditos
 */
function updateCreditsDisplay() {
    elements.creditsValue.textContent = gameState.credits;
}

// =============================================
// ESTILOS CSS DINÂMICOS
// =============================================
const dynamicStyles = `
    /* Melhorias para os botões de idioma */
    .lang-btn {
        transition: all 0.15s ease !important;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
    }
    
    .lang-btn:active {
        transform: scale(0.9) !important;
    }
    
    .language-changing {
        transition: opacity 0.3s ease;
    }
    
    /* Animações existentes */
    .shake {
        animation: shake 0.5s ease-in-out;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
    
    .pulse {
        animation: pulse 0.3s ease-in-out;
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
    
    .bounce {
        animation: bounce 0.3s ease-out;
    }
    
    @keyframes bounce {
        0% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0); }
    }
    
    .intro-balloon {
        position: fixed;
        bottom: -50px;
        font-size: 3rem;
        animation: floatUp 3s ease-out forwards;
        z-index: 1000;
    }
    
    @keyframes floatUp {
        to {
            bottom: 110vh;
            transform: translateX(20px) rotate(15deg);
        }
    }
`;

// Adicionar estilos dinâmicos
const styleSheet = document.createElement('style');
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);

// =============================================
// INICIALIZAÇÃO
// =============================================

// Aguardar DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

// =============================================
// UTILIDADES DE DEBUG (remover em produção)
// =============================================
window.slotDebug = {
    setCredits: (amount) => {
        gameState.credits = amount;
        updateCreditsDisplay();
    },
    
    forceWin: () => {
        gameState.reelResults = [0, 0, 0];
        clearPreviousResults();
        calculateResult();
    },
    
    forceLoss: () => {
        gameState.reelResults = [0, 1, 2];
        clearPreviousResults();
        calculateResult();
    }
};
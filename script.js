/**
 * APENAS DIVERSÃO / JUST FUN - Slot Machine JavaScript
 * Tema: Parque de Diversões Virtual Mágico (Cores Pastéis Vibrantes)
 * Autor: Thiago Freitas
 * Versão: 1.0.0 - Completa, com áudio, partículas, acessibilidade e multilíngue
 *
 * Observações:
 * - Este script foi feito para o HTML e o CSS fornecidos anteriormente.
 * - Foco em: visual lindo, robustez, acessibilidade e compatibilidade mobile/desktop.
 * - Não altera estrutura do DOM, apenas atualiza textos, classes e estilos inline necessários.
 */

/* ================================
   CONFIGURAÇÕES DO JOGO
   ================================ */
const CONFIG = {
  symbols: ['🎡', '🎢', '🎠', '🍭', '🍿'],
  jackpotSymbol: '🎡',
  payouts: {
    threeOfKind: 10,
    twoOfKind: 5,
    jackpot: 50
  },
  animation: {
    reelHeight: 180, // altura do símbolo (será auto detectado no init)
    spinDurationRange: [1400, 2400], // ms
    reelStagger: 220, // ms entre rolos
    countUpDuration: 900, // ms créditos
    messageTransition: 280 // ms
  },
  initialCredits: 100,
  minBet: 1,
  maxBet: 10,
  storageKey: 'apenas_diversao_state_v5',
  languages: {
    pt: 'pt-BR',
    en: 'en-GB'
  },
  sounds: {
    spin: { type: 'sawtooth', startFreq: 220, endFreq: 880, duration: 1.2 },
    stopTick: { type: 'sine', freq: 420, duration: 0.07 },
    win: { melody: [523, 659, 784, 1047], duration: 0.15, spacing: 0.12 },
    lose: { melody: [400, 350, 300], duration: 0.16, spacing: 0.12 },
    jackpot: { melody: [523, 587, 659, 698, 784, 880, 988, 1047], duration: 0.18, spacing: 0.1 },
    click: { type: 'square', freq: 900, duration: 0.05 },
    coin: { melody: [1000, 1200], duration: 0.07, spacing: 0.05 }
  }
};

/* ================================
   ESTADO DO JOGO
   ================================ */
const state = {
  credits: CONFIG.initialCredits,
  bet: 1,
  spinning: false,
  lang: 'pt', // 'pt' | 'en'
  sound: true,
  animations: true,
  particles: true,
  vibration: true,
  reelResults: [0, 0, 0],
  symbolHeight: CONFIG.animation.reelHeight,
  totalSpins: 0,
  totalWins: 0,
  biggestWin: 0,
  initialized: false
};

/* ================================
   ELEMENTOS (CACHE)
   ================================ */
const el = {
  // Estrutura principal
  mainTitle: null,
  titleEnglish: null,
  titleLinesPT: null,
  subtitleText: null,

  // Reels
  reels: [],
  reelStrips: [],

  // Controles
  spinButton: null,
  spinText: null,
  betIncrease: null,
  betDecrease: null,

  // Displays
  creditsLabel: null,
  creditsValue: null,
  betLabel: null,
  betValue: null,

  // Mensagens
  messageDisplay: null,
  messages: {}, // welcome, spinning, win, lose, jackpot, noCredits
  winAmount: null,

  // Idiomas
  langBtnPT: null,
  langBtnEN: null,

  // Info
  infoToggle: null,
  infoContent: null,

  // Som/Configurações
  soundToggle: null,
  settingsToggle: null,
  settingsPanel: null,
  settingsClose: null,
  animationsToggle: null,
  particlesToggle: null,
  vibrationToggle: null,

  // Efeitos
  confettiContainer: null,
  fireworksContainer: null,
  bubblesContainer: null,
  specialEffectsContainer: null,

  // Acessibilidade/Notificações
  notifications: null
};

/* ================================
   ÁUDIO (Web Audio API)
   ================================ */
class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.master.gain.value = 0.25;
      this._initialized = true;
    } catch (e) {
      console.warn('Áudio não disponível:', e);
    }
  }

  resume() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  playTone({ type = 'sine', freq = 440, duration = 0.1, startTime = 0, volume = 0.15 }) {
    if (!this._initialized || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;

    const t0 = this.ctx.currentTime + startTime;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration);
  }

  playMelody(frequencies = [], noteDuration = 0.1, spacing = 0.1, volume = 0.15) {
    if (!this._initialized || !this.enabled) return;
    frequencies.forEach((f, i) => {
      this.playTone({ type: 'sine', freq: f, duration: noteDuration, startTime: i * spacing, volume });
    });
  }

  spin() {
    if (!this._initialized || !this.enabled) return;
    const { startFreq, endFreq, duration } = CONFIG.sounds.spin;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t0 = this.ctx.currentTime;
    osc.type = CONFIG.sounds.spin.type;
    osc.frequency.setValueAtTime(startFreq, t0);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
    gain.gain.setValueAtTime(0.1, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration);
  }

  stopTick(index = 0) {
    this.playTone({ type: CONFIG.sounds.stopTick.type, freq: CONFIG.sounds.stopTick.freq + index * 80, duration: CONFIG.sounds.stopTick.duration });
  }

  win() {
    const { melody, duration, spacing } = CONFIG.sounds.win;
    this.playMelody(melody, duration, spacing, 0.18);
  }

  lose() {
    const { melody, duration, spacing } = CONFIG.sounds.lose;
    this.playMelody(melody, duration, spacing, 0.12);
  }

  jackpot() {
    const { melody, duration, spacing } = CONFIG.sounds.jackpot;
    this.playMelody(melody, duration, spacing, 0.22);
  }

  click() {
    this.playTone(CONFIG.sounds.click);
  }

  coin() {
    const { melody, duration, spacing } = CONFIG.sounds.coin;
    this.playMelody(melody, duration, spacing, 0.18);
  }
}
const audio = new AudioManager();

/* ================================
   UTILITÁRIOS
   ================================ */
const Util = {
  clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  },

  rafDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  animateNumber(elm, start, end, duration = 800) {
    if (!elm) return Promise.resolve();
    return new Promise(resolve => {
      const startTime = performance.now();
      const delta = end - start;
      const step = now => {
        const p = Util.clamp((now - startTime) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - p, 4); // easeOutQuart
        const value = Math.round(start + delta * eased);
        elm.textContent = value;
        if (p < 1) requestAnimationFrame(step);
        else {
          elm.textContent = end;
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  },

  vibrate(pattern) {
    try {
      if (state.vibration && 'vibrate' in navigator) navigator.vibrate(pattern);
    } catch (_) {}
  },

  readSymbolHeight() {
    const sample = document.querySelector('.reel .symbol');
    if (sample) {
      const h = sample.getBoundingClientRect().height;
      if (h && h > 0) state.symbolHeight = h;
    }
  },

  saveState() {
    try {
      const data = {
        credits: state.credits,
        bet: state.bet,
        lang: state.lang,
        sound: state.sound,
        animations: state.animations,
        particles: state.particles,
        vibration: state.vibration,
        biggestWin: state.biggestWin,
        totalSpins: state.totalSpins,
        totalWins: state.totalWins
      };
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
    } catch (_) {}
  },

  loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.credits === 'number') state.credits = data.credits;
      if (typeof data.bet === 'number') state.bet = Util.clamp(data.bet, CONFIG.minBet, CONFIG.maxBet);
      if (data.lang === 'pt' || data.lang === 'en') state.lang = data.lang;
      if (typeof data.sound === 'boolean') state.sound = data.sound;
      if (typeof data.animations === 'boolean') state.animations = data.animations;
      if (typeof data.particles === 'boolean') state.particles = data.particles;
      if (typeof data.vibration === 'boolean') state.vibration = data.vibration;
      if (typeof data.biggestWin === 'number') state.biggestWin = data.biggestWin;
      if (typeof data.totalSpins === 'number') state.totalSpins = data.totalSpins;
      if (typeof data.totalWins === 'number') state.totalWins = data.totalWins;
    } catch (_) {}
  },

  announce(text) {
    if (!el.notifications) return;
    const div = document.createElement('div');
    div.className = 'notification-toast';
    div.textContent = text;
    el.notifications.appendChild(div);
    setTimeout(() => div.remove(), 2000);
  },

  show(elm) {
    if (!elm) return;
    elm.hidden = false;
    elm.style.display = '';
  },

  hide(elm) {
    if (!elm) return;
    elm.hidden = true;
    elm.style.display = 'none';
  }
};

/* ================================
   EFEITOS ESPECIAIS (PARTÍCULAS)
   ================================ */
const Effects = {
  confetti(count = 80, duration = 1800) {
    if (!state.particles) return;
    const container = el.confettiContainer || document.body;
    const frag = document.createDocumentFragment();
    const colors = ['#FFB6E1', '#B6E5FF', '#E6B6FF', '#FFFAB6', '#B6FFD4', '#FFD4CC'];
    for (let i = 0; i < count; i++) {
      const c = document.createElement('div');
      const size = Math.random() * 10 + 6;
      const color = colors[Math.floor(Math.random() * colors.length)];
      c.style.position = 'fixed';
      c.style.top = '-20px';
      c.style.left = Math.random() * 100 + '%';
      c.style.width = size + 'px';
      c.style.height = size + 'px';
      c.style.background = color;
      c.style.borderRadius = Math.random() < 0.5 ? '50%' : '6px';
      c.style.zIndex = 9999;
      c.style.pointerEvents = 'none';
      c.style.transform = `translateY(0) rotate(${Math.random() * 360}deg)`;
      c.style.opacity = '0.9';
      c.animate(
        [
          { transform: `translateY(0) rotate(0deg)`, opacity: 1 },
          { transform: `translateY(${window.innerHeight + 60}px) rotate(${360 + Math.random() * 720}deg)`, opacity: 0 }
        ],
        { duration: duration + Math.random() * 800, easing: 'ease-out', fill: 'forwards' }
      );
      frag.appendChild(c);
      setTimeout(() => c.remove(), duration + 1200);
    }
    container.appendChild(frag);
  },

  coinShower(amount = 10) {
    if (!state.particles) return;
    const count = Math.min(25, Math.max(10, Math.round(amount / 5)));
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const coin = document.createElement('div');
      coin.textContent = '🪙';
      coin.style.position = 'fixed';
      coin.style.top = '-40px';
      coin.style.left = Math.random() * 100 + '%';
      coin.style.fontSize = Math.random() * 18 + 22 + 'px';
      coin.style.zIndex = 9998;
      coin.animate(
        [
          { transform: 'translateY(0) rotateY(0deg)', opacity: 1 },
          { transform: `translateY(${window.innerHeight + 80}px) rotateY(720deg)`, opacity: 0 }
        ],
        { duration: 1200 + Math.random() * 900, easing: 'ease-in', fill: 'forwards' }
      );
      frag.appendChild(coin);
      setTimeout(() => coin.remove(), 2400);
    }
    (el.specialEffectsContainer || document.body).appendChild(frag);
  },

  fireworks() {
    if (!state.particles) return;
    // simples fogos: círculos expandindo
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 3;
    for (let i = 0; i < 3; i++) {
      const burst = document.createElement('div');
      burst.style.position = 'fixed';
      burst.style.left = centerX + (Math.random() * 160 - 80) + 'px';
      burst.style.top = centerY + (Math.random() * 60 - 30) + 'px';
      burst.style.width = '10px';
      burst.style.height = '10px';
      burst.style.border = '3px solid rgba(255,255,255,0.9)';
      burst.style.borderRadius = '50%';
      burst.style.zIndex = 9999;
      burst.animate(
        [{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(8)', opacity: 0 }],
        { duration: 900, easing: 'ease-out', fill: 'forwards', delay: i * 120 }
      );
      (el.fireworksContainer || document.body).appendChild(burst);
      setTimeout(() => burst.remove(), 1500);
    }
  }
};

/* ================================
   INTERNACIONALIZAÇÃO (I18N)
   ================================ */
function applyLanguage(lang) {
  state.lang = lang;

  // Atualiza atributo lang e data-language para o CSS/semântica
  document.documentElement.lang = CONFIG.languages[lang];
  document.documentElement.setAttribute('data-language', CONFIG.languages[lang]);

  // Atualiza botões ativos
  el.langBtnPT?.classList.toggle('active', lang === 'pt');
  el.langBtnEN?.classList.toggle('active', lang === 'en');
  el.langBtnPT?.setAttribute('aria-pressed', String(lang === 'pt'));
  el.langBtnEN?.setAttribute('aria-pressed', String(lang === 'en'));

  // Atualiza todos os textos com data-pt/data-en (preserva estruturas internas complexas)
  document.querySelectorAll('[data-pt][data-en]').forEach(node => {
    // Evitar sobrescrever títulos com letras animadas
    const isFancyTitle = node.closest('.super-magical-title') || node.classList.contains('super-magical-title') || node.id === 'mainTitle';
    if (isFancyTitle) return;

    const pt = node.getAttribute('data-pt');
    const en = node.getAttribute('data-en');
    const text = lang === 'pt' ? pt : en;
    if (text && node.firstElementChild == null) {
      node.textContent = text;
    } else if (text && node.firstElementChild && node.childNodes.length === 1 && node.firstChild.nodeType === Node.TEXT_NODE) {
      node.firstChild.nodeValue = text;
    }
  });

  // Atualiza (apenas texto) do botão Girar
  if (el.spinText) {
    const pt = el.spinText.getAttribute('data-pt') || 'GIRAR';
    const en = el.spinText.getAttribute('data-en') || 'SPIN';
    el.spinText.textContent = lang === 'pt' ? pt : en;
  }

  // Título principal: alterna versão PT (linhas diretas) e EN (.title-english)
  if (el.mainTitle) {
    const ptLines = el.mainTitle.querySelectorAll(':scope > .title-line');
    ptLines.forEach(n => (n.style.display = lang === 'pt' ? '' : 'none'));
    if (el.titleEnglish) el.titleEnglish.style.display = lang === 'en' ? '' : 'none';
  }

  // Mensagem de boas-vindas
  showMessage('welcome');

  Util.saveState();
}

/* ================================
   MENSAGENS DO JOGO
   ================================ */
function cacheMessages() {
  const map = {};
  document.querySelectorAll('#messageDisplay .message').forEach(p => {
    const type = p.getAttribute('data-type');
    if (type) map[type] = p;
  });
  el.messages = map;
  el.winAmount = document.getElementById('winAmount');
}

function showMessage(type, amount = 0) {
  if (!el.messages || !el.messageDisplay) return;

  Object.values(el.messages).forEach(msg => {
    msg.classList.remove('active');
    msg.style.display = 'none';
  });

  const node = el.messages[type];
  if (node) {
    node.style.display = 'block';
    requestAnimationFrame(() => node.classList.add('active'));
    if (type === 'win' && el.winAmount) el.winAmount.textContent = String(amount);
  }

  // Anúncio acessível
  const announceText = node?.innerText?.trim() || '';
  if (announceText) Util.announce(announceText);
}

/* ================================
   REELS: ANIMAÇÃO E RESULTADOS
   ================================ */
function randomResult() {
  return Math.floor(Math.random() * CONFIG.symbols.length);
}

function symbolAt(index) {
  return CONFIG.symbols[index];
}

function setReelSymbol(strip, index) {
  strip.style.transform = `translateY(${-index * state.symbolHeight}px)`;
}

function clearWinners() {
  document.querySelectorAll('.symbol.winner').forEach(s => s.classList.remove('winner'));
}

function highlightWinners(indices) {
  indices.forEach((reelIdx, delayIdx) => {
    const reel = el.reels[reelIdx];
    if (!reel) return;
    const symbols = reel.querySelectorAll('.symbol');
    const targetIndex = state.reelResults[reelIdx];
    const node = symbols[targetIndex];
    if (node) {
      setTimeout(() => {
        node.classList.add('winner');
      }, delayIdx * 100);
    }
  });
}

async function animateReelStop(reelIndex, resultIndex, spinTime) {
  const reel = el.reels[reelIndex];
  const strip = el.reelStrips[reelIndex];
  if (!reel || !strip) return;

  reel.classList.add('spinning');

  // fake spin time
  await Util.rafDelay(spinTime);

  // stop
  reel.classList.remove('spinning');
  setReelSymbol(strip, resultIndex);

  // stop tick
  audio.stopTick(reelIndex);
}

function calculateWin(symbols) {
  let winType = null;
  let winAmount = 0;
  let winners = [];

  const [a, b, c] = symbols;

  // 3 iguais
  if (a === b && b === c) {
    if (a === CONFIG.jackpotSymbol) {
      winType = 'jackpot';
      winAmount = state.bet * CONFIG.payouts.jackpot;
    } else {
      winType = 'threeOfKind';
      winAmount = state.bet * CONFIG.payouts.threeOfKind;
    }
    winners = [0, 1, 2];
    return { winType, winAmount, winners };
  }

  // 2 iguais
  if (a === b) winners = [0, 1];
  else if (b === c) winners = [1, 2];
  else if (a === c) winners = [0, 2];

  if (winners.length) {
    winType = 'twoOfKind';
    winAmount = state.bet * CONFIG.payouts.twoOfKind;
  }

  return { winType, winAmount, winners };
}

async function spin() {
  if (state.spinning) return;
  if (state.credits < state.bet) {
    showMessage('no-credits');
    Util.vibrate([80]);
    audio.lose();
    return;
  }

  state.spinning = true;
  state.totalSpins += 1;
  el.spinButton.classList.add('loading');
  el.spinButton.disabled = true;

  // Deduz aposta
  const oldCredits = state.credits;
  state.credits -= state.bet;
  updateCredits(oldCredits, state.credits, false);

  // Áudio
  audio.resume();
  audio.spin();

  // Mensagem
  showMessage('spinning');

  // Preparação
  clearWinners();

  // Resultados
  const results = [randomResult(), randomResult(), randomResult()];
  state.reelResults = results.slice();
  const durations = [
    randBetween(...CONFIG.animation.spinDurationRange),
    randBetween(...CONFIG.animation.spinDurationRange) + CONFIG.animation.reelStagger,
    randBetween(...CONFIG.animation.spinDurationRange) + CONFIG.animation.reelStagger * 2
  ];

  // Anima rolos
  await Promise.all(
    results.map((r, i) => animateReelStop(i, r, durations[i]))
  );

  // Pausa dramática
  await Util.rafDelay(200);

  // Calcula resultado
  const shown = results.map(symbolAt);
  const { winType, winAmount, winners } = calculateWin(shown);

  if (winAmount > 0) {
    // Vitória
    state.totalWins += 1;
    state.biggestWin = Math.max(state.biggestWin, winAmount);
    highlightWinners(winners);

    const before = state.credits;
    state.credits += winAmount;

    if (winType === 'jackpot') {
      showMessage('jackpot');
      audio.jackpot();
      Effects.confetti(160, 2400);
      Effects.fireworks();
      Util.vibrate([100, 60, 100, 60, 200]);
    } else {
      showMessage('win', winAmount);
      audio.win();
      Effects.confetti(80, 1800);
      Util.vibrate([80, 40, 80]);
    }

    await updateCredits(before, state.credits, true);
  } else {
    // Derrota
    showMessage('lose');
    audio.lose();
    Util.vibrate([60]);
  }

  // Sem créditos
  if (state.credits <= 0) {
    await Util.rafDelay(700);
    showMessage('no-credits');
  }

  state.spinning = false;
  el.spinButton.classList.remove('loading');
  el.spinButton.disabled = false;

  Util.saveState();
}

function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ================================
   UI: ATUALIZAÇÕES
   ================================ */
async function updateCredits(from, to, animate = true) {
  if (!el.creditsValue) return;
  if (animate && state.animations) {
    await Util.animateNumber(el.creditsValue, from, to, CONFIG.animation.countUpDuration);
    if (to > from) {
      audio.coin();
      Effects.coinShower(Math.min(50, to - from));
    }
  } else {
    el.creditsValue.textContent = to;
  }
}

function updateBetDisplay() {
  if (el.betValue) el.betValue.textContent = String(state.bet);
}

function changeBet(delta) {
  const newBet = Util.clamp(state.bet + delta, CONFIG.minBet, Math.min(CONFIG.maxBet, state.credits || CONFIG.maxBet));
  if (newBet === state.bet) return;
  state.bet = newBet;
  updateBetDisplay();
  audio.click();
  Util.saveState();
}

/* ================================
   INFOS, SOM, CONFIGURAÇÕES
   ================================ */
function toggleInfo() {
  if (!el.infoContent || !el.infoToggle) return;
  const isHidden = el.infoContent.hasAttribute('hidden') || el.infoContent.style.display === 'none';
  if (isHidden) {
    el.infoContent.removeAttribute('hidden');
    el.infoContent.style.display = '';
    el.infoToggle.setAttribute('aria-expanded', 'true');
    el.infoContent.style.opacity = '0';
    el.infoContent.style.transform = 'translateY(-8px)';
    requestAnimationFrame(() => {
      el.infoContent.style.transition = 'all 280ms cubic-bezier(0.68,-0.55,0.265,1.55)';
      el.infoContent.style.opacity = '1';
      el.infoContent.style.transform = 'translateY(0)';
    });
  } else {
    el.infoToggle.setAttribute('aria-expanded', 'false');
    el.infoContent.style.opacity = '0';
    el.infoContent.style.transform = 'translateY(-8px)';
    setTimeout(() => {
      el.infoContent.style.display = 'none';
      el.infoContent.setAttribute('hidden', '');
    }, 280);
  }
}

function toggleSound() {
  state.sound = !state.sound;
  audio.enabled = state.sound;
  const on = el.soundToggle?.querySelector('.sound-on');
  const off = el.soundToggle?.querySelector('.sound-off');
  if (on && off) {
    on.style.display = state.sound ? '' : 'none';
    off.style.display = state.sound ? 'none' : '';
  }
  el.soundToggle?.setAttribute('aria-pressed', String(state.sound));
  audio.click();
  Util.saveState();
}

function toggleSettings(open) {
  if (!el.settingsPanel || !el.settingsToggle) return;
  const isOpen = open !== undefined ? open : el.settingsPanel.hidden;
  if (isOpen) {
    el.settingsPanel.hidden = false;
    el.settingsToggle.setAttribute('aria-expanded', 'true');
    el.settingsPanel.style.opacity = '0';
    el.settingsPanel.style.transform = 'translateY(10px)';
    requestAnimationFrame(() => {
      el.settingsPanel.style.transition = 'all 240ms ease';
      el.settingsPanel.style.opacity = '1';
      el.settingsPanel.style.transform = 'translateY(0)';
    });
  } else {
    el.settingsToggle.setAttribute('aria-expanded', 'false');
    el.settingsPanel.style.opacity = '0';
    el.settingsPanel.style.transform = 'translateY(6px)';
    setTimeout(() => (el.settingsPanel.hidden = true), 240);
  }
}

function applySettingsFromUI() {
  if (el.animationsToggle) state.animations = !!el.animationsToggle.checked;
  if (el.particlesToggle) state.particles = !!el.particlesToggle.checked;
  if (el.vibrationToggle) state.vibration = !!el.vibrationToggle.checked;

  document.body.setAttribute('data-animations', state.animations ? 'enabled' : 'disabled');
  document.body.setAttribute('data-sound', state.sound ? 'enabled' : 'disabled');

  Util.saveState();
}

/* ================================
   LINGUAGEM: EVENTOS
   ================================ */
function setupLanguageHandlers() {
  el.langBtnPT?.addEventListener('click', () => {
    audio.click();
    applyLanguage('pt');
  });
  el.langBtnEN?.addEventListener('click', () => {
    audio.click();
    applyLanguage('en');
  });
}

/* ================================
   CONTROLES: EVENTOS
   ================================ */
function setupEventListeners() {
  // Botão Girar
  el.spinButton?.addEventListener('click', () => {
    audio.init();
    spin();
  });

  // Aposta
  el.betIncrease?.addEventListener('click', () => changeBet(1));
  el.betDecrease?.addEventListener('click', () => changeBet(-1));

  // Info
  el.infoToggle?.addEventListener('click', () => {
    audio.click();
    toggleInfo();
  });

  // Som
  el.soundToggle?.addEventListener('click', toggleSound);

  // Configurações
  el.settingsToggle?.addEventListener('click', () => {
    audio.click();
    toggleSettings();
  });
  el.settingsClose?.addEventListener('click', () => {
    audio.click();
    toggleSettings(false);
  });

  // Toggles no painel de configurações
  el.animationsToggle?.addEventListener('change', applySettingsFromUI);
  el.particlesToggle?.addEventListener('change', applySettingsFromUI);
  el.vibrationToggle?.addEventListener('change', applySettingsFromUI);

  // Teclado
  document.addEventListener('keydown', e => {
    if (e.repeat) return;
    switch (e.key) {
      case ' ':
      case 'Enter':
        e.preventDefault();
        spin();
        break;
      case 'ArrowUp':
        changeBet(1);
        break;
      case 'ArrowDown':
        changeBet(-1);
        break;
      case 'l':
      case 'L':
        applyLanguage(state.lang === 'pt' ? 'en' : 'pt');
        break;
      case 'i':
      case 'I':
        toggleInfo();
        break;
      case 's':
      case 'S':
        toggleSound();
        break;
      case 'Escape':
        toggleSettings(false);
        break;
    }
  });

  // Evitar zoom com pinch em mobile
  document.addEventListener(
    'touchstart',
    e => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false }
  );

  // Ativar áudio no primeiro toque
  ['click', 'touchstart'].forEach(evt =>
    document.addEventListener(
      evt,
      () => {
        audio.init();
        audio.resume();
      },
      { once: true, passive: true }
    )
  );
}

/* ================================
   CACHE DE ELEMENTOS
   ================================ */
function cacheElements() {
  el.mainTitle = document.getElementById('mainTitle');
  el.titleEnglish = el.mainTitle?.querySelector('.title-english');
  el.titleLinesPT = el.mainTitle ? el.mainTitle.querySelectorAll(':scope > .title-line') : [];
  el.subtitleText = document.getElementById('subtitleText');

  // Reels
  el.reels = [document.getElementById('reel1'), document.getElementById('reel2'), document.getElementById('reel3')].filter(Boolean);
  el.reelStrips = [document.getElementById('reelStrip1'), document.getElementById('reelStrip2'), document.getElementById('reelStrip3')].filter(Boolean);

  // Controles
  el.spinButton = document.getElementById('spinButton');
  el.spinText = document.getElementById('spinText');
  el.betIncrease = document.getElementById('betIncrease');
  el.betDecrease = document.getElementById('betDecrease');

  // Displays
  el.creditsLabel = document.getElementById('creditsLabel');
  el.creditsValue = document.getElementById('creditsValue');
  el.betLabel = document.getElementById('betLabel');
  el.betValue = document.getElementById('betValue');

  // Mensagens
  el.messageDisplay = document.getElementById('messageDisplay');
  cacheMessages();

  // Idiomas
  el.langBtnPT = document.getElementById('langBtnPt');
  el.langBtnEN = document.getElementById('langBtnEn');

  // Info
  el.infoToggle = document.getElementById('infoToggle');
  el.infoContent = document.getElementById('infoContent');

  // Som/Config
  el.soundToggle = document.getElementById('soundToggle');
  el.settingsToggle = document.getElementById('settingsToggle');
  el.settingsPanel = document.getElementById('settingsPanel');
  el.settingsClose = document.getElementById('settingsClose');
  el.animationsToggle = document.getElementById('animationsToggle');
  el.particlesToggle = document.getElementById('particlesToggle');
  el.vibrationToggle = document.getElementById('vibrationToggle');

  // Efeitos
  el.specialEffectsContainer = document.getElementById('specialEffectsContainer');
  el.confettiContainer = document.getElementById('confettiContainer');
  el.fireworksContainer = document.getElementById('fireworksContainer');
  el.bubblesContainer = document.getElementById('bubblesContainer');

  // Notificações
  el.notifications = document.getElementById('notificationsContainer');
}

/* ================================
   INICIALIZAÇÃO
   ================================ */
function applyInitialUI() {
  // Altura dos símbolos
  Util.readSymbolHeight();

  // Labels e valores
  el.creditsValue && (el.creditsValue.textContent = String(state.credits));
  updateBetDisplay();

  // Som
  const on = el.soundToggle?.querySelector('.sound-on');
  const off = el.soundToggle?.querySelector('.sound-off');
  if (on && off) {
    on.style.display = state.sound ? '' : 'none';
    off.style.display = state.sound ? 'none' : '';
  }

  // Settings toggles
  if (el.animationsToggle) el.animationsToggle.checked = state.animations;
  if (el.particlesToggle) el.particlesToggle.checked = state.particles;
  if (el.vibrationToggle) el.vibrationToggle.checked = state.vibration;

  document.body.setAttribute('data-animations', state.animations ? 'enabled' : 'disabled');
  document.body.setAttribute('data-sound', state.sound ? 'enabled' : 'disabled');

  // Idioma
  applyLanguage(state.lang);

  // Mensagem inicial
  showMessage('welcome');
}

function init() {
  if (state.initialized) return;
  Util.loadState();
  cacheElements();
  setupEventListeners();
  setupLanguageHandlers();
  applyInitialUI();
  state.initialized = true;
}

/* ================================
   API PÚBLICA (Debug / Extensões)
   ================================ */
window.JustFunGame = {
  getState: () => ({ ...state }),
  setLanguage: lang => applyLanguage(lang),
  addCredits: amount => {
    const before = state.credits;
    state.credits += amount;
    updateCredits(before, state.credits, true);
    Util.saveState();
  },
  setCredits: value => {
    const before = state.credits;
    state.credits = Math.max(0, value | 0);
    updateCredits(before, state.credits, false);
    Util.saveState();
  },
  spin: () => spin(),
  setBet: bet => {
    bet = Util.clamp(bet | 0, CONFIG.minBet, CONFIG.maxBet);
    state.bet = bet;
    updateBetDisplay();
    Util.saveState();
  },
  forceWin: () => {
    // 🧪 força 3 iguais comuns
    state.reelResults = [1, 1, 1];
    el.reelStrips.forEach((strip, i) => setReelSymbol(strip, state.reelResults[i]));
    const before = state.credits;
    const amount = state.bet * CONFIG.payouts.threeOfKind;
    state.credits += amount;
    updateCredits(before, state.credits, true);
    highlightWinners([0, 1, 2]);
    showMessage('win', amount);
  },
  forceJackpot: () => {
    // 🧪 força jackpot 🎡🎡🎡
    state.reelResults = [0, 0, 0]; // assumindo 🎡 está no index 0 (ver CONFIG.symbols)
    el.reelStrips.forEach((strip, i) => setReelSymbol(strip, state.reelResults[i]));
    const before = state.credits;
    const amount = state.bet * CONFIG.payouts.jackpot;
    state.credits += amount;
    updateCredits(before, state.credits, true);
    highlightWinners([0, 1, 2]);
    showMessage('jackpot');
    Effects.confetti(160, 2400);
    audio.jackpot();
  }
};

/* ================================
   STARTUP
   ================================ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
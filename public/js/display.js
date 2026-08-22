document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const displayScreen = document.getElementById('displayScreen');
  const alertText = document.getElementById('alertText');
  const wakelockStatus = document.getElementById('wakelockStatus');
  const wakelockDot = document.getElementById('wakelockDot');
  const startModal = document.getElementById('startModal');
  const btnStart = document.getElementById('btnStart');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const connectionDot = document.getElementById('connectionDot');
  const connectionStatus = document.getElementById('connectionStatus');

  let audioCtx = null;
  let soundEnabled = true;

  // Inicializar Screen Wake Lock
  const keepAlive = new ScreenKeepAlive({
    onStatusChange: (active, msg) => {
      if (wakelockDot) {
        if (active) {
          wakelockDot.classList.add('active');
        } else {
          wakelockDot.classList.remove('active');
        }
      }
      if (wakelockStatus) {
        wakelockStatus.textContent = active ? 'Pantalla Siempre Activa' : 'Sin Wake Lock';
      }
    }
  });

  // Sintetizador de sonido de aviso (Web Audio API)
  function playAlertBeep() {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      // Generar 3 beeps de alta atención
      const now = audioCtx.currentTime;
      [0, 0.18, 0.36].forEach((delay) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now + delay); // Nota La5 (880Hz)
        
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.4, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.15);
      });
    } catch (e) {
      console.warn('Audio no disponible:', e);
    }
  }

  // Activar pantalla completa
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('No se pudo entrar a pantalla completa:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  // Activar modo receptor al tocar el botón de inicio
  async function activateReceiver() {
    startModal.classList.add('hidden');

    // Activar Wake Lock
    await keepAlive.enable();

    // Iniciar contexto de audio con la interacción del usuario
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    } catch (e) {}

    // Intentar pantalla completa en móviles
    if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      toggleFullscreen();
    }
  }

  btnStart.addEventListener('click', activateReceiver);

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
    });
  }

  // Tap en la pantalla para pantalla completa si ya está iniciado
  displayScreen.addEventListener('click', () => {
    if (startModal.classList.contains('hidden')) {
      // Si la barra superior se oculta o deseamos alternar fullscreen
    }
  });

  // ==========================================
  // EVENTOS WEBSOCKET (SOCKET.IO)
  // ==========================================
  socket.on('connect', () => {
    socket.emit('register_role', 'display');
    if (connectionDot) connectionDot.classList.add('active');
    if (connectionStatus) connectionStatus.textContent = 'Conectado';
  });

  socket.on('disconnect', () => {
    if (connectionDot) connectionDot.classList.remove('active');
    if (connectionStatus) connectionStatus.textContent = 'Desconectado';
  });

  // Actualización de estado inicial
  socket.on('state_update', (state) => {
    if (state.isAlertActive) {
      showAlert(state.message || 'TIEMPO');
    } else {
      showBlackScreen();
    }
  });

  // Alerta recibida desde el Móvil 1
  socket.on('alert_triggered', (data) => {
    showAlert(data.message || 'TIEMPO');
    playAlertBeep();

    // Si el dispositivo vibra
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
  });

  // Parada de alerta recibida desde el Móvil 1
  socket.on('alert_stopped', () => {
    showBlackScreen();
  });

  // Función para mostrar la pantalla ROJA con "TIEMPO" de arriba a abajo
  function showAlert(msg) {
    displayScreen.classList.remove('idle');
    displayScreen.classList.add('alert');
    const text = (msg || 'TIEMPO').toUpperCase();
    alertText.innerHTML = text.split('').map(char => `<span>${char}</span>`).join('');
  }

  // Función para poner la pantalla en NEGRO total
  function showBlackScreen() {
    displayScreen.classList.remove('alert');
    displayScreen.classList.add('idle');
  }

  // Auto intentar wake lock si ya hubo interacción
  window.addEventListener('click', () => {
    if (!keepAlive.isActive) {
      keepAlive.enable();
    }
  }, { once: true });
});

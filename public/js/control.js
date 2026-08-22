document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  const btnTrigger = document.getElementById('btnTrigger');
  const btnStop = document.getElementById('btnStop');
  const currentStatus = document.getElementById('currentStatus');
  const statusText = document.getElementById('statusText');
  const activeDisplaysCount = document.getElementById('activeDisplaysCount');
  const connectionDot = document.getElementById('connectionDot');
  const connectionText = document.getElementById('connectionText');

  function triggerHaptic(pattern = 40) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  // Enviar alerta
  btnTrigger.addEventListener('click', () => {
    triggerHaptic([60, 40, 60]);
    socket.emit('trigger_alert', 'TIEMPO');
  });

  // Parar alerta
  btnStop.addEventListener('click', () => {
    triggerHaptic(40);
    socket.emit('stop_alert');
  });

  // Socket events
  socket.on('connect', () => {
    socket.emit('register_role', 'control');
    if (connectionDot) connectionDot.classList.add('active');
    if (connectionText) connectionText.textContent = 'Mando Conectado';
  });

  socket.on('disconnect', () => {
    if (connectionDot) connectionDot.classList.remove('active');
    if (connectionText) connectionText.textContent = 'Desconectado';
  });

  function updateStatusUI(isActive) {
    if (isActive) {
      currentStatus.classList.remove('alert-idle');
      currentStatus.classList.add('alert-active');
      statusText.textContent = '🔴 AVISO ACTIVO ("TIEMPO")';
    } else {
      currentStatus.classList.remove('alert-active');
      currentStatus.classList.add('alert-idle');
      statusText.textContent = '⚫ EN REPOSO (Pantalla Negra)';
    }
  }

  socket.on('state_update', (state) => {
    updateStatusUI(state.isAlertActive);
    if (activeDisplaysCount) {
      activeDisplaysCount.textContent = state.activeDisplays || 0;
    }
  });

  socket.on('alert_triggered', () => {
    updateStatusUI(true);
  });

  socket.on('alert_stopped', () => {
    updateStatusUI(false);
  });

  socket.on('stats_update', (stats) => {
    if (activeDisplaysCount) {
      activeDisplaysCount.textContent = stats.activeDisplays || 0;
    }
  });
});

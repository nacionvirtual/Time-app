/**
 * Motor Robusto de Prevención de Suspensión de Pantalla
 * Combina:
 * 1. Screen Wake Lock API (para contextos HTTPS y navegadores modernos)
 * 2. Video Loop NoSleep (Base64 MP4 loop activo para Android e iOS en cualquier red/HTTP/HTTPS)
 */

// Video MP4 diminuto de 1 frame silencioso en Base64 para mantener la pantalla activa en cualquier navegador móvil
const NO_SLEEP_VIDEO_B64 = 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAADFtb292AAAAbG12aGQAAAAA1uU7hNblO4QAAAPoAAAAAAABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAGXRyYWsAAABcdGtoZAAAAAHW5TuE1uU7hAAAAAEAAAAAAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAgAAAAEAAAAAAARtZGlhAAAAIG1kaGQAAAAA1uU7hNblO4QAAAPoAAAAAAAAVXNpZAAAAAAocGhscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAFZpZGVvSGFuZGxlcgAAAAF8bWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAAJGRpbmYAAAAcadGJsZgAAAAARdXJsIAAAAAEAAAAAc3RibAAAAGRzdHNkAAAAAAAAAAEAAABMbXA0dgAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAACAAEAASAAAAEgAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY//8AAAAic2R0cAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAUY3R0cwAAAAAAAAABAAAAAQAAAAAAAABEc3R0cwAAAAAAAAABAAAAAQAAAPoAAAAUc3Rzc8AAAAAAAAABAAAAAQAAABRzdHNjAAAAAAAAAAEAAAABAAAAAQAAAAEAAAAUc3RzegAAAAAAAAAQAAAAAQAAAAAAAABEc3RjbwAAAAAAAAABAAAALAAAAEZtZGF0AAAAAAAAABgBAAMAcgAAAAEB/w==';

class ScreenKeepAlive {
  constructor(options = {}) {
    this.wakeLock = null;
    this.isActive = false;
    this.videoEl = null;
    this.onStatusChange = options.onStatusChange || (() => {});

    this.initVideoElement();
    this.initVisibilityListener();
  }

  initVideoElement() {
    if (!this.videoEl) {
      this.videoEl = document.createElement('video');
      this.videoEl.setAttribute('playsinline', '');
      this.videoEl.setAttribute('webkit-playsinline', '');
      this.videoEl.setAttribute('loop', '');
      this.videoEl.muted = true;
      this.videoEl.volume = 0;
      this.videoEl.style.position = 'fixed';
      this.videoEl.style.left = '-9999px';
      this.videoEl.style.top = '-9999px';
      this.videoEl.style.width = '1px';
      this.videoEl.style.height = '1px';
      this.videoEl.style.opacity = '0.01';
      this.videoEl.src = NO_SLEEP_VIDEO_B64;
    }
  }

  initVisibilityListener() {
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && this.isActive) {
        await this.enable();
      }
    });
  }

  async enable() {
    this.isActive = true;
    let wakeLockSuccess = false;

    // 1. Intentar Screen Wake Lock API (Requiere HTTPS)
    if ('wakeLock' in navigator && window.isSecureContext) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          if (this.isActive && document.visibilityState === 'visible') {
            this.requestWakeLockNative();
          }
        });
        wakeLockSuccess = true;
      } catch (err) {
        console.warn('Wake Lock nativo no disponible:', err);
      }
    }

    // 2. Ejecutar SIEMPRE el Video Loop NoSleep (funciona en Android/iOS tanto en HTTP como en HTTPS)
    try {
      if (!this.videoEl.parentNode) {
        document.body.appendChild(this.videoEl);
      }
      this.videoEl.currentTime = 0;
      const playPromise = this.videoEl.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (err) {
      console.warn('Error reproduciendo video NoSleep:', err);
    }

    this.onStatusChange(true, wakeLockSuccess ? 'Protección Activa (Wake Lock + NoSleep)' : 'Protección Activa (NoSleep Activo)');
    return true;
  }

  async requestWakeLockNative() {
    if ('wakeLock' in navigator && window.isSecureContext) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch (e) {}
    }
  }

  async disable() {
    this.isActive = false;
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch (e) {}
      this.wakeLock = null;
    }

    if (this.videoEl) {
      try {
        this.videoEl.pause();
        if (this.videoEl.parentNode) {
          this.videoEl.parentNode.removeChild(this.videoEl);
        }
      } catch (e) {}
    }

    this.onStatusChange(false, 'Pantalla libre');
  }
}

window.ScreenKeepAlive = ScreenKeepAlive;

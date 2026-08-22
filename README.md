# 📱 App Web de Aviso en Tiempo Real ("TIEMPO")

Aplicación web diseñada para comunicar dos teléfonos móviles de forma instantánea mediante WebSockets:
- **Móvil 1 (Mando)**: Botón para activar el aviso rojo de **"TIEMPO"** y botón para **PARAR AVISO** (pantalla en negro).
- **Móvil 2 (Pantalla)**: Recibe la señal, muestra la pantalla en rojo con la palabra "TIEMPO" en blanco y, al parar, la deja en negro total. Además, **bloquea la suspensión del dispositivo (Screen Wake Lock)** para que la pantalla nunca se apague ni se bloquee.

---

## 🚀 Cómo Iniciar la App

1. Abre la terminal en esta carpeta:
   ```bash
   npm install
   npm start
   ```

2. Al iniciar, la consola te mostrará la dirección IP de tu red local (por ejemplo `http://192.168.1.50:3000`).

3. Conecta ambos móviles a la **misma red Wi-Fi**:
   - En tu ordenador o en el móvil abre `http://localhost:3000` (o la IP local) para ver el selector y los códigos QR.
   - En el **Móvil 1**: Escanea el QR del Mando (`/control.html`).
   - En el **Móvil 2**: Escanea el QR de la Pantalla (`/display.html`) y presiona *"INICIAR PANTALLA"*.

---

## ⚡ Características Clave

- **Screen Wake Lock API**: Evita que el Móvil 2 entre en reposo o apague la pantalla. Incluye fallback automático para compatibilidad con iOS y navegadores antiguos.
- **Sincronización Instantánea (<50ms)**: Utiliza WebSockets (`socket.io`) para una respuesta en tiempo real.
- **Pantalla Completa**: Oculta las barras del navegador en el Móvil 2 con un toque.
- **Feedback Táctil y Sonoro**: Vibración háptica en el mando y tono acústico sintetizado en la pantalla al sonar la alarma.

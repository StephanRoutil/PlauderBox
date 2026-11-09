(() => {
  const recordButton = document.getElementById('recordButton');
  const recordButtonText = document.getElementById('recordButtonText');
  const recordingStage = document.getElementById('recordingStage');
  const statusText = document.getElementById('statusText');
  const timer = document.getElementById('timer');
  const processing = document.getElementById('processing');
  const result = document.getElementById('result');
  const transcript = document.getElementById('transcript');
  const modelLabel = document.getElementById('modelLabel');
  const message = document.getElementById('message');
  const connectionState = document.getElementById('connectionState');
  const canvas = document.getElementById('visualizer');
  const canvasContext = canvas.getContext('2d');

  let mediaRecorder;
  let mediaStream;
  let audioContext;
  let analyser;
  let animationFrame;
  let chunks = [];
  let startedAt = 0;
  let timerInterval;
  let recording = false;

  const supportedType = () => [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus'
  ].find(type => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || '';

  const extensionFor = type => {
    if (type.includes('mp4')) return 'mp4';
    if (type.includes('ogg')) return 'ogg';
    return 'webm';
  };

  function setMessage(text = '') {
    message.textContent = text;
    message.hidden = !text;
  }

  function updateTimer() {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    const minutes = Math.floor(seconds / 60);
    timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function drawIdle() {
    const width = canvas.width;
    const height = canvas.height;
    canvasContext.clearRect(0, 0, width, height);
    canvasContext.beginPath();
    canvasContext.strokeStyle = '#ddd7cf';
    canvasContext.lineWidth = 2;
    for (let x = 0; x < width; x += 9) {
      const wave = 8 + Math.sin(x * .045) * 5;
      canvasContext.moveTo(x, height / 2 - wave / 2);
      canvasContext.lineTo(x, height / 2 + wave / 2);
    }
    canvasContext.stroke();
  }

  function drawAudio() {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const width = canvas.width;
    const height = canvas.height;
    canvasContext.clearRect(0, 0, width, height);
    const bars = 58;
    const gap = 4;
    const barWidth = (width - gap * (bars - 1)) / bars;
    for (let index = 0; index < bars; index += 1) {
      const value = data[Math.floor(index / bars * data.length)] / 255;
      const barHeight = Math.max(5, value * height * .78);
      const x = index * (barWidth + gap);
      const gradient = canvasContext.createLinearGradient(0, height / 2 - barHeight / 2, 0, height / 2 + barHeight / 2);
      gradient.addColorStop(0, '#e44a32');
      gradient.addColorStop(1, '#f3a48f');
      canvasContext.fillStyle = gradient;
      canvasContext.fillRect(x, height / 2 - barHeight / 2, barWidth, barHeight);
    }
    animationFrame = requestAnimationFrame(drawAudio);
  }

  function closeMedia() {
    clearInterval(timerInterval);
    cancelAnimationFrame(animationFrame);
    if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
    if (audioContext) audioContext.close().catch(() => {});
    mediaStream = null;
    audioContext = null;
    analyser = null;
    drawIdle();
  }

  async function startRecording() {
    setMessage();
    result.hidden = true;
    transcript.textContent = '';
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setMessage('Dieser Browser unterstützt die benötigte Mikrofonaufnahme nicht.');
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      const mimeType = supportedType();
      mediaRecorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream);
      chunks = [];
      mediaRecorder.addEventListener('dataavailable', event => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      mediaRecorder.addEventListener('stop', () => sendRecording(mediaRecorder.mimeType || mimeType || 'audio/webm'));

      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(mediaStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      mediaRecorder.start(500);
      recording = true;
      startedAt = Date.now();
      timer.textContent = '00:00';
      timerInterval = setInterval(updateTimer, 250);
      recordingStage.classList.add('is-recording');
      recordButton.setAttribute('aria-label', 'Aufnahme stoppen');
      recordButtonText.textContent = 'Aufnahme stoppen';
      statusText.textContent = 'Aufnahme läuft';
      drawAudio();
    } catch (error) {
      closeMedia();
      if (error?.name === 'NotAllowedError') setMessage('Der Mikrofonzugriff wurde nicht erlaubt. Bitte in den Browser-Einstellungen freigeben.');
      else if (error?.name === 'NotFoundError') setMessage('Es wurde kein Mikrofon gefunden.');
      else setMessage('Die Mikrofonaufnahme konnte nicht gestartet werden.');
    }
  }

  function stopRecording() {
    if (!recording || !mediaRecorder) return;
    recording = false;
    recordButton.disabled = true;
    statusText.textContent = 'Aufnahme beendet';
    mediaRecorder.stop();
    recordingStage.classList.remove('is-recording');
    recordButton.setAttribute('aria-label', 'Aufnahme starten');
    recordButtonText.textContent = 'Aufnahme starten';
    closeMedia();
  }

  async function sendRecording(mimeType) {
    const blob = new Blob(chunks, { type: mimeType });
    chunks = [];
    if (!blob.size) {
      recordButton.disabled = false;
      setMessage('Die Aufnahme war leer. Bitte nochmals versuchen.');
      return;
    }

    processing.hidden = false;
    setMessage();
    try {
      const form = new FormData();
      form.append('audio', blob, `aufnahme.${extensionFor(mimeType)}`);
      const response = await fetch('/api/transkribieren', { method: 'POST', body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || 'Die Transkription ist fehlgeschlagen.');
      transcript.textContent = payload.text;
      modelLabel.textContent = payload.modell || '';
      result.hidden = false;
      statusText.textContent = 'Text erkannt';
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      statusText.textContent = 'Bereit';
      setMessage(error?.message || 'Die Transkription ist fehlgeschlagen.');
    } finally {
      processing.hidden = true;
      recordButton.disabled = false;
    }
  }

  recordButton.addEventListener('click', () => recording ? stopRecording() : startRecording());

  fetch('/api/status')
    .then(response => response.json())
    .then(status => {
      connectionState.textContent = status.kiBereit ? `KI bereit · ${status.modell}` : 'KI noch nicht konfiguriert';
      connectionState.className = status.kiBereit ? 'is-ready' : 'is-error';
    })
    .catch(() => {
      connectionState.textContent = 'Serverstatus nicht verfügbar';
      connectionState.className = 'is-error';
    });

  drawIdle();
})();


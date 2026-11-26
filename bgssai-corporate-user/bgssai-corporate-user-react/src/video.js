const FPS = 24;
const LONG_EDGE = 1280;
const SHORT_EDGE = 720;
const FONT = '"Microsoft YaHei", "PingFang SC", system-ui, sans-serif';
const imageCache = new Map();
const pendingFrames = new WeakMap();

function loadImage(source) {
  if (!source) return Promise.resolve(null);
  if (imageCache.has(source)) return imageCache.get(source);
  const promise = new Promise((resolve, reject) => {
    const url = new URL(source, location.href);
    const localImage = /^data:image\/(?:png|jpeg|webp);base64,/i.test(source);
    if (!localImage && (url.origin !== location.origin || !['https:', 'http:'].includes(url.protocol))) {
      reject(new Error('请使用模板图片或上传 PNG、JPEG、WebP 图片。'));
      return;
    }
    const image = new Image();
    image.onload = () => {
      // Keep decoded images close to the resolution needed by the encoder.
      try {
        const scale = Math.min(1, LONG_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
        const bitmap = document.createElement('canvas');
        bitmap.width = Math.max(1, Math.round(image.naturalWidth * scale));
        bitmap.height = Math.max(1, Math.round(image.naturalHeight * scale));
        bitmap.getContext('2d').drawImage(image, 0, 0, bitmap.width, bitmap.height);
        resolve(bitmap);
      } catch (error) {
        reject(new Error('无法读取分镜图片。请缩小图片后重试。', { cause: error }));
      }
    };
    image.onerror = () => reject(new Error('分镜图片加载失败，请更换图片后重试。'));
    image.src = url.href;
  });
  if (imageCache.size >= 6) imageCache.delete(imageCache.keys().next().value);
  imageCache.set(source, promise);
  promise.catch(() => {
    if (imageCache.get(source) === promise) imageCache.delete(source);
  });
  return promise;
}

function timeline(project) {
  let total = 0;
  const shots = project.scenes.map(scene => {
    const duration = Number(scene.duration);
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('每个分镜都需要有效的时长。');
    const start = total;
    total += duration;
    return { scene, start, end: total };
  });
  if (!shots.length) throw new Error('请先添加分镜。');
  return { shots, total };
}

function shotAt(shots, time) {
  return shots.find(shot => time < shot.end) || shots[shots.length - 1];
}

function wrapText(ctx, text, maxWidth, maxLines) {
  const lines = [];
  let line = '';
  for (const character of String(text || '').trim()) {
    if (character === '\n' || ctx.measureText(line + character).width > maxWidth) {
      lines.push(line.trimEnd());
      if (lines.length === maxLines) {
        let last = lines.pop();
        while (last && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
        return [...lines, last + '…'];
      }
      line = character === '\n' ? '' : character.trimStart();
    } else {
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function paint(canvas, project, shot, time, image) {
  const portrait = project.aspect === '9:16';
  const width = portrait ? SHORT_EDGE : LONG_EDGE;
  const height = portrait ? LONG_EDGE : SHORT_EDGE;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器未能创建视频画布。');

  if (image) {
    ctx.fillStyle = '#183136';
    ctx.fillRect(0, 0, width, height);
    const phase = Math.min(1, Math.max(0, (time - shot.start) / (shot.end - shot.start)));
    const scale = Math.max(width / image.width, height / image.height) * (1 + 0.035 * phase);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
  } else {
    const base = ctx.createLinearGradient(0, height, width, 0);
    base.addColorStop(0, '#102327');
    base.addColorStop(0.68, '#25474d');
    base.addColorStop(1, '#517270');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);
  }
  const margin = portrait ? 50 : 70;
  const textWidth = width - margin * 2;
  const brandColor = /^#[0-9a-f]{6}$/i.test(project.brandColor) ? project.brandColor : '#c3e5a8';
  const heading = shot.start === 0 && project.title ? project.title : shot.scene.caption;
  const caption = shot.start === 0 && project.title ? shot.scene.caption : '';
  const titleSize = portrait ? 52 : 58;
  const captionSize = portrait ? 26 : 28;
  ctx.font = '650 ' + titleSize + 'px ' + FONT;
  const titles = wrapText(ctx, heading, textWidth, 3);
  ctx.font = '400 ' + captionSize + 'px ' + FONT;
  const captions = wrapText(ctx, caption, textWidth, 3);
  const closingFont = '600 26px ' + FONT;
  ctx.font = closingFont;
  const closingText = shot.scene === project.scenes.at(-1)
    ? Array.from(String(project.closingLine || '').trim().replace(/\s+/g, ' ')).slice(0, 40).join('')
    : '';
  const closing = wrapText(ctx, closingText, textWidth - 40, 3);
  const closingHeight = closing.length ? closing.length * 35 + 18 : 0;
  const titleStep = Math.round(titleSize * 1.3);
  const captionStep = Math.round(captionSize * 1.4);
  const gap = titles.length && captions.length ? 10 : 0;
  const closingGap = closing.length && (titles.length || captions.length) ? 18 : 0;
  let y = height - margin - titles.length * titleStep - captions.length * captionStep - gap - closingHeight - closingGap;

  // Darken from the actual start of the text block, including long single-shot films.
  const shade = ctx.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, 'rgba(4, 12, 16, 0.75)');
  shade.addColorStop(Math.min(0.36, y / height * 0.7), 'rgba(4, 12, 16, 0.09)');
  shade.addColorStop(y / height, 'rgba(4, 12, 16, 0.62)');
  shade.addColorStop(1, 'rgba(4, 12, 16, 0.88)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);

  ctx.textBaseline = 'top';
  ctx.fillStyle = '#f5f5ec';
  ctx.font = '600 24px ' + FONT;
  const [company] = wrapText(ctx, project.company, textWidth, 1);
  if (company) ctx.fillText(company, margin, margin * 0.8);
  if (titles.length || captions.length || closing.length) {
    ctx.fillStyle = brandColor;
    ctx.fillRect(margin, y - 25, 49, 4);
  }
  ctx.fillStyle = '#fffdf7';
  ctx.font = '650 ' + titleSize + 'px ' + FONT;
  for (const line of titles) {
    ctx.fillText(line, margin, y);
    y += titleStep;
  }
  y += gap;
  ctx.font = '400 ' + captionSize + 'px ' + FONT;
  for (const line of captions) {
    ctx.fillText(line, margin, y);
    y += captionStep;
  }
  if (closing.length) {
    y += closingGap;
    ctx.font = closingFont;
    const panelWidth = Math.ceil(Math.max(...closing.map(line => ctx.measureText(line).width))) + 40;
    ctx.fillStyle = '#152327';
    ctx.fillRect(margin, y, panelWidth, closingHeight);
    ctx.fillStyle = brandColor;
    ctx.fillRect(margin, y, 5, closingHeight);
    ctx.fillStyle = '#ffffff';
    for (const line of closing) {
      ctx.fillText(line, margin + 20, y + 9);
      y += 35;
    }
  }
}

export async function renderFrame(canvas, project, timeInSeconds = 0) {
  const token = Symbol();
  pendingFrames.set(canvas, token);
  const { shots, total } = timeline(project);
  const time = Math.max(0, Math.min(total, Number(timeInSeconds) || 0));
  const shot = shotAt(shots, time);
  const image = await loadImage(shot.scene.image);
  // A scrub or edit may have requested a newer frame while this image decoded.
  if (pendingFrames.get(canvas) === token) paint(canvas, project, shot, time, image);
}

function encoderType() {
  if (!globalThis.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error('当前浏览器不支持视频导出，请使用支持画布录制的新版 Chrome、Edge 或 Safari。');
  }
  const types = ['video/mp4;codecs=avc1.42E01F', 'video/mp4', 'video/webm;codecs=vp8', 'video/webm'];
  const supported = types.find(type => MediaRecorder.isTypeSupported(type));
  if (!supported) throw new Error('当前浏览器没有可用的视频编码器。');
  return supported;
}

function abortError() {
  return new DOMException('已取消导出。', 'AbortError');
}

export async function exportVideo(project, { onProgress, signal } = {}) {
  if (signal?.aborted) throw abortError();
  const mimeType = encoderType();
  const { shots, total } = timeline(project);
  const canvas = document.createElement('canvas');
  return new Promise((resolve, reject) => {
    let settled = false;
    let recorder;
    let stream;
    let frameId;
    const chunks = [];

    function finish(error, file) {
      if (settled) return;
      settled = true;
      cancelAnimationFrame(frameId);
      document.removeEventListener('visibilitychange', checkVisibility);
      signal?.removeEventListener('abort', cancel);
      if (recorder?.state === 'recording') recorder.stop();
      stream?.getTracks().forEach(track => track.stop());
      if (error) reject(error);
      else resolve(file);
    }
    function cancel() {
      finish(abortError());
    }
    function checkVisibility() {
      if (document.hidden) finish(new Error('导出需要保持页面在前台，请切回工作台后重新导出。'));
    }
    signal?.addEventListener('abort', cancel, { once: true });
    document.addEventListener('visibilitychange', checkVisibility);
    checkVisibility();

    async function start() {
      if (settled) return;
      onProgress?.(0);
      const images = new Map();
      // Decode before recording so image latency cannot alter shot durations.
      for (const { scene } of shots) {
        if (!images.has(scene.image)) images.set(scene.image, await loadImage(scene.image));
        if (settled) return;
      }
      paint(canvas, project, shots[0], 0, images.get(shots[0].scene.image));
      stream = canvas.captureStream(FPS);
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4500000 });
      recorder.onerror = event => finish(new Error('视频编码失败，请关闭其他录制任务后重试。', { cause: event.error }));
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        if (settled) return;
        if (!chunks.length) return finish(new Error('未生成视频数据，请重试。'));
        const file = new Blob(chunks, { type: chunks[0].type || recorder.mimeType });
        finish(null, file);
      };
      recorder.start();
      const started = performance.now();
      let lastFrame = -1;
      function tick(now) {
        if (settled) return;
        try {
          const time = Math.max(0, Math.min(total, (now - started) / 1000));
          const frame = Math.floor(time * FPS);
          if (lastFrame !== frame || time === total) {
            const shot = shotAt(shots, time);
            paint(canvas, project, shot, time, images.get(shot.scene.image));
            lastFrame = frame;
            onProgress?.(time / total);
          }
          if (time >= total) recorder.stop();
          else frameId = requestAnimationFrame(tick);
        } catch (error) {
          finish(error);
        }
      }
      frameId = requestAnimationFrame(tick);
    }
    start().catch(finish);
  });
}

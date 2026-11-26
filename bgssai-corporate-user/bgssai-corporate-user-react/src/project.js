export function uid() {
  return (
    globalThis.crypto.randomUUID?.() ??
    Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) =>
      n.toString(16),
    ).join('-')
  );
}

export function blankScene() {
  return { id: uid(), caption: '', duration: 4, image: '' };
}

export function blankProject() {
  return {
    id: uid(),
    name: '未命名项目',
    company: '',
    title: '',
    aspect: '16:9',
    brandColor: '#c3e5a8',
    closingLine: '',
    scenes: [blankScene()],
  };
}

export function fromTemplate(template) {
  return {
    ...template,
    id: uid(),
    scenes: template.scenes.map((scene) => ({ ...scene, id: uid() })),
  };
}

export function startOf(scenes, index) {
  return scenes.slice(0, index).reduce((sum, scene) => sum + scene.duration, 0);
}

export function indexAt(scenes, time) {
  let end = 0;
  for (let i = 0; i < scenes.length; i++) {
    end += scenes[i].duration;
    if (time < end) return i;
  }
  return scenes.length - 1;
}

export function clock(seconds) {
  const whole = Math.floor(seconds);
  return [Math.floor(whole / 60), whole % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

export async function getTemplates() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('/api/templates', {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('无法读取模板库');
    const templates = await response.json();
    if (!Array.isArray(templates) || templates.length === 0)
      throw new Error('模板库暂时为空');
    return templates;
  } finally {
    clearTimeout(timeout);
  }
}

export async function readImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('请选择 JPG、PNG 或 WebP 图片。');
  if (file.size > 4 * 1024 * 1024)
    throw new Error('图片超过 4 MiB，请缩小后重新选择。');
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片失败，请重新选择。'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
  const check = new Image();
  check.src = source;
  try {
    await check.decode();
  } catch {
    throw new Error('图片格式无效，无法解码。');
  }
  if (check.naturalWidth * check.naturalHeight > 32_000_000)
    throw new Error('图片分辨率过大，请缩小至 3200 万像素以内。');
  return source;
}

const DB_NAME = 'bgssai-corporate-studio';
const STORE = 'drafts';

function openDrafts() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('当前浏览器无法使用本地草稿存储。'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('无法打开草稿库，请检查浏览器的存储权限。', { cause: request.error }));
  });
}

async function transact(mode, operation) {
  const db = await openDrafts();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = operation(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => {
        const message = tx.error?.name === 'QuotaExceededError'
          ? '浏览器存储空间不足，请缩小图片或删除旧草稿后重试。'
          : '草稿读写失败，请检查浏览器的存储权限。';
        reject(new Error(message, { cause: tx.error }));
      };
    });
  } finally {
    db.close();
  }
}

export async function listDrafts() {
  const entries = await transact('readonly', store => store.getAll());
  return entries.sort((a, b) => b.updatedAt - a.updatedAt).map(entry => entry.project);
}

export async function saveDraft(project) {
  if (!project?.id) throw new Error('草稿缺少项目编号。');
  await transact('readwrite', store => store.put({ id: project.id, updatedAt: Date.now(), project }));
}

export async function deleteDraft(id) {
  await transact('readwrite', store => store.delete(id));
}

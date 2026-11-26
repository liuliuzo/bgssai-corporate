import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Clapperboard,
  Download,
  FileVideo,
  Folder,
  FolderOpen,
  HardDrive,
  LayoutTemplate,
  LoaderCircle,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import Inspector from './Inspector.jsx';
import Timeline from './Timeline.jsx';
import Preview from './Preview.jsx';
import Library, { Dialog } from './Library.jsx';
import { deleteDraft, listDrafts, saveDraft } from './drafts.js';
import { exportVideo } from './video.js';
import {
  blankProject,
  blankScene,
  fromTemplate,
  getTemplates,
  indexAt,
  readImage,
  startOf,
} from './project.js';

export default function App() {
  const [templates, setTemplates] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [templateError, setTemplateError] = useState('');
  const [draftError, setDraftError] = useState('');
  const [project, setProject] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [persisted, setPersisted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('scene');
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState(null);
  const [time, setTime] = useState(0);
  const [playRange, setPlayRange] = useState(null);
  const [output, setOutput] = useState(null);
  const controller = useRef(null);
  const projectSession = useRef(0);
  const dirty = project !== baseline;
  const total = project ? startOf(project.scenes, project.scenes.length) : 0;
  const index = project ? indexAt(project.scenes, time) : 0;

  const openProject = useCallback((next, stored) => {
    projectSession.current += 1;
    setProject(next);
    setBaseline(next);
    setPersisted(stored);
    setTime(0);
    setPlayRange(null);
    setTab('scene');
    setModal(null);
    setNotice(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [catalog, local] = await Promise.allSettled([
        getTemplates(),
        listDrafts(),
      ]);
      if (!mounted) return;
      const choices = catalog.status === 'fulfilled' ? catalog.value : [];
      const saved = local.status === 'fulfilled' ? local.value : [];
      setTemplates(choices);
      setDrafts(saved);
      const templateMessage =
        '暂时无法加载模板。可以继续编辑，或在模板库中重试。';
      const draftMessage = '无法读取本机草稿，请检查浏览器是否允许本地存储。';
      if (catalog.status === 'rejected') setTemplateError(templateMessage);
      if (local.status === 'rejected') setDraftError(draftMessage);
      openProject(
        saved[0] ?? (choices[0] ? fromTemplate(choices[0]) : blankProject()),
        saved.length > 0,
      );
      if (catalog.status === 'rejected' || local.status === 'rejected') {
        setNotice({
          message:
            catalog.status === 'rejected' ? templateMessage : draftMessage,
          error: true,
        });
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [openProject]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!playRange) return;
    const started = performance.now();
    let handle;
    function tick(now) {
      const next = playRange.start + (now - started) / 1000;
      if (next >= playRange.end) {
        setTime(playRange.single ? playRange.end - 0.001 : playRange.end);
        setPlayRange(null);
        return;
      }
      setTime(next);
      handle = requestAnimationFrame(tick);
    }
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [playRange]);

  useEffect(() => {
    if (!output?.url) return;
    return () => URL.revokeObjectURL(output.url);
  }, [output?.url]);

  function seek(value) {
    setPlayRange(null);
    setTime(value);
  }

  function selectShot(position) {
    seek(startOf(project.scenes, position));
    setTab('scene');
  }

  function changeProject(changes) {
    setPlayRange(null);
    setProject({ ...project, ...changes });
  }

  function changeScene(changes) {
    const scenes = project.scenes.map((scene, i) =>
      i === index ? { ...scene, ...changes } : scene,
    );
    if (changes.duration !== undefined) seek(startOf(scenes, index));
    changeProject({ scenes });
  }

  function move(delta) {
    const scenes = [...project.scenes];
    const [scene] = scenes.splice(index, 1);
    scenes.splice(index + delta, 0, scene);
    seek(startOf(scenes, index + delta));
    changeProject({ scenes });
  }

  function remove() {
    if (project.scenes.length < 2 || !window.confirm('删除选中的分镜？'))
      return;
    const scenes = project.scenes.filter((_, i) => i !== index);
    seek(startOf(scenes, Math.min(index, scenes.length - 1)));
    changeProject({ scenes });
  }

  function add() {
    if (project.scenes.length >= 24) return;
    const scenes = [...project.scenes, blankScene()];
    changeProject({ scenes });
    seek(total);
    setTab('scene');
  }

  async function upload(file) {
    const id = project.scenes[index].id;
    const session = projectSession.current;
    try {
      const image = await readImage(file);
      if (session !== projectSession.current) return;
      setPlayRange(null);
      setProject((current) => ({
        ...current,
        scenes: current.scenes.map((scene) =>
          scene.id === id ? { ...scene, image } : scene,
        ),
      }));
    } catch (error) {
      setNotice({ message: error.message, error: true });
    }
  }

  async function refreshDrafts() {
    try {
      setDrafts(await listDrafts());
      setDraftError('');
    } catch {
      setDraftError('无法读取本机草稿，请检查浏览器存储权限后重试。');
    }
  }

  async function refreshTemplates() {
    try {
      setTemplates(await getTemplates());
      setTemplateError('');
    } catch {
      setTemplateError('暂时无法加载模板，请确认服务连接后重试。');
    }
  }

  async function save() {
    if (saving) return;
    const session = projectSession.current;
    setSaving(true);
    try {
      await saveDraft(project);
      if (session === projectSession.current) {
        setBaseline(project);
        setPersisted(true);
        setNotice({ message: '草稿已保存到此浏览器。' });
      }
      await refreshDrafts();
    } catch {
      if (session === projectSession.current) {
        setNotice({
          message: '保存失败，请检查浏览器的本地存储权限和剩余空间。',
          error: true,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  function showLibrary(kind) {
    setPlayRange(null);
    setModal(kind);
    if (kind === 'drafts') void refreshDrafts();
    else if (kind === 'templates' && templateError) void refreshTemplates();
  }

  function choose(next, stored) {
    if (dirty && !window.confirm('当前项目有未保存的修改，仍要切换项目吗？'))
      return;
    openProject(next, stored);
  }

  async function discard(entry) {
    if (
      !window.confirm('删除本机草稿「' + (entry.name || '未命名项目') + '」？')
    )
      return;
    try {
      await deleteDraft(entry.id);
      if (entry.id === project.id) setPersisted(false);
      await refreshDrafts();
    } catch {
      setDraftError('删除失败，请重试。');
    }
  }

  async function startExport() {
    setPlayRange(null);
    setModal('export');
    setOutput({ progress: 0 });
    const active = new AbortController();
    controller.current = active;
    try {
      const blob = await exportVideo(project, {
        signal: active.signal,
        onProgress: (progress) => {
          if (controller.current === active) setOutput({ progress });
        },
      });
      if (controller.current !== active) return;
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const filename =
        (project.title || project.name || '企业宣传片').replace(
          /[\\/:*?"<>|]/g,
          '_',
        ) +
        '.' +
        ext;
      setOutput({ url: URL.createObjectURL(blob), filename });
    } catch (error) {
      if (controller.current === active)
        setOutput({ error: error.message || '导出失败，请重试。' });
    } finally {
      if (controller.current === active) controller.current = null;
    }
  }

  function closeExport() {
    controller.current?.abort();
    controller.current = null;
    setOutput(null);
    setModal(null);
  }

  if (!project)
    return (
      <main className="loading">
        <LoaderCircle className="spin" />
        正在打开企业影像工作台…
      </main>
    );
  const savedLabel = dirty
    ? '有未保存的修改'
    : persisted
      ? '已保存到本机'
      : '尚未保存';
  const nav = [
    { id: null, icon: Clapperboard, label: '分镜工作台' },
    { id: 'templates', icon: LayoutTemplate, label: '宣传片模板' },
    { id: 'drafts', icon: FolderOpen, label: '本机草稿' },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div>
            <strong>BGSSAI</strong>
            <span>企业影像工作室</span>
          </div>
        </div>
        <nav aria-label="制作导航">
          {nav.map(({ id, icon: Icon, label }) => (
            <button
              key={label}
              className={
                (!modal || modal === 'export' ? id === null : modal === id)
                  ? 'active'
                  : ''
              }
              title={label}
              onClick={() => (id ? showLibrary(id) : setModal(null))}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="local-caption">
          <HardDrive />
          <div>
            <strong>本地工作区</strong>
            <small>草稿保存在此浏览器</small>
          </div>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <Folder />
            制作空间
            <ChevronRight />
            <strong>分镜工作台</strong>
          </div>
          <button className="button save" disabled={saving} onClick={save}>
            <Save />
            {saving ? '保存中…' : '保存草稿'}
          </button>
          <button className="button primary" onClick={startExport}>
            <Download />
            导出视频
          </button>
        </header>
        <div className="content">
          <div className="project-head">
            <div>
              <div className="project-title">
                <h1>{project.name.trim() || '未命名项目'}</h1>
                <button
                  className="icon-button"
                  title="编辑项目设置"
                  aria-label="编辑项目设置"
                  onClick={() => {
                    setPlayRange(null);
                    setTab('project');
                    document
                      .querySelector('.inspector')
                      ?.scrollIntoView({ block: 'nearest' });
                  }}
                >
                  <Pencil />
                </button>
              </div>
              <p>
                {project.company.trim() || '企业宣传片'}
                <span>·</span>
                {project.aspect === '9:16' ? '竖屏' : '横屏'} {project.aspect}
                <span>·</span>
                {total} 秒
              </p>
            </div>
            <span className="save-state">
              {persisted && !dirty ? (
                <Check />
              ) : (
                <span className={'status-dot' + (dirty ? ' dirty' : '')} />
              )}
              {savedLabel}
            </span>
          </div>
          {notice && (
            <div
              className={'feedback' + (notice.error ? ' error' : '')}
              role={notice.error ? 'alert' : 'status'}
            >
              {notice.error ? <AlertCircle /> : <Check />}
              {notice.message}
              <button
                aria-label="关闭提示"
                className="icon-button"
                onClick={() => setNotice(null)}
              >
                <X />
              </button>
            </div>
          )}
          <div className="editor-grid">
            <div className="edit-stage">
              <Preview
                project={project}
                time={time}
                total={total}
                playing={!!playRange}
                onSeek={seek}
                onPlay={() => {
                  if (playRange) setPlayRange(null);
                  else
                    setPlayRange({
                      start: time >= total ? 0 : time,
                      end: total,
                    });
                }}
              />
              <Timeline
                scenes={project.scenes}
                index={index}
                total={total}
                onSelect={selectShot}
                onAdd={add}
              />
            </div>
            <Inspector
              project={project}
              index={index}
              tab={tab}
              setTab={(next) => {
                setPlayRange(null);
                setTab(next);
              }}
              changeProject={changeProject}
              changeScene={changeScene}
              move={move}
              remove={remove}
              upload={upload}
              playScene={() => {
                const start = startOf(project.scenes, index);
                setTime(start);
                setPlayRange({
                  start,
                  end: start + project.scenes[index].duration,
                  single: true,
                });
              }}
            />
          </div>
        </div>
      </main>
      {(modal === 'templates' || modal === 'drafts') && (
        <Library
          kind={modal}
          templates={templates}
          drafts={drafts}
          error={modal === 'templates' ? templateError : draftError}
          onReload={modal === 'templates' ? refreshTemplates : refreshDrafts}
          onChoose={(entry) =>
            choose(
              modal === 'templates' ? fromTemplate(entry) : entry,
              modal === 'drafts',
            )
          }
          onBlank={() => choose(blankProject(), false)}
          onDelete={discard}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'export' && output && (
        <Dialog title="导出视频" onClose={closeExport}>
          <div className="export-body">
            <FileVideo className="export-symbol" />
            <h3>
              {output.error
                ? '导出遇到问题'
                : output.url
                  ? '视频已生成'
                  : '正在合成宣传片'}
            </h3>
            {output.error ? (
              <p role="alert">{output.error}</p>
            ) : output.url ? (
              <p>{output.filename}</p>
            ) : (
              <>
                <p>请保持此标签页在前台，预计用时约 {total} 秒。</p>
                <progress
                  max="1"
                  value={output.progress}
                  aria-label="导出进度"
                />
                <small>{Math.round(output.progress * 100)}%</small>
              </>
            )}
          </div>
          <div className="modal-foot">
            {output.url ? (
              <a
                className="button primary"
                download={output.filename}
                href={output.url}
              >
                <Download />
                下载视频
              </a>
            ) : output.error ? (
              <button className="button" onClick={startExport}>
                重新导出
              </button>
            ) : (
              <button className="button" onClick={closeExport}>
                取消导出
              </button>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}

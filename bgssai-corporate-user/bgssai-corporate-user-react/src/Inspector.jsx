import React, { useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  FileImage,
  Monitor,
  Play,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react';

export default function Inspector({
  project,
  index,
  tab,
  setTab,
  changeProject,
  changeScene,
  move,
  remove,
  upload,
  playScene,
}) {
  const scene = project.scenes[index];
  const input = useRef(null);
  const projectFields = tab === 'project';
  return (
    <aside className="panel inspector" aria-label="编辑属性">
      <div className="panel-head">
        <h2>
          <SlidersHorizontal />
          编辑属性
        </h2>
      </div>
      <div className="inspector-body">
        <div className="tabs" aria-label="编辑对象">
          <button aria-pressed={!projectFields} onClick={() => setTab('scene')}>
            分镜编辑
          </button>
          <button
            aria-pressed={projectFields}
            onClick={() => setTab('project')}
          >
            项目设置
          </button>
        </div>
        {projectFields ? (
          <div className="fields">
            <label>
              项目名称
              <input
                value={project.name}
                maxLength="60"
                onChange={(e) => changeProject({ name: e.target.value })}
                placeholder="品牌形象片"
              />
            </label>
            <label>
              企业名称
              <input
                value={project.company}
                maxLength="60"
                onChange={(e) => changeProject({ company: e.target.value })}
                placeholder="填写出品企业"
              />
            </label>
            <label>
              影片标题
              <input
                value={project.title}
                maxLength="80"
                onChange={(e) => changeProject({ title: e.target.value })}
                placeholder="填写片名"
              />
            </label>
            <label>
              品牌色
              <div className="color-control">
                <input
                  aria-label="品牌色"
                  type="color"
                  value={project.brandColor || '#c3e5a8'}
                  onChange={(e) =>
                    changeProject({ brandColor: e.target.value })
                  }
                />
                <span>{project.brandColor || '#c3e5a8'}</span>
              </div>
            </label>
            <label>
              片尾行动文案
              <input
                aria-label="片尾行动文案"
                value={project.closingLine ?? ''}
                maxLength="40"
                onChange={(e) => changeProject({ closingLine: e.target.value })}
                placeholder="预约到访 · 了解更多"
              />
              <small className="field-hint">选填，仅在最后一个分镜显示。</small>
            </label>
            <fieldset>
              <legend>视频画幅</legend>
              <div className="aspect-options">
                {['16:9', '9:16'].map((aspect, i) => (
                  <button
                    key={aspect}
                    aria-pressed={project.aspect === aspect}
                    onClick={() => changeProject({ aspect })}
                  >
                    {i ? <Smartphone /> : <Monitor />}
                    {i ? '竖屏' : '横屏'} {aspect}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        ) : (
          <>
            <div className="inspector-sub">
              <h3>分镜 {String(index + 1).padStart(2, '0')}</h3>
              <button className="text-button" onClick={playScene}>
                <Play />
                单镜预览
              </button>
            </div>
            <div className="fields">
              <fieldset>
                <legend>分镜画面</legend>
                <div className="upload">
                  <div className="asset-thumb">
                    {scene.image ? (
                      <img src={scene.image} alt="当前分镜素材" />
                    ) : (
                      <FileImage />
                    )}
                  </div>
                  <div className="asset-action">
                    <button
                      className="text-button"
                      onClick={() => input.current?.click()}
                    >
                      <Upload />
                      {scene.image ? '替换图片' : '上传图片'}
                    </button>
                    <small>JPG / PNG / WebP · 4 MiB</small>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    ref={input}
                    aria-label="分镜图片文件"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) upload(file);
                    }}
                  />
                </div>
              </fieldset>
              <label>
                画面字幕
                <textarea
                  aria-label="画面字幕"
                  value={scene.caption}
                  rows="3"
                  maxLength="140"
                  onChange={(e) => changeScene({ caption: e.target.value })}
                  placeholder="描述企业定位、主营业务或品牌故事"
                />
                <small className="count">{scene.caption.length} / 140</small>
              </label>
              <label>
                镜头时长
                <div className="duration-control">
                  <Clock3 />
                  <select
                    aria-label="镜头时长"
                    value={scene.duration}
                    onChange={(e) =>
                      changeScene({ duration: Number(e.target.value) })
                    }
                  >
                    {Array.from({ length: 30 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} 秒
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>
            <div className="arrange">
              <span className="field-title">镜头顺序</span>
              <div className="arrange-actions">
                <button
                  className="button"
                  disabled={index === 0}
                  onClick={() => move(-1)}
                >
                  <ArrowLeft />
                  前移
                </button>
                <button
                  className="button"
                  disabled={index === project.scenes.length - 1}
                  onClick={() => move(1)}
                >
                  <ArrowRight />
                  后移
                </button>
              </div>
            </div>
            <button
              className="delete-scene text-button"
              disabled={project.scenes.length === 1}
              onClick={remove}
            >
              <Trash2 />
              删除分镜
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

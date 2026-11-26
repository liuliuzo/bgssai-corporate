import React, { useEffect, useRef } from 'react';
import {
  Clapperboard,
  FilePlus2,
  FolderOpen,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { startOf } from './project.js';

export function Dialog({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            className="icon-button"
            title="关闭"
            aria-label="关闭"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export default function Library({
  kind,
  templates,
  drafts,
  error,
  onReload,
  onChoose,
  onBlank,
  onDelete,
  onClose,
}) {
  const local = kind === 'drafts';
  const entries = local ? drafts : templates;
  return (
    <Dialog title={local ? '本机草稿' : '宣传片模板'} onClose={onClose}>
      <p className="modal-intro">
        {local
          ? '已保存到此浏览器的制作项目。'
          : '选择模板开始制作，也可以从空白项目开始。'}
      </p>
      {error && (
        <div className="feedback error" role="alert">
          {error}
          <button className="text-button" onClick={onReload}>
            <RefreshCw />
            重试
          </button>
        </div>
      )}
      {!entries.length && !error && (
        <p className="empty">
          <FolderOpen />
          {local ? '还没有保存的草稿。' : '暂无可用模板。'}
        </p>
      )}
      <div className="library-grid">
        {entries.map((entry) => (
          <div className="library-card" key={entry.id}>
            <button className="library-choice" onClick={() => onChoose(entry)}>
              <div className="library-image">
                {entry.scenes[0].image ? (
                  <img src={entry.scenes[0].image} alt="" />
                ) : (
                  <ImageIcon />
                )}
              </div>
              <strong>{entry.name || '未命名项目'}</strong>
              <small>
                <Clapperboard />
                {entry.scenes.length} 个分镜<span>·</span>
                {startOf(entry.scenes, entry.scenes.length)} 秒<span>·</span>
                {entry.aspect}
              </small>
            </button>
            {local && (
              <button
                className="library-delete"
                title="删除草稿"
                aria-label={'删除草稿 ' + entry.name}
                onClick={() => onDelete(entry)}
              >
                <Trash2 />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="modal-foot">
        <button className="button" onClick={onBlank}>
          <FilePlus2 />
          新建空白项目
        </button>
      </div>
    </Dialog>
  );
}

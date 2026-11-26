import React, { useEffect, useRef } from 'react';
import { Clapperboard, FileImage, Plus } from 'lucide-react';

export default function Timeline({ scenes, index, total, onSelect, onAdd }) {
  const strip = useRef(null);
  useEffect(() => {
    const list = strip.current;
    const current = list?.children[index];
    if (!current) return;
    const left =
      current.getBoundingClientRect().left - list.getBoundingClientRect().left;
    if (left < 0) list.scrollLeft += left;
    else if (left + current.offsetWidth > list.clientWidth)
      list.scrollLeft += left + current.offsetWidth - list.clientWidth;
  }, [index]);
  return (
    <section className="panel timeline" aria-label="分镜时间线">
      <div className="panel-head">
        <h2>
          <Clapperboard />
          分镜时间线
        </h2>
        <span className="meta">
          {scenes.length} 个分镜 · {total} 秒
        </span>
      </div>
      <div className="filmstrip" ref={strip}>
        {scenes.map((scene, i) => (
          <button
            className={'shot' + (i === index ? ' current' : '')}
            key={scene.id}
            aria-label={'选择分镜 ' + (i + 1)}
            aria-pressed={i === index}
            onClick={() => onSelect(i)}
          >
            <div className="shot-image">
              {scene.image ? <img src={scene.image} alt="" /> : <FileImage />}
              <span className="shot-no">{String(i + 1).padStart(2, '0')}</span>
              <span className="shot-duration">{scene.duration}s</span>
            </div>
            <span className="shot-caption">{scene.caption || '空白分镜'}</span>
          </button>
        ))}
        <button
          className="add-shot"
          disabled={scenes.length >= 24}
          onClick={onAdd}
        >
          <Plus />
          添加分镜
        </button>
      </div>
    </section>
  );
}

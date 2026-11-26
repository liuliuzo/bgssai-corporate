import React, { useEffect, useRef, useState } from 'react';
import { Maximize, MonitorPlay, Pause, Play, RotateCcw } from 'lucide-react';
import { renderFrame } from './video.js';
import { clock } from './project.js';

export default function Preview({
  project,
  time,
  total,
  playing,
  onPlay,
  onSeek,
}) {
  const canvas = useRef(null);
  const stage = useRef(null);
  const work = useRef(null);
  const latest = useRef(null);
  const busy = useRef(false);
  const [problem, setProblem] = useState('');
  const portrait = project.aspect === '9:16';

  useEffect(() => {
    latest.current = { project, time };
    async function paint() {
      if (busy.current) return;
      busy.current = true;
      try {
        while (latest.current && canvas.current) {
          const frame = latest.current;
          latest.current = null;
          const buffer = (work.current ??= document.createElement('canvas'));
          try {
            await renderFrame(buffer, frame.project, frame.time);
            const target = canvas.current;
            if (
              !target ||
              (latest.current && latest.current.project !== frame.project)
            )
              continue;
            if (
              target.width !== buffer.width ||
              target.height !== buffer.height
            ) {
              target.width = buffer.width;
              target.height = buffer.height;
            }
            target.getContext('2d').drawImage(buffer, 0, 0);
            setProblem('');
          } catch (error) {
            if (canvas.current)
              setProblem(error.message || '无法显示当前画面，请更换素材。');
          }
        }
      } finally {
        busy.current = false;
      }
    }
    void paint();
  }, [project, time]);

  return (
    <section className="panel preview" aria-label="成片预览">
      <div className="panel-head">
        <h2>
          <MonitorPlay />
          成片预览
        </h2>
        <span className="format-label">
          {portrait ? '720 × 1280' : '1280 × 720'}
        </span>
      </div>
      <div className={'stage' + (portrait ? ' portrait' : '')} ref={stage}>
        <canvas ref={canvas} aria-label="当前宣传片画面" />
        {problem && (
          <div className="frame-error" role="alert">
            {problem}
          </div>
        )}
      </div>
      <div className="transport">
        <button
          className="play"
          aria-label={playing ? '暂停预览' : '播放预览'}
          title={playing ? '暂停预览' : '播放预览'}
          onClick={onPlay}
        >
          {playing ? (
            <Pause fill="currentColor" />
          ) : (
            <Play fill="currentColor" />
          )}
        </button>
        <span className="time">
          {clock(time)} <span>/ {clock(total)}</span>
        </span>
        <input
          type="range"
          min="0"
          max={total}
          step="0.05"
          value={time}
          aria-label="预览进度"
          style={{ '--progress': (100 * time) / total + '%' }}
          onChange={(event) => onSeek(Number(event.target.value))}
        />
        <button
          className="icon-button"
          aria-label="回到片头"
          title="回到片头"
          onClick={() => onSeek(0)}
        >
          <RotateCcw />
        </button>
        {document.fullscreenEnabled && (
          <button
            className="icon-button expand"
            aria-label="全屏预览"
            title="全屏预览"
            onClick={() =>
              stage.current
                ?.requestFullscreen()
                .catch(() => setProblem('浏览器未允许全屏预览。'))
            }
          >
            <Maximize />
          </button>
        )}
      </div>
    </section>
  );
}

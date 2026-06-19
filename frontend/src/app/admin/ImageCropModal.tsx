'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './ImageCropModal.module.css';

type Aspect = '4:5' | '1:1' | '16:9';
type Bg = 'transparent' | 'white' | 'bone';

const ASPECTS: { key: Aspect; label: string; ratio: number }[] = [
  { key: '4:5', label: '4:5', ratio: 4 / 5 },
  { key: '1:1', label: '1:1', ratio: 1 },
  { key: '16:9', label: '16:9', ratio: 16 / 9 },
];

const BGS: { key: Bg; label: string; css: string }[] = [
  { key: 'transparent', label: 'Transparent', css: 'transparent' },
  { key: 'white', label: 'White', css: '#ffffff' },
  { key: 'bone', label: 'Bone', css: '#f4f2ed' },
];

/**
 * Resize & Pad modal — shrink the product inside a fixed-aspect frame and add
 * padding/whitespace around it (NOT a crop). Output is a full image of the
 * chosen aspect ratio with the scaled product centered on the chosen bg.
 *
 * "Product size" slider scales the product down (smaller = more padding).
 * Drag the product to reposition inside the frame.
 */
export default function ImageCropModal({
  src,
  onCancel,
  onApply,
  busy = false,
}: {
  src: string;
  onCancel: () => void;
  onApply: (blob: Blob) => void;
  busy?: boolean;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [aspect, setAspect] = useState<Aspect>('4:5');
  const [bg, setBg] = useState<Bg>('bone');
  const [scale, setScale] = useState(1);         // product size inside frame (0.3–3)
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 }); // product center, fraction of frame
  const [frameW, setFrameW] = useState(0);
  const drag = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  const ratio = ASPECTS.find(a => a.key === aspect)!.ratio;

  // Frame display dims (fit within stage). Width drives height via ratio.
  const recompute = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const maxW = stage.clientWidth - 36 - 24; // padding + Y-slider column
    const maxH = stage.clientHeight - 36;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    setFrameW(Math.max(0, w));
  }, [ratio]);

  useEffect(() => { recompute(); }, [recompute, aspect, loaded]);
  useEffect(() => {
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, [recompute]);

  const frameH = frameW / ratio;

  // Product displayed size: contain inside frame at scale=1, then * scale
  const productDisp = () => {
    const img = imgRef.current;
    if (!img || !frameW) return { w: 0, h: 0 };
    const fit = Math.min(frameW / img.naturalWidth, frameH / img.naturalHeight);
    return { w: img.naturalWidth * fit * scale, h: img.naturalHeight * fit * scale };
  };

  const onImgLoad = () => { setLoaded(true); recompute(); };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = (e.clientX - drag.current.sx) / frameW;
    const dy = (e.clientY - drag.current.sy) / frameH;
    setPos({
      x: Math.max(0, Math.min(1, drag.current.px + dx)),
      y: Math.max(0, Math.min(1, drag.current.py + dy)),
    });
  };
  const onPointerUp = () => { drag.current = null; };

  const apply = () => {
    const img = imgRef.current!;
    // Output canvas: fixed aspect, generous resolution
    const OUT_W = 1000;
    const OUT_H = Math.round(OUT_W / ratio);
    const canvas = document.createElement('canvas');
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext('2d')!;

    if (bg !== 'transparent') {
      ctx.fillStyle = BGS.find(b => b.key === bg)!.css;
      ctx.fillRect(0, 0, OUT_W, OUT_H);
    }

    // Product size in output px: contain-fit * scale
    const fit = Math.min(OUT_W / img.naturalWidth, OUT_H / img.naturalHeight);
    const pw = img.naturalWidth * fit * scale;
    const ph = img.naturalHeight * fit * scale;
    const cx = pos.x * OUT_W;
    const cy = pos.y * OUT_H;
    ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);

    // PNG keeps transparency; JPEG for solid bg (smaller)
    const type = bg === 'transparent' ? 'image/png' : 'image/jpeg';
    canvas.toBlob((blob) => { if (blob) onApply(blob); }, type, 0.92);
  };

  const pd = productDisp();

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.head}>
          <span className={styles.title}>Resize &amp; Pad</span>
          <button type="button" className={styles.close} onClick={onCancel} aria-label="Close">✕</button>
        </div>

        <div className={styles.controls}>
          <div className={styles.ctrlGroup}>
            <span className={styles.ctrlLabel}>Frame</span>
            <div className={styles.btnRow}>
              {ASPECTS.map(a => (
                <button key={a.key} type="button" className={`${styles.chip} ${aspect === a.key ? styles.chipActive : ''}`} onClick={() => setAspect(a.key)}>{a.label}</button>
              ))}
            </div>
          </div>
          <div className={styles.ctrlGroup}>
            <span className={styles.ctrlLabel}>Background</span>
            <div className={styles.btnRow}>
              {BGS.map(b => (
                <button key={b.key} type="button" className={`${styles.chip} ${bg === b.key ? styles.chipActive : ''}`} onClick={() => setBg(b.key)}>{b.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.sliderRow}>
          <span className={styles.ctrlLabel}>Product size</span>
          <input type="range" min={30} max={300} value={Math.round(scale * 100)} onChange={e => setScale(Number(e.target.value) / 100)} className={styles.slider} />
          <span className={styles.sliderVal}>{Math.round(scale * 100)}%</span>
          <button type="button" className={styles.resetBtn} onClick={() => { setScale(1); setPos({ x: 0.5, y: 0.5 }); }}>Reset</button>
        </div>

        <div className={styles.stage} ref={stageRef}>
          {loadError ? (
            <div className={styles.error}>
              Can&apos;t load this image (blocked by host).<br />Re-upload the file directly, then resize.
            </div>
          ) : (
            <div className={styles.stageInner}>
              <div
                ref={frameRef}
                className={styles.frame}
                data-bg={bg}
                style={{ width: frameW || undefined, height: frameH || undefined }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={src}
                  alt="resize source"
                  crossOrigin="anonymous"
                  onLoad={onImgLoad}
                  onError={() => setLoadError(true)}
                  className={styles.product}
                  draggable={false}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  style={loaded ? {
                    width: pd.w,
                    height: pd.h,
                    left: `${pos.x * 100}%`,
                    top: `${pos.y * 100}%`,
                  } : { visibility: 'hidden' }}
                />
                {loaded && <span className={styles.dragHint}>drag to reposition</span>}
              </div>
              {/* Vertical Y slider on the right of the frame */}
              {loaded && (
                <div className={styles.ySliderWrap} style={{ height: frameH || undefined }}>
                  <input
                    type="range" min={0} max={100}
                    value={Math.round(pos.y * 100)}
                    onChange={e => setPos(pp => ({ ...pp, y: Number(e.target.value) / 100 }))}
                    className={styles.ySlider}
                    aria-label="Vertical position"
                  />
                  <span className={styles.ySliderVal}>{Math.round(pos.y * 100)}%</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Horizontal X slider under the frame */}
        {loaded && !loadError && (
          <div className={styles.posRow}>
            <span className={styles.ctrlLabel}>Horizontal</span>
            <input
              type="range" min={0} max={100}
              value={Math.round(pos.x * 100)}
              onChange={e => setPos(pp => ({ ...pp, x: Number(e.target.value) / 100 }))}
              className={styles.slider}
              aria-label="Horizontal position"
            />
            <span className={styles.sliderVal}>{Math.round(pos.x * 100)}%</span>
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.btnGhost} onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={styles.btnPrimary} onClick={apply} disabled={busy || !loaded || loadError}>
            {busy ? 'Saving…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}

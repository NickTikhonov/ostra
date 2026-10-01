// @ts-check
import { clamp, random } from '../../audio/dsp.js';
const MAX_GRAINS = 32;
/** @param {number} position @param {number} start @param {number} end */
const wrap = (position, start, end) =>
  start + ((((position - start) % (end - start)) + (end - start)) % (end - start));
/** @param {Float32Array} channel @param {number} position */
function read(channel, position) {
  const n = Math.floor(position),
    f = position - n;
  return (channel[n] ?? 0) * (1 - f) + (channel[Math.min(n + 1, channel.length - 1)] ?? 0) * f;
}
const createState = () => ({
  asset: /** @type {import('../types').AudioAsset|null} */ (null),
  mode: -1,
  trigger: false,
  gate: false,
  pending: false,
  playing: false,
  pos: 0,
  progress: 0,
  endPulse: 0,
  spawn: 0,
  seed: 1937,
  grains: Array.from({ length: MAX_GRAINS }, () => ({
    pos: 0,
    age: 0,
    life: 0,
    rate: 1,
    start: 0,
    end: 2,
  })),
  window: Float32Array.from(
    { length: 1025 },
    (_, n) => 0.5 - 0.5 * Math.cos((n / 1024) * Math.PI * 2),
  ),
  amplitude: 0,
});
/** @satisfies {import('../types').ModuleProcessor<ReturnType<typeof createState>>} */
const processor = {
  createState,
  onEvent({ state: s }, event) {
    if (event === 'trigger') s.pending = true;
  },
  process({ params: p, inputs: i, connected: c, outputs: o, state: s, asset, sampleRate: sr }) {
    o.left = 0;
    o.right = 0;
    o.end = s.endPulse > 0 ? 5 : 0;
    if (s.endPulse > 0) s.endPulse--;
    const trigger = i.trigger > 1,
      gate = i.gate > 1,
      edge = (trigger && !s.trigger) || (gate && !s.gate) || s.pending;
    s.trigger = trigger;
    s.gate = gate;
    s.pending = false;
    if (asset !== s.asset) {
      s.asset = asset ?? null;
      s.playing = false;
      s.spawn = 0;
      s.amplitude = 0;
      for (const g of s.grains) g.life = 0;
    }
    if (!asset?.channels?.[0]?.length) return;
    const l = asset.channels[0],
      r = asset.channels[1] ?? l,
      frames = l.length;
    const start = Math.min(
      frames - 2,
      Math.floor(clamp(p.position + i.position / 5, 0, 1) * (frames - 1)),
    );
    const end = Math.min(frames, Math.max(start + 2, start + Math.round(p.length * frames)));
    const rate =
      ((Math.pow(2, clamp(p.tune / 12 + i.pitch, -5, 5)) * asset.sampleRate) / sr) *
      (p.reverse > 0.5 ? -1 : 1);
    const mode = Math.round(p.mode),
      enabled = !c.gate || gate;
    if (s.mode !== mode) {
      s.mode = mode;
      s.playing = false;
      s.spawn = 0;
      for (const g of s.grains) g.life = 0;
    }
    if (edge) {
      s.pos = rate < 0 ? end - 1 : start;
      s.playing = true;
      s.spawn = 0;
    }
    s.amplitude +=
      ((mode === 0 || enabled ? 1 : 0) - s.amplitude) * (1 - Math.exp(-1 / (sr * 0.003)));
    if (mode < 2) {
      if (mode === 1 && !s.playing && enabled) {
        s.pos = rate < 0 ? end - 1 : start;
        s.playing = true;
      }
      if (s.playing) {
        s.pos = clamp(s.pos, start, end - 1);
        const fade = Math.min(96, (end - start) / 4),
          envelope = Math.min(1, (s.pos - start) / fade, (end - 1 - s.pos) / fade);
        o.left = read(l, s.pos) * 5 * envelope * s.amplitude;
        o.right = read(r, s.pos) * 5 * envelope * s.amplitude;
        s.progress = s.pos / frames;
        s.pos += rate;
        if (s.pos >= end || s.pos < start) {
          s.endPulse = Math.round(sr * 0.008);
          if (mode === 1) s.pos = wrap(s.pos, start, end);
          else s.playing = false;
        }
      }
    } else {
      if (enabled) {
        if (s.spawn <= 0) {
          const g = s.grains.find((g) => g.life === 0);
          if (g) {
            g.life = Math.max(2, Math.round(p.grain * sr));
            g.age = 0;
            g.start = start;
            g.end = end;
            g.rate = rate;
            g.pos = wrap(
              (rate < 0 ? end - 1 : start) + (random(s) * 2 - 1) * p.spray * (end - start),
              start,
              end,
            );
          }
          s.spawn += sr / p.density;
        }
        s.spawn--;
      }
      let left = 0,
        right = 0,
        active = 0;
      for (const g of s.grains)
        if (g.life) {
          const w = s.window[Math.min(1024, Math.floor((g.age / (g.life - 1)) * 1024))];
          left += read(l, g.pos) * w;
          right += read(r, g.pos) * w;
          active++;
          g.pos = wrap(g.pos + g.rate, g.start, g.end);
          if (++g.age >= g.life) g.life = 0;
        }
      const gain = 5 / Math.max(1, p.density * p.grain * 0.5);
      o.left = clamp(left * gain * s.amplitude, -10, 10);
      o.right = clamp(right * gain * s.amplitude, -10, 10);
      s.playing = active > 0;
      s.progress = start / frames;
    }
  },
  getDisplayState: (s) => ({ loaded: !!s.asset, playing: s.playing, position: s.progress }),
};
export default processor;

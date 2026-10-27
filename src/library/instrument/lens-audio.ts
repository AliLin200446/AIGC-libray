import { TickGate } from './lens';
/** Short band-limited noise, never an oscillator, sample file or autoplay. */
export function createLensAudio() {
  const gate = new TickGate();
  let context: AudioContext | undefined;
  let enabled = true;
  let disposed = false;
  const sources = new Set<AudioBufferSourceNode>();
  function unlock(value: number) {
    if (!enabled || disposed) return;
    gate.sync(value); gate.armed = true;
    try { context ??= new AudioContext(); void context.resume().catch(() => {}); } catch { /* Audio is optional. */ }
  }
  function move(value: number) {
    const kind = gate.cross(value, performance.now());
    if (!enabled || !kind || !context || context.state !== 'running' || disposed) return;
    try {
      const major = kind === 'major';
      const duration = major ? .012 : .007;
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i=0; i<data.length; i++) data[i] = (Math.random()*2-1) * Math.exp(-i / (data.length*.16));
      const source = context.createBufferSource(); source.buffer = buffer;
      const filter = context.createBiquadFilter(); filter.type='bandpass'; filter.frequency.value=major?1700:2900; filter.Q.value=.65;
      const gain = context.createGain(); gain.gain.value=major?.055:.028;
      source.connect(filter).connect(gain).connect(context.destination);
      sources.add(source); source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();sources.delete(source);};
      source.start(); source.stop(context.currentTime+duration);
    } catch { /* A suspended or unavailable audio device must not affect optics. */ }
  }
  return { unlock, move, toggle() { enabled=!enabled; gate.armed=false; return enabled; }, dispose() { disposed=true;for(const source of sources)source.stop();sources.clear();void context?.close().catch(()=>{}); } };
}

import { Pack, RepeatMode, Track } from "../classes";
import { saveConfig } from "../config";
import { findMappedFiles, resolvePackFile, soundStem } from "../logic/resolveSound";
import { GlobalState } from "../state/GlobalState";

let gs: GlobalState | null = null;

let phase: "intro" | "main" = "main";
let userPaused = false;
// bag: songs not yet played this shuffle cycle (null = not started)
let bag: string[] | null = null;
let history: string[] = [];
let errorStreak = 0;
let gamepadUI = true;

// True when WE paused the music (game launch, desktop UI switch), so the next resume should fade in.
// Stays false at plugin load / track changes, so those start at full volume with no fade.
let suspendedByUs = false;
let fadeTimer: number | null = null;

const HISTORY_LIMIT = 50;
const RESTART_THRESHOLD_SECONDS = 3;
const RETRY_DELAY_MS = 2000;
const FADE_MS = 1500;
const FADE_STEP_MS = 25;
// A clock jump this big means the device slept (fallback if Steam's resume event is missing)
const SLEEP_GAP_MS = 10000;
const WAKE_RETRY_LIMIT = 6;

export function initMusicPlayer(state: GlobalState) {
  gs = state;
}

const st = () => gs!.getPublicState();
const set = (key: string, value: any) => gs!.setGlobalState(key, value);
const keyOf = (t: Track) => `${t.pack}::${t.file}`;
const audioEl = (): HTMLAudioElement | null => st().menuMusic;
const canPlay = () => gamepadUI && st().gamesRunning.length === 0;

function cancelFade() {
  if (fadeTimer !== null) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

// Level is squared so the fade sounds even; fading out and in mirror each other.
function fadeTo(a: HTMLAudioElement, target: 0 | 1, ms: number, done?: () => void) {
  cancelFade();
  const vol = () => st().musicVolume;
  const startLevel = vol() > 0 ? Math.sqrt(Math.min(1, a.volume / vol())) : target;
  const t0 = performance.now();
  fadeTimer = window.setInterval(() => {
    const p = Math.min(1, (performance.now() - t0) / ms);
    const level = startLevel + (target - startLevel) * p;
    a.volume = Math.max(0, Math.min(1, vol() * level * level));
    if (p >= 1) {
      cancelFade();
      done?.();
    }
  }, FADE_STEP_MS);
}

function fadeOutAndPause(a: HTMLAudioElement) {
  if (a.paused) return;
  suspendedByUs = true;
  fadeTo(a, 0, FADE_MS, () => {
    a.pause();
    a.volume = st().musicVolume;
  });
}

function fadeInAndPlay(a: HTMLAudioElement): Promise<void> {
  suspendedByUs = false;
  if (!a.paused) {
    fadeTo(a, 1, FADE_MS);
    return Promise.resolve();
  }
  cancelFade();
  a.volume = 0;
  return a
    .play()
    .then(() => {
      if (audioEl() === a) fadeTo(a, 1, FADE_MS);
    })
    .catch((e) => {
      a.volume = st().musicVolume;
      throw e;
    });
}

function resumeMusic() {
  const a = audioEl();
  if (!a || userPaused || !canPlay()) return;
  if (suspendedByUs) fadeInAndPlay(a).catch(() => {});
  else if (a.paused) a.play().catch(() => {});
}

export function setGamepadUI(active: boolean) {
  gamepadUI = active;
  const a = audioEl();
  if (!a) return;
  if (!active) fadeOutAndPause(a);
  else resumeMusic();
}

export function resumeAfterSleep() {
  let tries = 0;
  const attempt = () => {
    const a = audioEl();
    if (!a || userPaused || !canPlay() || !a.paused) return;
    if (a.error) a.load();
    fadeInAndPlay(a).catch(() => {
      if (++tries < WAKE_RETRY_LIMIT) setTimeout(attempt, 1000);
    });
  };
  setTimeout(attempt, 500);
}

export function watchForSleep(): () => void {
  // System isn't in our SteamClient typings, hence the any
  const reg = (SteamClient as any).System?.RegisterForOnResumeFromSuspend?.(() => resumeAfterSleep()) as
    | RegisteredEvent
    | undefined;
  let last = Date.now();
  const timer = window.setInterval(() => {
    const now = Date.now();
    if (now - last > SLEEP_GAP_MS) resumeAfterSleep();
    last = now;
  }, 5000);
  return () => {
    reg?.unregister();
    clearInterval(timer);
  };
}

export function getPackTracks(pack: Pack): Track[] {
  const mapped = findMappedFiles(pack, "menu_music.mp3");
  let files: string[];
  if (mapped) {
    files = Array.from(new Set(mapped));
  } else {
    const candidates = pack.files?.["menu_music"];
    files = [
      candidates && candidates.length > 0
      ? candidates.includes("menu_music.mp3")
      ? "menu_music.mp3"
      : candidates[0]
      : "menu_music.mp3",
    ];
  }
  return files.map((file) => ({
    pack: pack.name,
    file,
    label: files.length > 1 ? soundStem(file) : pack.name,
  }));
}

export function getQueue(): Track[] {
  return st()
  .soundPacks.filter((p) => p.music)
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name))
  .flatMap(getPackTracks);
}

const trackPath = (pack: Pack, file: string) =>
`/sounds_custom/${pack.truncatedPackPath || "error"}/${file}`;

function shuffled<T>(items: T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function disposeAudio() {
  cancelFade();
  suspendedByUs = false;
  const a = audioEl();
  if (a) {
    a.onended = null;
    a.onplay = null;
    a.onpause = null;
    a.onerror = null;
    a.onplaying = null;
    a.pause();
    a.currentTime = 0;
  }
  set("menuMusic", null);
  set("musicPlaying", false);
}

function exposeWindowObject(a: HTMLAudioElement) {
  // @ts-ignore
  window.AUDIOLOADER_MENUMUSIC = {
    play: a.play.bind(a),
    pause: a.pause.bind(a),
    origVolume: a.volume,
    setVolume: (value: number) => {
      a.volume = value;
    },
  };
}

function playTrack(track: Track, withIntro: boolean) {
  const pack = st().soundPacks.find((p) => p.name === track.pack);
  if (!pack) return;

  disposeAudio();
  userPaused = false;

  set("selectedMusic", track.pack);
  set("selectedTrack", track.file);
  set("currentTrack", track);

  const mainSrc = trackPath(pack, track.file);
  const useIntro = withIntro && pack.hasIntro;
  const introFile = resolvePackFile(pack, "intro_music.mp3") || "intro_music.mp3";

  const a = new Audio(useIntro ? trackPath(pack, introFile) : mainSrc);
  phase = useIntro ? "intro" : "main";
  a.volume = st().musicVolume;
  a.loop = phase === "main" && st().musicRepeat === "one";

  a.onplay = () => set("musicPlaying", true);
  a.onpause = () => set("musicPlaying", false);
  a.onplaying = () => {
    errorStreak = 0;
  };
  // The only place the song is saved: once it has genuinely started, so a failed load can't overwrite it
  a.addEventListener("playing", () => saveConfig(), { once: true });
  let retried = false;
  a.onended = () => {
    if (phase === "intro") {
      startMainPhase(a, mainSrc);
      return;
    }
    handleEnded();
  };
  a.onerror = () => {
    console.warn("OverTone: could not play", a.src);
    if (phase === "intro") {
      startMainPhase(a, mainSrc);
      return;
    }
    // The file may not be servable yet (e.g. right after boot): retry this song once before skipping it
    if (!retried) {
      retried = true;
      setTimeout(() => {
        if (audioEl() !== a) return;
        a.load();
        if (canPlay()) a.play().catch((e) => console.warn("OverTone: play() rejected", e));
      }, RETRY_DELAY_MS);
      return;
    }
    errorStreak++;
    if (errorStreak < getQueue().length) {
      const next = pickNext();
      if (next) {
        playTrack(next, packChanged(next));
        return;
      }
    }
    set("musicPlaying", false);
  };

  set("menuMusic", a);
  exposeWindowObject(a);

  if (canPlay()) {
    a.play().catch((e) => console.warn("OverTone: play() rejected", e));
  } else {
    suspendedByUs = true;
  }
}

function startMainPhase(a: HTMLAudioElement, mainSrc: string) {
  phase = "main";
  a.src = mainSrc;
  a.loop = st().musicRepeat === "one";
  a.play().catch((e) => console.warn("OverTone: play() rejected", e));
}

const packChanged = (next: Track) => st().currentTrack?.pack !== next.pack;

function pickNext(): Track | null {
  const queue = getQueue();
  if (queue.length === 0) return null;

  const cur = st().currentTrack;
  const curKey = cur ? keyOf(cur) : null;
  const { musicShuffle } = st();

  if (musicShuffle) {
    const valid = new Set(queue.map(keyOf));
    if (bag !== null) bag = bag.filter((k) => valid.has(k));

    if (bag === null || bag.length === 0) {
      const others = queue.map(keyOf).filter((k) => k !== curKey);
      bag = shuffled(others.length > 0 ? others : queue.map(keyOf));
    }
    const nextKey = bag.shift()!;
    return queue.find((t) => keyOf(t) === nextKey) ?? null;
  }

  const idx = curKey ? queue.findIndex((t) => keyOf(t) === curKey) : -1;
  if (idx === -1) return queue[0];
  if (idx + 1 < queue.length) return queue[idx + 1];
  return queue[0];
}

function handleEnded() {
  const cur = st().currentTrack;
  if (st().musicRepeat === "one" && cur) {
    const a = audioEl();
    if (a) {
      a.currentTime = 0;
      a.play().catch(() => {});
    }
    return;
  }
  const next = pickNext();
  if (!next) {
    set("musicPlaying", false);
    return;
  }
  rememberCurrent();
  playTrack(next, packChanged(next));
}

function rememberCurrent() {
  const cur = st().currentTrack;
  if (!cur) return;
  history.push(keyOf(cur));
  if (history.length > HISTORY_LIMIT) history.shift();
}

const musicActive = () => st().selectedMusic !== "None";

export function startPack(packName: string, trackFile?: string) {
  if (packName === "None") {
    stopMusic();
    set("selectedMusic", "None");
    set("selectedTrack", "");
    saveConfig();
    return;
  }
  const pack = st().soundPacks.find((p) => p.name === packName);
  if (!pack) {
    stopMusic();
    return;
  }
  const tracks = getPackTracks(pack);
  const track = tracks.find((t) => t.file === trackFile) ?? tracks[0];
  history = [];
  bag = null;
  playTrack(track, true);
}

export function startCurrent() {
  if (!musicActive()) return;
  startPack(st().selectedMusic, st().selectedTrack);
}

export function startRandomMusic() {
  const queue = getQueue();
  if (queue.length === 0) return;
  history = [];
  bag = null;
  playTrack(queue[Math.floor(Math.random() * queue.length)], true);
}

export function stopMusic() {
  disposeAudio();
  set("currentTrack", null);
  userPaused = false;
}

export function nextTrack() {
  if (!musicActive()) return;
  const next = pickNext();
  if (!next) return;
  rememberCurrent();
  playTrack(next, packChanged(next));
}

export function previousTrack() {
  if (!musicActive()) return;
  const a = audioEl();
  if (a && a.currentTime > RESTART_THRESHOLD_SECONDS) {
    a.currentTime = 0;
    return;
  }
  const queue = getQueue();
  if (queue.length === 0) return;
  const cur = st().currentTrack;

  let prev: Track | undefined;
  if (st().musicShuffle) {
    while (history.length > 0 && !prev) {
      const key = history.pop()!;
      prev = queue.find((t) => keyOf(t) === key);
    }
  } else {
    const idx = cur ? queue.findIndex((t) => keyOf(t) === keyOf(cur)) : -1;
    prev = idx > 0 ? queue[idx - 1] : queue[queue.length - 1];
  }

  if (!prev) {
    if (a) a.currentTime = 0;
    return;
  }
  playTrack(prev, packChanged(prev));
}

export function togglePlayPause() {
  if (!musicActive()) return;
  const a = audioEl();
  if (!a) {
    startCurrent();
    return;
  }
  cancelFade();
  suspendedByUs = false;
  a.volume = st().musicVolume;
  if (a.paused) {
    userPaused = false;
    if (canPlay()) a.play().catch(() => {});
  } else {
    userPaused = true;
    a.pause();
  }
}

export function setShuffle(on: boolean) {
  set("musicShuffle", on);
  bag = null;
  saveConfig();
}

export function setRepeat(mode: RepeatMode) {
  set("musicRepeat", mode);
  const a = audioEl();
  if (a && phase === "main") a.loop = mode === "one";
  saveConfig();
}

export function toggleRepeat() {
  setRepeat(st().musicRepeat === "one" ? "off" : "one");
}

export function setMusicVolume(value: number) {
  set("musicVolume", value);
  const a = audioEl();
  if (a && fadeTimer === null) a.volume = value;
  saveConfig();
}

export function pauseForGame() {
  const a = audioEl();
  if (a) fadeOutAndPause(a);
}

export function resumeAfterGame() {
  resumeMusic();
}

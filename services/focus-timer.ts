type Listener = (state: FocusTimerState) => void;

export type FocusTimerState = {
  remainingSeconds: number;
  running: boolean;
  startedAt: string | null;
  recorded: boolean;
  durationSeconds: number;
};

const DEFAULT_SECONDS = 25 * 60;

let remainingSeconds = DEFAULT_SECONDS;
let running = false;
let startedAt: Date | null = null;
let recorded = false;
let durationSeconds = DEFAULT_SECONDS;
let interval: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<Listener>();
let onComplete: ((started: Date, duration: number) => void) | null = null;

const snapshot = (): FocusTimerState => ({
  remainingSeconds,
  running,
  startedAt: startedAt?.toISOString() ?? null,
  recorded,
  durationSeconds,
});

const emit = () => {
  const state = snapshot();
  listeners.forEach((listener) => listener(state));
};

const clear = () => {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
};

const tick = () => {
  if (remainingSeconds <= 1) {
    remainingSeconds = 0;
    running = false;
    clear();
    if (startedAt && !recorded) {
      recorded = true;
      onComplete?.(startedAt, durationSeconds);
    }
    emit();
    return;
  }
  remainingSeconds -= 1;
  emit();
};

export const focusTimer = {
  DEFAULT_SECONDS,
  getState: snapshot,
  subscribe(listener: Listener) {
    listeners.add(listener);
    listener(snapshot());
    return () => {
      listeners.delete(listener);
    };
  },
  setOnComplete(handler: ((started: Date, duration: number) => void) | null) {
    onComplete = handler;
  },
  setDuration(seconds: number) {
    if (running) return;
    durationSeconds = seconds;
    remainingSeconds = seconds;
    emit();
  },
  start() {
    if (remainingSeconds <= 0) {
      remainingSeconds = durationSeconds;
      recorded = false;
      startedAt = new Date();
    } else if (!startedAt) {
      startedAt = new Date();
    }
    running = true;
    clear();
    interval = setInterval(tick, 1000);
    emit();
  },
  pause() {
    running = false;
    clear();
    emit();
  },
  reset() {
    running = false;
    remainingSeconds = durationSeconds;
    startedAt = null;
    recorded = false;
    clear();
    emit();
  },
};

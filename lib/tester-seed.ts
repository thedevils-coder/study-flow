import { TESTER_DISPLAY_NAME } from '@/lib/tester-core';
import type { AiKind, SessionType, TaskCategory } from '@/types';

export type TesterSeedTask = {
  title: string;
  scheduledAt: string;
  category: TaskCategory;
  completedAt: string | null;
};

export type TesterSeedGoal = {
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  dueAt: string;
};

export type TesterSeedSession = {
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  sessionType: SessionType;
};

export type TesterSeedAi = {
  kind: AiKind;
  prompt: string;
  resultText: string;
  createdAt: string;
};

export type TesterSeed = {
  displayName: string;
  tasks: TesterSeedTask[];
  goals: TesterSeedGoal[];
  sessions: TesterSeedSession[];
  ai: TesterSeedAi[];
};

const FOCUS_MINUTES = 25;
const FOCUS_SECONDS = FOCUS_MINUTES * 60;

function at(now: Date, dayOffset: number, hour: number, minute = 0) {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function iso(date: Date) {
  return date.toISOString();
}

function session(now: Date, dayOffset: number, hour: number, minute = 0): TesterSeedSession {
  const started = at(now, dayOffset, hour, minute);
  const ended = new Date(started.getTime() + FOCUS_SECONDS * 1000);
  return {
    startedAt: iso(started),
    endedAt: iso(ended),
    durationSeconds: FOCUS_SECONDS,
    sessionType: 'focus',
  };
}

export function buildTesterSeed(now = new Date()): TesterSeed {
  const dueSoon = at(now, 21, 18, 0);
  const dueLater = at(now, 45, 18, 0);

  const scheduleTasks = [
    {
      title: 'Revise electrostatics formulas',
      scheduledAt: iso(at(now, 1, 16, 0)),
      minutes: 45,
      reason: 'Keep formulas fresh before the weekly test.',
    },
    {
      title: 'Practice 10 calculus problems',
      scheduledAt: iso(at(now, 1, 19, 0)),
      minutes: 50,
      reason: 'Build speed on integrals.',
    },
    {
      title: 'History timeline recap',
      scheduledAt: iso(at(now, 2, 17, 30)),
      minutes: 30,
      reason: 'Light review the day after a heavier science block.',
    },
  ];

  return {
    displayName: TESTER_DISPLAY_NAME,
    tasks: [
      {
        title: 'Review physics formula sheet',
        scheduledAt: iso(at(now, 0, 8, 30)),
        category: 'study',
        completedAt: iso(at(now, 0, 9, 0)),
      },
      {
        title: 'Complete 8 organic chemistry questions',
        scheduledAt: iso(at(now, 0, 11, 0)),
        category: 'study',
        completedAt: iso(at(now, 0, 11, 40)),
      },
      {
        title: 'Focus block: calculus integrals',
        scheduledAt: iso(at(now, 0, 16, 0)),
        category: 'focus',
        completedAt: null,
      },
      {
        title: 'Short break and water',
        scheduledAt: iso(at(now, 0, 16, 30)),
        category: 'break',
        completedAt: null,
      },
      {
        title: 'Read History chapter 12',
        scheduledAt: iso(at(now, 1, 10, 0)),
        category: 'study',
        completedAt: null,
      },
      {
        title: 'Draft English literature notes',
        scheduledAt: iso(at(now, 1, 18, 0)),
        category: 'study',
        completedAt: null,
      },
      {
        title: 'Weekly mock test — Physics',
        scheduledAt: iso(at(now, 3, 9, 0)),
        category: 'focus',
        completedAt: null,
      },
      {
        title: 'Revise incorrect mock answers',
        scheduledAt: iso(at(now, 3, 15, 0)),
        category: 'study',
        completedAt: null,
      },
      {
        title: 'Plan next month’s revision cycle',
        scheduledAt: iso(at(now, 10, 19, 0)),
        category: 'study',
        completedAt: null,
      },
    ],
    goals: [
      {
        title: 'Finish Class 12 Physics revision',
        targetValue: 24,
        currentValue: 18,
        unit: 'hours',
        dueAt: iso(dueSoon),
      },
      {
        title: 'Solve 40 calculus problems',
        targetValue: 40,
        currentValue: 40,
        unit: 'problems',
        dueAt: iso(at(now, -2, 20, 0)),
      },
      {
        title: 'Read 10 History chapters',
        targetValue: 10,
        currentValue: 6,
        unit: 'chapters',
        dueAt: iso(dueLater),
      },
    ],
    sessions: [
      session(now, 0, 7, 15),
      session(now, 0, 15, 10),
      session(now, -1, 8, 0),
      session(now, -1, 19, 20),
      session(now, -2, 17, 40),
      session(now, -3, 7, 30),
      session(now, -3, 20, 5),
      session(now, -4, 18, 15),
      session(now, -5, 9, 0),
      session(now, -6, 16, 45),
      session(now, -8, 10, 0),
      session(now, -9, 19, 10),
      session(now, -10, 8, 20),
    ],
    ai: [
      {
        kind: 'notes',
        prompt: 'Create structured study notes on cell division.',
        createdAt: iso(at(now, -1, 21, 10)),
        resultText:
          'Cell division\n\n1. Mitosis: one parent cell → two identical daughter cells. Stages: prophase, metaphase, anaphase, telophase.\n2. Meiosis: produces four haploid gametes and increases variation.\n3. Checkpoints: G1, G2, and spindle assembly keep DNA intact.\n4. Revision cue: mitosis keeps chromosome number; meiosis halves it.',
      },
      {
        kind: 'summary',
        prompt: 'Summarize Newton’s three laws of motion for revision.',
        createdAt: iso(at(now, -2, 12, 40)),
        resultText:
          'Newton 1: an object stays at rest or in uniform motion unless a net force acts. Newton 2: F = ma. Newton 3: every action has an equal and opposite reaction. Use them together — identify forces, then acceleration, then the pair of interaction forces.',
      },
      {
        kind: 'leo',
        prompt: 'Leo, I have three chapters left and two days. How should I pace them?',
        createdAt: iso(at(now, -2, 21, 5)),
        resultText:
          'Split the two days into six focused blocks. Day 1: two harder chapters in the morning and afternoon, then a light recap at night. Day 2: the remaining chapter before noon, mixed questions in the afternoon, and a short formula/timeline review in the evening. Keep blocks to 25–50 minutes and write three recall questions after each chapter instead of rereading.',
      },
      {
        kind: 'schedule',
        prompt: 'Create a realistic study schedule for Physics, Calculus, and History.',
        createdAt: iso(at(now, -3, 18, 30)),
        resultText: `Proposed study plan for the next two days.\n${JSON.stringify(scheduleTasks, null, 2)}`,
      },
      {
        kind: 'flashcards',
        prompt: 'Create flashcards for Newton’s three laws of motion.',
        createdAt: iso(at(now, -4, 11, 15)),
        resultText:
          'Q: What does the first law describe?\nA: Inertia — motion stays the same without a net force.\n\nQ: Write the second law equation.\nA: F = ma.\n\nQ: What is the third law?\nA: Forces come in equal and opposite pairs.',
      },
    ],
  };
}

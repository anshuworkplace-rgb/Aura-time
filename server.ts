import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Optional Server-Side Gemini Client (Initialized only when GEMINI_API_KEY is present)
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Lightweight server-side account sync store (for optional account sync boundary)
interface SyncAccountRecord {
  accountId: string;
  email: string;
  passwordHash: string;
  salt: string;
  token: string;
  createdAt: string;
  updatedAt: string;
  settings?: Record<string, unknown>;
  sessions?: Array<Record<string, unknown> & { id: string }>;
  routines?: Array<Record<string, unknown> & { id: string }>;
}

const syncStore = new Map<string, SyncAccountRecord>();

function hashPassword(password: string, salt: string): string {
  return crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('hex');
}

function generateDeterministicTaskBreakdown(
  task: string,
  preferredMinutes: number
) {
  const cleanTask = task.trim() || 'Focused work session';
  const stepMins = preferredMinutes >= 15 && preferredMinutes <= 90 ? preferredMinutes : 25;
  return [
    {
      stepNumber: 1,
      title: `Scope & Core Materials: ${cleanTask}`,
      durationMinutes: Math.min(25, stepMins),
      recommendedSceneId: 'deep-current',
      recommendedChamberId: 'ocean-drift',
      rationale:
        'Start with a short, structured setup block to define clear boundaries and gather only the essential materials.',
    },
    {
      stepNumber: 2,
      title: `Primary Execution Block: ${cleanTask}`,
      durationMinutes: stepMins,
      recommendedSceneId: 'electric-quiet',
      recommendedChamberId: 'rain-chamber',
      rationale:
        'Dedicate your highest-focus window to the most demanding core problem or section without context switching.',
    },
    {
      stepNumber: 3,
      title: `Practice, Synthesis & Edge Cases: ${cleanTask}`,
      durationMinutes: stepMins,
      recommendedSceneId: 'chromatic-flow',
      recommendedChamberId: 'forest-echo',
      rationale:
        'Apply what you covered through active problem-solving, implementation, or drafting while momentum is steady.',
    },
    {
      stepNumber: 4,
      title: `Review, Verification & Next-Step Notes`,
      durationMinutes: 15,
      recommendedSceneId: 'night-signal',
      recommendedChamberId: 'celestial-tone',
      rationale:
        'Close with a concise 15-minute review to verify accuracy and leave a clear starting point for your next session.',
    },
  ];
}

function generateDeterministicWeeklyReflection(stats: {
  completedSessions: number;
  interruptedSessions: number;
  totalActualMinutes: number;
  mostUsedEnvironment: string;
  bestDayLabel: string;
  averageMinutes: number;
}) {
  if (stats.completedSessions === 0 && stats.interruptedSessions === 0) {
    return {
      summary:
        'You have not recorded any focus sessions this week yet. Starting with a single 25-minute session in your preferred environment is a calm way to establish your rhythm.',
      highlights: [
        'No sessions logged in the current 7-day window.',
        'Select any preset duration on the Focus stage to begin.',
      ],
    };
  }

  const hours = Math.floor(stats.totalActualMinutes / 60);
  const mins = stats.totalActualMinutes % 60;
  const durationText =
    hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim() : `${mins}m`;

  return {
    summary: `You completed ${stats.completedSessions} focus session${
      stats.completedSessions === 1 ? '' : 's'
    } totaling ${durationText} of actual focused work this week. Your most-used environment was ${
      stats.mostUsedEnvironment || 'Deep Current'
    }, and your strongest focus rhythm was on ${
      stats.bestDayLabel || 'your active days'
    } with an average session length of ${stats.averageMinutes || 25} minutes.`,
    highlights: [
      `${stats.completedSessions} completed vs ${stats.interruptedSessions} interrupted session${
        stats.interruptedSessions === 1 ? '' : 's'
      } recorded honestly.`,
      `Average actual session duration: ${stats.averageMinutes || 25} minutes.`,
      `Primary sanctuary atmosphere: ${stats.mostUsedEnvironment || 'Deep Current'}.`,
    ],
  };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '512kb' }));

  // ---------------------------------------------------------------------------
  // 1. Health & Capability Status Endpoint
  // ---------------------------------------------------------------------------
  app.get('/api/health', (_req, res) => {
    const aiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
    const paymentConfigured = Boolean(
      process.env.RAZORPAY_KEY_ID?.trim() &&
        process.env.RAZORPAY_KEY_SECRET?.trim()
    );
    const externalCloudConfigured = Boolean(
      process.env.FIREBASE_PROJECT_ID?.trim() ||
        process.env.SUPABASE_URL?.trim()
    );

    res.json({
      status: 'ok',
      capabilities: {
        aiServerReady: aiConfigured,
        aiModel: 'gemini-4-hydrogen',
        accountSyncBoundaryReady: true,
        externalCloudDatabaseConfigured: externalCloudConfigured,
        paymentGatewayConfigured: paymentConfigured,
        paymentProviderTarget: 'razorpay_india_pending_keys',
      },
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Optional AI Weekly Focus Reflection Endpoint (Consent-Gated)
  // ---------------------------------------------------------------------------
  app.post('/api/ai/weekly-reflection', async (req, res) => {
    try {
      const { aiConsent, stats } = req.body ?? {};
      if (!aiConsent) {
        return res.status(403).json({
          error:
            'Explicit AI processing consent is required before generating AI reflections.',
        });
      }

      const safeStats = {
        completedSessions: Number(stats?.completedSessions ?? 0),
        interruptedSessions: Number(stats?.interruptedSessions ?? 0),
        totalActualMinutes: Number(stats?.totalActualMinutes ?? 0),
        mostUsedEnvironment: String(
          stats?.mostUsedEnvironment ?? 'Deep Current'
        ).slice(0, 60),
        bestDayLabel: String(stats?.bestDayLabel ?? 'None').slice(0, 40),
        averageMinutes: Number(stats?.averageMinutes ?? 0),
      };

      const ai = getGeminiClient();
      if (!ai) {
        const fallback = generateDeterministicWeeklyReflection(safeStats);
        return res.json({
          source: 'deterministic_rule_engine',
          aiUsed: false,
          note: 'Generated locally via deterministic rules (server GEMINI_API_KEY not configured).',
          ...fallback,
        });
      }

      const prompt = `Generate a calm, factual 2-3 sentence weekly focus reflection and 3 short bullet highlights strictly from these verified user statistics:
- Completed sessions: ${safeStats.completedSessions}
- Interrupted sessions: ${safeStats.interruptedSessions}
- Total actual focused minutes: ${safeStats.totalActualMinutes}
- Average session length: ${safeStats.averageMinutes} minutes
- Most-used environment: ${safeStats.mostUsedEnvironment}
- Highest-focus day: ${safeStats.bestDayLabel}

Rules:
1. Do NOT invent any statistics or numbers not listed above.
2. Do NOT make medical, psychological, or clinical claims.
3. Keep the tone calm, grounded, and encouraging.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are Aura Intelligence, a calm, factual reflection engine for the Aura Time focus sanctuary. Never fabricate numbers or make clinical claims.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description:
                  'A calm 2-3 sentence reflection based strictly on the provided numbers.',
              },
              highlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 concise factual highlights from the week.',
              },
            },
            required: ['summary', 'highlights'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({
        source: 'gemini',
        aiUsed: true,
        summary:
          parsed.summary ||
          generateDeterministicWeeklyReflection(safeStats).summary,
        highlights: Array.isArray(parsed.highlights)
          ? parsed.highlights.slice(0, 4)
          : generateDeterministicWeeklyReflection(safeStats).highlights,
      });
    } catch {
      const safeStats = {
        completedSessions: Number(req.body?.stats?.completedSessions ?? 0),
        interruptedSessions: Number(req.body?.stats?.interruptedSessions ?? 0),
        totalActualMinutes: Number(req.body?.stats?.totalActualMinutes ?? 0),
        mostUsedEnvironment: String(
          req.body?.stats?.mostUsedEnvironment ?? 'Deep Current'
        ).slice(0, 60),
        bestDayLabel: String(req.body?.stats?.bestDayLabel ?? 'None').slice(
          0,
          40
        ),
        averageMinutes: Number(req.body?.stats?.averageMinutes ?? 0),
      };
      const fallback = generateDeterministicWeeklyReflection(safeStats);
      return res.json({
        source: 'deterministic_rule_engine',
        aiUsed: false,
        note: 'AI service unavailable; showing deterministic rule-based reflection.',
        ...fallback,
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Optional AI Task Breakdown Endpoint (Consent-Gated + Deterministic Fallback)
  // ---------------------------------------------------------------------------
  app.post('/api/ai/task-breakdown', async (req, res) => {
    try {
      const { task, preferredMinutes = 25, aiConsent = false } = req.body ?? {};
      const cleanTask = String(task ?? '').trim().slice(0, 180);
      if (!cleanTask) {
        return res
          .status(400)
          .json({ error: 'Please enter a task or goal to break down.' });
      }

      const prefMins = Math.max(15, Math.min(90, Number(preferredMinutes) || 25));
      const ai = aiConsent ? getGeminiClient() : null;

      if (!ai) {
        return res.json({
          source: 'deterministic_rule_engine',
          aiUsed: false,
          task: cleanTask,
          steps: generateDeterministicTaskBreakdown(cleanTask, prefMins),
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Break down the user's goal "${cleanTask}" into 4 manageable focus sessions (around ${prefMins} minutes each).
Allowed recommendedSceneId values: "deep-current", "chromatic-flow", "night-signal", "electric-quiet", "solar-drift".
Allowed recommendedChamberId values: "rain-chamber", "ocean-drift", "forest-echo", "cosmic-silence", "ember-glow", "celestial-tone".`,
        config: {
          systemInstruction:
            'You break user study, programming, design, or writing goals into 4 clear, actionable focus sessions. Never make medical claims.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stepNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    durationMinutes: { type: Type.INTEGER },
                    recommendedSceneId: { type: Type.STRING },
                    recommendedChamberId: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                  },
                  required: [
                    'stepNumber',
                    'title',
                    'durationMinutes',
                    'recommendedSceneId',
                    'recommendedChamberId',
                    'rationale',
                  ],
                },
              },
            },
            required: ['steps'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const steps = Array.isArray(parsed.steps) && parsed.steps.length > 0
        ? parsed.steps.slice(0, 5)
        : generateDeterministicTaskBreakdown(cleanTask, prefMins);

      return res.json({
        source: 'gemini',
        aiUsed: true,
        task: cleanTask,
        steps,
      });
    } catch {
      const cleanTask = String(req.body?.task ?? 'Focus task')
        .trim()
        .slice(0, 180);
      const prefMins = Math.max(
        15,
        Math.min(90, Number(req.body?.preferredMinutes) || 25)
      );
      return res.json({
        source: 'deterministic_rule_engine',
        aiUsed: false,
        task: cleanTask,
        steps: generateDeterministicTaskBreakdown(cleanTask, prefMins),
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Optional Account & Synchronization Boundary (/api/sync/*)
  // ---------------------------------------------------------------------------
  app.post('/api/sync/register', (req, res) => {
    const email = String(req.body?.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters.' });
    }
    if (syncStore.has(email)) {
      return res
        .status(409)
        .json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date().toISOString();
    const record: SyncAccountRecord = {
      accountId: `acct_${crypto.randomBytes(8).toString('hex')}`,
      email,
      passwordHash,
      salt,
      token,
      createdAt: now,
      updatedAt: now,
      sessions: [],
      routines: [],
    };
    syncStore.set(email, record);
    return res.json({
      accountId: record.accountId,
      email: record.email,
      token: record.token,
      updatedAt: record.updatedAt,
    });
  });

  app.post('/api/sync/login', (req, res) => {
    const email = String(req.body?.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? '');
    const record = syncStore.get(email);
    if (!record || hashPassword(password, record.salt) !== record.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    record.token = crypto.randomBytes(32).toString('hex');
    record.updatedAt = new Date().toISOString();
    return res.json({
      accountId: record.accountId,
      email: record.email,
      token: record.token,
      updatedAt: record.updatedAt,
      settings: record.settings,
      sessions: record.sessions ?? [],
      routines: record.routines ?? [],
    });
  });

  app.post('/api/sync/push', (req, res) => {
    const authHeader = String(req.headers.authorization ?? '');
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token.' });
    }

    const record = Array.from(syncStore.values()).find((r) => r.token === token);
    if (!record) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    // Deduplicate sessions by id (conflict-free union)
    const incomingSessions = Array.isArray(req.body?.sessions)
      ? req.body.sessions
      : [];
    const mergedMap = new Map<string, Record<string, unknown> & { id: string }>();
    for (const existing of record.sessions ?? []) {
      if (existing && typeof existing.id === 'string') {
        mergedMap.set(existing.id, existing);
      }
    }
    for (const item of incomingSessions) {
      if (item && typeof item.id === 'string' && !String(item.id).startsWith('seed-')) {
        mergedMap.set(item.id, item);
      }
    }
    record.sessions = Array.from(mergedMap.values());
    if (req.body?.settings && typeof req.body.settings === 'object') {
      record.settings = req.body.settings;
    }
    if (Array.isArray(req.body?.routines)) {
      record.routines = req.body.routines;
    }
    record.updatedAt = new Date().toISOString();

    return res.json({
      status: 'synced',
      updatedAt: record.updatedAt,
      syncedSessionsCount: record.sessions.length,
      sessions: record.sessions,
      settings: record.settings,
      routines: record.routines,
    });
  });

  app.delete('/api/sync/account', (req, res) => {
    const authHeader = String(req.headers.authorization ?? '');
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';
    const record = Array.from(syncStore.values()).find((r) => r.token === token);
    if (!record) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }
    syncStore.delete(record.email);
    return res.json({ status: 'deleted' });
  });

  // ---------------------------------------------------------------------------
  // 5. Vite Dev Middleware / Static Production Assets
  // ---------------------------------------------------------------------------
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Production build not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AURA TIME Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

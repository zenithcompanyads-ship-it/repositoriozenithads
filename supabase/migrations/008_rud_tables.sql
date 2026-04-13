-- ============================================
-- RUD PERSONAL OS - COMPLETE SCHEMA
-- ============================================

-- TASKS
CREATE TABLE IF NOT EXISTS rud_tasks (
  id BIGINT PRIMARY KEY DEFAULT gen_random_uuid()::bigint,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'work', -- work, personal, health, urgent
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HABITS
CREATE TABLE IF NOT EXISTS rud_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rud_habit_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES rud_habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL, -- YYYY-MM-DD
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_id, habit_id, date)
);

-- ROUTINE (Daily Routine)
CREATE TABLE IF NOT EXISTS rud_routine_blocks (
  id BIGINT PRIMARY KEY DEFAULT gen_random_uuid()::bigint,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_index INT NOT NULL, -- 0-6 for Mon-Sun
  title TEXT NOT NULL,
  time_block TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rud_routine_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  block_id BIGINT NOT NULL REFERENCES rud_routine_blocks(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_id, block_id, date)
);

-- MEETINGS
CREATE TABLE IF NOT EXISTS rud_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  description TEXT,
  calendar_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NOTES
CREATE TABLE IF NOT EXISTS rud_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BIG WINS
CREATE TABLE IF NOT EXISTS rud_bigwins (
  id BIGINT PRIMARY KEY DEFAULT gen_random_uuid()::bigint,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'negocio', -- negocio, cliente, financeiro, pessoal, saude, aprendizado, criativo
  impact TEXT DEFAULT 'small', -- small, medium, big, epic
  status TEXT DEFAULT 'planning', -- planning, doing, done, paused
  date TEXT, -- YYYY-MM-DD
  steps JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DIET
CREATE TABLE IF NOT EXISTS rud_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL, -- YYYY-MM-DD
  meal_type TEXT NOT NULL, -- breakfast, lunch, snack, dinner
  description TEXT,
  calories INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_id, date, meal_type)
);

CREATE TABLE IF NOT EXISTS rud_water (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL, -- YYYY-MM-DD
  cups INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_id, date)
);

-- WORKOUTS
CREATE TABLE IF NOT EXISTS rud_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL, -- YYYY-MM-DD
  workout_data JSONB, -- {type, duration, exercises, etc}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_id, date)
);

-- DAY TASKS (Weekly view)
CREATE TABLE IF NOT EXISTS rud_day_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL, -- YYYY-MM-DD
  title TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- low, normal, high
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GOALS (Monthly objectives)
CREATE TABLE IF NOT EXISTS rud_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  month TEXT, -- YYYY-MM
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TIMER SESSIONS (Focus Timer)
CREATE TABLE IF NOT EXISTS rud_timer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL, -- YYYY-MM-DD
  duration INT NOT NULL, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DOCS (Google Docs integration)
CREATE TABLE IF NOT EXISTS rud_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  doc_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rud_tasks_admin ON rud_tasks(admin_id);
CREATE INDEX IF NOT EXISTS idx_rud_habits_admin ON rud_habits(admin_id);
CREATE INDEX IF NOT EXISTS idx_rud_habit_state_date ON rud_habit_state(admin_id, date);
CREATE INDEX IF NOT EXISTS idx_rud_routine_state_date ON rud_routine_state(admin_id, date);
CREATE INDEX IF NOT EXISTS idx_rud_meetings_admin ON rud_meetings(admin_id);
CREATE INDEX IF NOT EXISTS idx_rud_notes_admin ON rud_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_rud_bigwins_admin ON rud_bigwins(admin_id);
CREATE INDEX IF NOT EXISTS idx_rud_meals_date ON rud_meals(admin_id, date);
CREATE INDEX IF NOT EXISTS idx_rud_water_date ON rud_water(admin_id, date);
CREATE INDEX IF NOT EXISTS idx_rud_workouts_date ON rud_workouts(admin_id, date);
CREATE INDEX IF NOT EXISTS idx_rud_day_tasks_date ON rud_day_tasks(admin_id, date);
CREATE INDEX IF NOT EXISTS idx_rud_goals_month ON rud_goals(admin_id);
CREATE INDEX IF NOT EXISTS idx_rud_timer_date ON rud_timer_sessions(admin_id, date);
CREATE INDEX IF NOT EXISTS idx_rud_docs_admin ON rud_docs(admin_id);

-- Enable RLS
ALTER TABLE rud_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rud_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rud_habit_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE rud_routine_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rud_routine_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE rud_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rud_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rud_bigwins ENABLE ROW LEVEL SECURITY;
ALTER TABLE rud_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rud_water ENABLE ROW LEVEL SECURITY;
ALTER TABLE rud_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rud_day_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rud_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rud_timer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rud_docs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their own data)
DROP POLICY IF EXISTS "Users can view own rud data" ON rud_tasks;
CREATE POLICY "Users can view own rud data" ON rud_tasks FOR SELECT USING (admin_id = auth.uid());
CREATE POLICY "Users can insert own rud data" ON rud_tasks FOR INSERT WITH CHECK (admin_id = auth.uid());
CREATE POLICY "Users can update own rud data" ON rud_tasks FOR UPDATE USING (admin_id = auth.uid());
CREATE POLICY "Users can delete own rud data" ON rud_tasks FOR DELETE USING (admin_id = auth.uid());

-- Apply same policies to all other tables
DROP POLICY IF EXISTS "Users can manage own habits" ON rud_habits;
CREATE POLICY "Users can manage own habits" ON rud_habits FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own habit state" ON rud_habit_state;
CREATE POLICY "Users can manage own habit state" ON rud_habit_state FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own routine blocks" ON rud_routine_blocks;
CREATE POLICY "Users can manage own routine blocks" ON rud_routine_blocks FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own routine state" ON rud_routine_state;
CREATE POLICY "Users can manage own routine state" ON rud_routine_state FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own meetings" ON rud_meetings;
CREATE POLICY "Users can manage own meetings" ON rud_meetings FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own notes" ON rud_notes;
CREATE POLICY "Users can manage own notes" ON rud_notes FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own bigwins" ON rud_bigwins;
CREATE POLICY "Users can manage own bigwins" ON rud_bigwins FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own meals" ON rud_meals;
CREATE POLICY "Users can manage own meals" ON rud_meals FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own water" ON rud_water;
CREATE POLICY "Users can manage own water" ON rud_water FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own workouts" ON rud_workouts;
CREATE POLICY "Users can manage own workouts" ON rud_workouts FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own day tasks" ON rud_day_tasks;
CREATE POLICY "Users can manage own day tasks" ON rud_day_tasks FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own goals" ON rud_goals;
CREATE POLICY "Users can manage own goals" ON rud_goals FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own timer sessions" ON rud_timer_sessions;
CREATE POLICY "Users can manage own timer sessions" ON rud_timer_sessions FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own docs" ON rud_docs;
CREATE POLICY "Users can manage own docs" ON rud_docs FOR ALL USING (admin_id = auth.uid());

-- ═══════════════════════════════════════════
--  RONDA — Supabase Database Schema
-- ═══════════════════════════════════════════

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT DEFAULT '',
  city TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  intention TEXT DEFAULT '',
  emoji TEXT DEFAULT '🌸',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Habits
CREATE TABLE IF NOT EXISTS habits (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  dim TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own habits" ON habits FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_habits_user ON habits(user_id);

-- Habit Checks (daily check-offs, stored as JSON per day)
CREATE TABLE IF NOT EXISTS habit_checks (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  checked_data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

ALTER TABLE habit_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own checks" ON habit_checks FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_checks_user_date ON habit_checks(user_id, date);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  text TEXT NOT NULL,
  mood INTEGER DEFAULT 2,
  time TEXT DEFAULT '',
  entry_type TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own journal" ON journal_entries FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_journal_user ON journal_entries(user_id);
CREATE INDEX idx_journal_date ON journal_entries(user_id, date);

-- Toolkit Items
CREATE TABLE IF NOT EXISTS toolkit_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT DEFAULT '',
  cat TEXT NOT NULL,
  note TEXT DEFAULT '',
  added TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE toolkit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own toolkit" ON toolkit_items FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_toolkit_user ON toolkit_items(user_id);

-- Active Programs
CREATE TABLE IF NOT EXISTS active_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  program_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  completed_days INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE active_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own programs" ON active_programs FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_programs_user ON active_programs(user_id);

-- Favorite Quotes
CREATE TABLE IF NOT EXISTS fav_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quote_index INTEGER NOT NULL
);

ALTER TABLE fav_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own fav quotes" ON fav_quotes FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_favquotes_user ON fav_quotes(user_id);

-- Streaks (stored as JSON per user)
CREATE TABLE IF NOT EXISTS streaks (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  streak_data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own streaks" ON streaks FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════
--  Function to auto-create profile on signup
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════
--  BOARD — Bulletin Board 24/7
-- ═══════════════════════════════════════════

-- Professionals (verified therapists, coaches, etc.)
CREATE TABLE IF NOT EXISTS professionals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL, -- "Psicóloga clínica", "Coach de bienestar"
  specialty TEXT[] DEFAULT '{}', -- ['ansiedad','depresion','relaciones']
  bio TEXT DEFAULT '',
  verified BOOLEAN DEFAULT FALSE,
  photo_url TEXT DEFAULT '',
  city TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view verified professionals" ON professionals FOR SELECT USING (verified = TRUE);
CREATE POLICY "Professionals can manage own profile" ON professionals FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_professionals_verified ON professionals(verified);

-- Board posts (anonymous by default)
CREATE TABLE IF NOT EXISTS board_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL, -- ansiedad, relaciones, maternidad, autoestima, duelo, emprendimiento, general
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view board posts" ON board_posts FOR SELECT USING (TRUE);
CREATE POLICY "Users can create posts" ON board_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON board_posts FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_board_posts_cat ON board_posts(category);
CREATE INDEX idx_board_posts_date ON board_posts(created_at DESC);

-- Board replies (only from verified professionals)
CREATE TABLE IF NOT EXISTS board_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES board_posts(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES professionals(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE board_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view replies" ON board_replies FOR SELECT USING (TRUE);
CREATE POLICY "Professionals can reply" ON board_replies FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM professionals WHERE id = professional_id AND user_id = auth.uid() AND verified = TRUE)
);
CREATE INDEX idx_board_replies_post ON board_replies(post_id);

-- Board hearts (support without words)
CREATE TABLE IF NOT EXISTS board_hearts (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES board_posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE board_hearts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage hearts" ON board_hearts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view heart counts" ON board_hearts FOR SELECT USING (TRUE);

-- Players
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Characters (each player can have one active character)
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'retired')),
  retired_reason TEXT,
  current_chapter INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  retired_at TIMESTAMPTZ
);

-- Stories (admin creates these)
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chapters (admin adds these per story)
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  win_condition TEXT NOT NULL,
  fail_condition TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game Sessions
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  story_id UUID REFERENCES stories(id),
  chapter_id UUID REFERENCES chapters(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Conversation History
CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
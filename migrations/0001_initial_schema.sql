-- Initial schema for CCSF Tutoring AI Agent
-- Cloudflare D1 Database Migration

-- Tutors table
CREATE TABLE IF NOT EXISTS tutors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  pronouns TEXT,
  bio TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('online', 'on campus')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tutor-Skills junction table
CREATE TABLE IF NOT EXISTS tutor_skills (
  tutor_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  PRIMARY KEY (tutor_id, skill_id),
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Availability table
CREATE TABLE IF NOT EXISTS availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tutor_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  time TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('online', 'on campus')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tutor_skills_tutor_id ON tutor_skills(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_skills_skill_id ON tutor_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_availability_tutor_id ON availability(tutor_id);
CREATE INDEX IF NOT EXISTS idx_availability_day ON availability(day);


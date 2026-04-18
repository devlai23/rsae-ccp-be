CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) NOT NULL UNIQUE,
  username     VARCHAR(50)  NOT NULL UNIQUE,
  email        VARCHAR(255) NOT NULL UNIQUE,
  firstname    VARCHAR(100) DEFAULT NULL,
  lastname     VARCHAR(100) DEFAULT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposals (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  category     VARCHAR(120) NOT NULL,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  description  TEXT NOT NULL,
  votes        INTEGER NOT NULL DEFAULT 0,
  submitted_by VARCHAR(150) NOT NULL DEFAULT 'Anonymous Resident',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status       VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposal_comments (
  id           SERIAL PRIMARY KEY,
  proposal_id  INTEGER NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  author       VARCHAR(150) NOT NULL,
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal_id ON proposal_comments(proposal_id);

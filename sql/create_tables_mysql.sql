-- AWS RDS / MySQL
-- Run this after connecting to your RDS instance

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  firebase_uid  VARCHAR(128) NOT NULL,
  username      VARCHAR(50)  NOT NULL,
  email         VARCHAR(255) NOT NULL,
  firstname     VARCHAR(100) DEFAULT NULL,
  lastname      VARCHAR(100) DEFAULT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY idx_firebase_uid (firebase_uid),
  UNIQUE KEY idx_username     (username),
  UNIQUE KEY idx_email        (email)
);

CREATE TABLE IF NOT EXISTS proposals (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  category      VARCHAR(120) NOT NULL,
  tags          JSON NULL,
  description   TEXT NOT NULL,
  votes         INT NOT NULL DEFAULT 0,
  submitted_by  VARCHAR(150) NOT NULL DEFAULT 'Anonymous Resident',
  submitted_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status        VARCHAR(50)  NOT NULL DEFAULT 'pending',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id     INT NOT NULL,
  author_uid      VARCHAR(128) DEFAULT NULL,
  author_display  VARCHAR(150) NOT NULL DEFAULT 'Anonymous Resident',
  body            TEXT NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      DATETIME DEFAULT NULL,
  deleted_by_uid  VARCHAR(128) DEFAULT NULL,

  INDEX idx_comments_proposal_created (proposal_id, created_at),
  CONSTRAINT fk_comments_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  actor_uid    VARCHAR(128) DEFAULT NULL,
  actor_email  VARCHAR(255) DEFAULT NULL,
  actor_role   VARCHAR(40) DEFAULT NULL,
  action_type  VARCHAR(80) NOT NULL,
  entity_type  VARCHAR(40) NOT NULL,
  entity_id    VARCHAR(128) DEFAULT NULL,
  metadata     JSON NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_audit_logs_created (created_at),
  INDEX idx_audit_logs_action (action_type)
);

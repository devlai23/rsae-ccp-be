-- Existing MySQL databases: run once to enable voting + anti-spam tracking.

CREATE TABLE IF NOT EXISTS proposal_votes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id   INT NOT NULL,
  voter_id      VARCHAR(64) NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_proposal_voter (proposal_id, voter_id),
  CONSTRAINT fk_proposal_votes_proposal
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
);

CREATE INDEX idx_proposal_votes_voter_id ON proposal_votes (voter_id);

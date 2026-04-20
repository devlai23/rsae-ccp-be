-- Table to track individual user votes on proposals
CREATE TABLE IF NOT EXISTS proposal_votes (
  id           SERIAL PRIMARY KEY,
  proposal_id  INTEGER NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type    VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(proposal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_proposal_votes_proposal_id ON proposal_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_votes_user_id ON proposal_votes(user_id);

-- Function to recalculate votes count when a vote changes
CREATE OR REPLACE FUNCTION recalculate_proposal_votes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE proposals
  SET votes = (
    SELECT COALESCE(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE -1 END), 0)
    FROM proposal_votes
    WHERE proposal_id = COALESCE(NEW.proposal_id, OLD.proposal_id)
  )
  WHERE id = COALESCE(NEW.proposal_id, OLD.proposal_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update votes count
CREATE TRIGGER proposal_votes_insert_trigger
AFTER INSERT ON proposal_votes
FOR EACH ROW EXECUTE FUNCTION recalculate_proposal_votes();

CREATE TRIGGER proposal_votes_update_trigger
AFTER UPDATE ON proposal_votes
FOR EACH ROW EXECUTE FUNCTION recalculate_proposal_votes();

CREATE TRIGGER proposal_votes_delete_trigger
AFTER DELETE ON proposal_votes
FOR EACH ROW EXECUTE FUNCTION recalculate_proposal_votes();

-- Recalculate existing votes
UPDATE proposals
SET votes = COALESCE(
  (SELECT SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE -1 END)
   FROM proposal_votes
   WHERE proposal_id = proposals.id),
  0
);

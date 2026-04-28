-- Ensure only one review per (user, product)
-- This migration:
-- 1) Deduplicates existing rows by keeping the newest review per (user_id, product_id)
-- 2) Reattaches Review_Replies to the kept review
-- 3) Adds a unique index to enforce the rule

-- 1) Build a mapping from each review -> canonical review to keep
CREATE TEMPORARY TABLE tmp_review_dedup AS
SELECT
  id,
  FIRST_VALUE(id) OVER (
    PARTITION BY user_id, product_id
    ORDER BY updated_at DESC, created_at DESC, id DESC
  ) AS keep_id
FROM Reviews;

-- 2) Move replies from duplicate reviews onto the kept review
UPDATE Review_Replies rr
JOIN tmp_review_dedup d ON d.id = rr.review_id
SET rr.review_id = d.keep_id
WHERE d.id <> d.keep_id;

-- 3) Delete duplicate reviews (keep only canonical)
DELETE r
FROM Reviews r
JOIN tmp_review_dedup d ON d.id = r.id
WHERE d.id <> d.keep_id;

DROP TEMPORARY TABLE tmp_review_dedup;

-- 4) Enforce uniqueness at the DB level
ALTER TABLE Reviews
  ADD UNIQUE INDEX uniq_reviews_user_product (user_id, product_id);

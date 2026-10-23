-- Discover matches what a user has against recipe ingredients by a match key. The database
-- computes the key, so the stored keys and the keys of search terms always use the same rules.

-- The key of an ingredient name: lowercase, common accents removed, punctuation and repeated
-- spaces turned into single spaces, then in each word longer than 3 letters, in this order:
-- a final -s is dropped (not -ss), a final -e is dropped, and a final -y becomes -i.
-- So "Cherry Tomatoes" and "cherry tomato" both become "cherri tomato", and "olives" and
-- "olive" both become "oliv". Keys are only compared, never shown.
CREATE FUNCTION ingredient_match_key(name TEXT) RETURNS TEXT
LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE
AS $$
  SELECT string_agg(y_to_i.word, ' ' ORDER BY words.position)
  FROM regexp_split_to_table(
         btrim(regexp_replace(
           translate(lower(name), 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy'),
           '[[:space:][:punct:]]+', ' ', 'g')),
         ' ') WITH ORDINALITY AS words(word, position)
  CROSS JOIN LATERAL (
    SELECT CASE WHEN length(words.word) > 3 AND words.word ~ '[^s]s$'
                THEN left(words.word, -1) ELSE words.word END AS word
  ) AS strip_s
  CROSS JOIN LATERAL (
    SELECT CASE WHEN length(strip_s.word) > 3 AND strip_s.word LIKE '%e'
                THEN left(strip_s.word, -1) ELSE strip_s.word END AS word
  ) AS strip_e
  CROSS JOIN LATERAL (
    SELECT CASE WHEN length(strip_e.word) > 3 AND strip_e.word LIKE '%y'
                THEN left(strip_e.word, -1) || 'i' ELSE strip_e.word END AS word
  ) AS y_to_i
  WHERE words.word <> ''
$$;

-- AlterTable
ALTER TABLE "recipe_ingredients" ADD COLUMN     "match_key" TEXT;

-- Keep match_key in step with name on every write, whatever code does the write.
CREATE FUNCTION recipe_ingredients_set_match_key() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."match_key" := ingredient_match_key(NEW."name");
  RETURN NEW;
END;
$$;

CREATE TRIGGER recipe_ingredients_set_match_key
BEFORE INSERT OR UPDATE ON "recipe_ingredients"
FOR EACH ROW EXECUTE FUNCTION recipe_ingredients_set_match_key();

-- Fill the keys of existing ingredients (the trigger recomputes them on this update).
UPDATE "recipe_ingredients" SET "match_key" = ingredient_match_key("name");

-- CreateIndex
CREATE INDEX "recipe_ingredients_match_key_idx" ON "recipe_ingredients"("match_key");

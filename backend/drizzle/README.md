# Migration baseline

`0000_rich_fenris.sql` is a baseline of the current Drizzle schema. The Neon database already has the four tables in this baseline and two older migration records, but the original SQL files were not included in this checkout.

The baseline timestamp is intentionally earlier than the first recorded Neon migration. Drizzle skips it on that already-migrated database, while a fresh database runs it to create the schema. Keep the baseline before any future generated migration; do not regenerate or apply it as a new schema change to Neon.

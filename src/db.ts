import { sqlite } from '@flue/runtime/node';

// Conversations, attachments, and accepted submissions are stored here so
// they survive a restart. Swap in another adapter (Postgres, libSQL, ...)
// when one host's SQLite file is no longer enough:
// https://flueframework.com/docs/guide/database/
// Batch scripts set FLUE_DB_PATH=:memory: so parallel `flue run` processes do not lock this file.
export default sqlite(process.env.FLUE_DB_PATH ?? './data/flue.db');

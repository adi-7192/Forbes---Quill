import { DatabaseSync } from 'node:sqlite';
try {
  const db = new DatabaseSync('quill_audit.db');
  const logs = db.prepare('SELECT id, safety_flags, timestamp FROM audit_logs').all();
  console.log("Audit Logs:", JSON.stringify(logs, null, 2));
} catch (e) {
  console.error("Error:", e.message);
}

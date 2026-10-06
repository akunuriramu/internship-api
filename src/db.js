const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'internships.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema preserving original SQL constraints and accommodating JSON seed fields
db.exec(`
  CREATE TABLE IF NOT EXISTS internships (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    mode TEXT NOT NULL,
    duration_weeks INTEGER NOT NULL DEFAULT 4,
    applications_open INTEGER NOT NULL DEFAULT 1,
    location TEXT,
    skills TEXT,
    openings INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    internship_id TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (internship_id, applicant_email),
    FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE
  );
`);

/**
 * Format a database row into a standardized API response object.
 * Normalizes skills JSON string to an Array, and guarantees predictable types.
 */
function formatInternship(row) {
  if (!row) return null;

  let skills = [];
  if (row.skills) {
    try {
      const parsed = JSON.parse(row.skills);
      skills = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      skills = row.skills.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  return {
    id: row.id,
    title: row.title,
    domain: row.domain,
    mode: row.mode,
    duration_weeks: Number(row.duration_weeks),
    applications_open: Number(row.applications_open),
    location: row.location ?? null,
    skills: skills,
    openings: row.openings !== null && row.openings !== undefined ? Number(row.openings) : null
  };
}

module.exports = {
  db,
  dbPath,
  formatInternship
};

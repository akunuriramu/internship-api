const fs = require('fs');
const path = require('path');
const { db } = require('./src/db');

function seedDatabase(options = {}) {
  console.log('--- Starting Database Seeding Process ---');

  const isFresh = options.fresh || process.argv.includes('--fresh') || process.argv.includes('-f');
  if (isFresh) {
    console.log('Clearing existing records for fresh seed...');
    db.exec('DELETE FROM applications; DELETE FROM internships;');
  }

  // Paths to EdVyro sample files
  const sqlFile = path.join(__dirname, 'internship-board-sample.sql');
  const jsonFile = path.join(__dirname, 'internship-records-sample.json');

  if (!fs.existsSync(sqlFile)) {
    console.error(`Error: SQL sample file not found at ${sqlFile}`);
    process.exit(1);
  }

  if (!fs.existsSync(jsonFile)) {
    console.error(`Error: JSON sample file not found at ${jsonFile}`);
    process.exit(1);
  }

  const upsertStmt = db.prepare(`
    INSERT INTO internships (
      id,
      title,
      domain,
      mode,
      duration_weeks,
      applications_open,
      location,
      skills,
      openings
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      domain = excluded.domain,
      mode = excluded.mode,
      duration_weeks = excluded.duration_weeks,
      applications_open = excluded.applications_open,
      location = excluded.location,
      skills = excluded.skills,
      openings = excluded.openings
  `);

  const runSeeding = db.transaction(() => {
    let sqlRecordsCount = 0;
    let jsonRecordsCount = 0;

    // 1. Parse and seed SQL sample data
    // Records: ('INT-001', 'Frontend Practice Internship', 'Web Development', 'Remote', 4, 1), etc.
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    const tupleRegex = /\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(\d+),\s*(\d+)\)/g;
    let match;

    while ((match = tupleRegex.exec(sqlContent)) !== null) {
      const [, id, title, domain, mode, duration_weeks, applications_open] = match;
      upsertStmt.run(
        id,
        title,
        domain,
        mode,
        parseInt(duration_weeks, 10),
        parseInt(applications_open, 10),
        mode === 'Remote' ? 'Remote' : 'India',
        JSON.stringify([]),
        1
      );
      sqlRecordsCount++;
    }

    // 2. Parse and seed JSON sample data
    // Records: INT-101 to INT-105 with location, skills array, openings
    const jsonContent = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    const jsonList = jsonContent.internships || [];

    for (const item of jsonList) {
      upsertStmt.run(
        item.id,
        item.title,
        item.domain,
        item.mode,
        4, // Default duration_weeks preserving SQL schema
        item.openings > 0 ? 1 : 0, // Inferred applications_open status
        item.location || null,
        JSON.stringify(item.skills || []),
        item.openings !== undefined ? item.openings : 1
      );
      jsonRecordsCount++;
    }

    return { sqlRecordsCount, jsonRecordsCount };
  });

  const { sqlRecordsCount, jsonRecordsCount } = runSeeding();

  const total = db.prepare('SELECT COUNT(*) AS count FROM internships').get().count;

  console.log(`Successfully seeded:`);
  console.log(`- ${sqlRecordsCount} records from internship-board-sample.sql (INT-001 to INT-004)`);
  console.log(`- ${jsonRecordsCount} records from internship-records-sample.json (INT-101 to INT-105)`);
  console.log(`- Total internships in database: ${total}`);
  console.log('--- Database Seeding Complete ---');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };

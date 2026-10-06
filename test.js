/**
 * Comprehensive Automated Test Suite for EdVyro Internship Board API
 * Verifies all required endpoints, HTTP status codes, validation, pagination,
 * duplicate handling, edge cases, and SQLite persistence.
 */

const { app } = require('./src/server');
const { db, formatInternship } = require('./src/db');
const { seedDatabase } = require('./seed');

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

let serverInstance;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('========================================================');
  console.log('   Starting Comprehensive EdVyro API Test Suite');
  console.log('========================================================');

  // 1. Reset database to pristine state and seed sample records
  db.exec('DELETE FROM applications; DELETE FROM internships;');
  seedDatabase();

  // 2. Start server on test port
  await new Promise((resolve) => {
    serverInstance = app.listen(PORT, () => {
      console.log(`[TEST SERVER] Running on port ${PORT}`);
      resolve();
    });
  });

  let passedCount = 0;
  let testCount = 0;

  async function test(name, fn) {
    testCount++;
    try {
      await fn();
      console.log(` [PASS] Test ${testCount}: ${name}`);
      passedCount++;
    } catch (err) {
      console.error(` [FAIL] Test ${testCount}: ${name}`);
      console.error(`        Error: ${err.message}`);
    }
  }

  try {
    // Test 1: Root endpoint
    await test('GET / returns 200 and API overview', async () => {
      const res = await fetch(`${BASE_URL}/`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = await res.json();
      assert(body.success === true, 'Expected success: true');
      assert(body.endpoints !== undefined, 'Expected endpoints in response');
    });

    // Test 2: Health check
    await test('GET /api/health returns 200 and healthy status', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = await res.json();
      assert(body.status === 'healthy', 'Expected healthy status');
    });

    // Test 3: List internships with default pagination
    await test('GET /api/internships returns default pagination (page=1, limit=5)', async () => {
      const res = await fetch(`${BASE_URL}/api/internships`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = await res.json();
      assert(body.success === true, 'Expected success: true');
      assert(Array.isArray(body.data), 'Expected data to be array');
      assert(body.data.length === 5, `Expected 5 items, got ${body.data.length}`);
      assert(body.pagination.page === 1, 'Expected page: 1');
      assert(body.pagination.limit === 5, 'Expected limit: 5');
      assert(body.pagination.total === 9, `Expected total 9, got ${body.pagination.total}`);
      assert(body.pagination.totalPages === 2, `Expected totalPages 2, got ${body.pagination.totalPages}`);
    });

    // Test 4: Pagination page 2
    await test('GET /api/internships?page=2&limit=5 returns remaining 4 records', async () => {
      const res = await fetch(`${BASE_URL}/api/internships?page=2&limit=5`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = await res.json();
      assert(body.data.length === 4, `Expected 4 items on page 2, got ${body.data.length}`);
      assert(body.pagination.page === 2, 'Expected page: 2');
    });

    // Test 5: Invalid pagination query parameters
    await test('GET /api/internships?page=-1 returns 400 Bad Request', async () => {
      const res = await fetch(`${BASE_URL}/api/internships?page=-1`);
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      const body = await res.json();
      assert(body.success === false, 'Expected success: false');
      assert(body.error && body.error.message.includes('page'), 'Expected error message mentioning page');
    });

    // Test 6: Detail endpoint by ID (SQL record INT-001)
    await test('GET /api/internships/INT-001 returns 200 with correct fields', async () => {
      const res = await fetch(`${BASE_URL}/api/internships/INT-001`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = await res.json();
      assert(body.success === true, 'Expected success: true');
      assert(body.data.id === 'INT-001', 'Expected id: INT-001');
      assert(body.data.title === 'Frontend Practice Internship', 'Expected correct title');
      assert(body.data.domain === 'Web Development', 'Expected domain Web Development');
      assert(body.data.duration_weeks === 4, 'Expected duration_weeks 4');
      assert(body.data.applications_open === 1, 'Expected applications_open 1');
    });

    // Test 7: Detail endpoint by ID (JSON record INT-101 with skills & location)
    await test('GET /api/internships/INT-101 preserves skills array and location from JSON seed', async () => {
      const res = await fetch(`${BASE_URL}/api/internships/INT-101`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = await res.json();
      assert(body.success === true, 'Expected success: true');
      assert(body.data.id === 'INT-101', 'Expected id: INT-101');
      assert(body.data.location === 'India', 'Expected location: India');
      assert(Array.isArray(body.data.skills), 'Expected skills to be array');
      assert(body.data.skills.includes('HTML'), 'Expected skills to include HTML');
      assert(body.data.openings === 3, 'Expected openings: 3');
    });

    // Test 8: Nonexistent ID returns 404
    await test('GET /api/internships/INT-999 returns 404 Not Found', async () => {
      const res = await fetch(`${BASE_URL}/api/internships/INT-999`);
      assert(res.status === 404, `Expected 404, got ${res.status}`);
      const body = await res.json();
      assert(body.success === false, 'Expected success: false');
      assert(body.error && body.error.message.includes('not found'), 'Expected not found error message');
    });

    // Test 9: Create internship validation failure (missing required fields)
    await test('POST /api/internships with empty body returns 400 Bad Request', async () => {
      const res = await fetch(`${BASE_URL}/api/internships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      const body = await res.json();
      assert(body.success === false, 'Expected success: false');
      assert(body.error.details && body.error.details.length >= 3, 'Expected missing field error details');
    });

    // Test 10: Create internship successfully
    await test('POST /api/internships with valid data returns 201 Created', async () => {
      const newInternship = {
        id: 'INT-201',
        title: 'Cloud DevOps Intern',
        domain: 'DevOps & Cloud',
        mode: 'Remote',
        duration_weeks: 8,
        applications_open: 1,
        location: 'Remote',
        skills: ['Docker', 'AWS', 'CI/CD'],
        openings: 2
      };

      const res = await fetch(`${BASE_URL}/api/internships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInternship)
      });
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      const body = await res.json();
      assert(body.success === true, 'Expected success: true');
      assert(body.data.id === 'INT-201', 'Expected id INT-201');
      assert(body.data.title === 'Cloud DevOps Intern', 'Expected matching title');
      assert(body.data.skills.includes('AWS'), 'Expected AWS in skills');
    });

    // Test 11: Create internship with duplicate ID returns 409 Conflict
    await test('POST /api/internships with duplicate ID returns 409 Conflict', async () => {
      const duplicatePayload = {
        id: 'INT-201',
        title: 'Duplicate Cloud Intern',
        domain: 'DevOps & Cloud',
        mode: 'Remote'
      };

      const res = await fetch(`${BASE_URL}/api/internships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatePayload)
      });
      assert(res.status === 409, `Expected 409, got ${res.status}`);
      const body = await res.json();
      assert(body.success === false, 'Expected success: false');
      assert(body.error.message.includes('already exists'), 'Expected conflict error message');
    });

    // Test 12: Create internship without providing ID (auto-generates next ID)
    let autoGeneratedId;
    await test('POST /api/internships without ID auto-generates sequential ID', async () => {
      const autoPayload = {
        title: 'Mobile App Developer Intern',
        domain: 'Mobile Development',
        mode: 'Hybrid',
        location: 'Bengaluru',
        skills: ['React Native', 'TypeScript'],
        openings: 1
      };

      const res = await fetch(`${BASE_URL}/api/internships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(autoPayload)
      });
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      const body = await res.json();
      assert(body.success === true, 'Expected success: true');
      assert(body.data.id.startsWith('INT-'), 'Expected ID starting with INT-');
      autoGeneratedId = body.data.id;
    });

    // Test 13: Update internship (PUT)
    await test('PUT /api/internships/INT-201 updates fields and returns 200 OK', async () => {
      const updatePayload = {
        title: 'Senior Cloud DevOps Intern',
        duration_weeks: 12,
        openings: 4
      };

      const res = await fetch(`${BASE_URL}/api/internships/INT-201`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = await res.json();
      assert(body.success === true, 'Expected success: true');
      assert(body.data.title === 'Senior Cloud DevOps Intern', 'Expected updated title');
      assert(body.data.duration_weeks === 12, 'Expected duration_weeks: 12');
      assert(body.data.openings === 4, 'Expected openings: 4');
      assert(body.data.domain === 'DevOps & Cloud', 'Expected unchanged domain to be preserved');
    });

    // Test 14: Update nonexistent ID returns 404
    await test('PUT /api/internships/INT-999 returns 404 Not Found', async () => {
      const res = await fetch(`${BASE_URL}/api/internships/INT-999`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Title' })
      });
      assert(res.status === 404, `Expected 404, got ${res.status}`);
    });

    // Test 15: Delete internship (DELETE)
    await test('DELETE /api/internships/INT-201 deletes record and returns 200 OK', async () => {
      const res = await fetch(`${BASE_URL}/api/internships/INT-201`, {
        method: 'DELETE'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = await res.json();
      assert(body.success === true, 'Expected success: true');
      assert(body.data.id === 'INT-201', 'Expected deleted id in data');

      // Verify it is no longer found
      const verifyRes = await fetch(`${BASE_URL}/api/internships/INT-201`);
      assert(verifyRes.status === 404, 'Expected 404 after deletion');
    });

    // Test 16: Delete nonexistent ID returns 404
    await test('DELETE /api/internships/INT-999 returns 404 Not Found', async () => {
      const res = await fetch(`${BASE_URL}/api/internships/INT-999`, {
        method: 'DELETE'
      });
      assert(res.status === 404, `Expected 404, got ${res.status}`);
    });

    // Test 17: Verify persistence across server restart
    await test('Persistent data survives server restart and DB remains intact', async () => {
      // 1. Verify directly from SQLite DB before restart
      const dbRowBefore = db.prepare('SELECT * FROM internships WHERE id = ?').get(autoGeneratedId);
      assert(dbRowBefore !== undefined, 'Expected auto-generated record to exist in SQLite file');

      // 2. Restart server
      if (typeof serverInstance.closeAllConnections === 'function') {
        serverInstance.closeAllConnections();
      }
      await new Promise((resolve) => serverInstance.close(resolve));
      await new Promise((resolve) => setTimeout(resolve, 200));

      await new Promise((resolve) => {
        serverInstance = app.listen(PORT, resolve);
      });

      // 3. Verify via HTTP request after restart
      const res = await fetch(`${BASE_URL}/api/internships/${autoGeneratedId}`);
      assert(res.status === 200, `Expected 200 after restart, got ${res.status}`);
      const body = await res.json();
      assert(body.data.id === autoGeneratedId, 'Expected record to persist across server restart');
      assert(body.data.title === 'Mobile App Developer Intern', 'Expected persisted title to match');
    });

  } finally {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  }

  console.log('========================================================');
  console.log(` Test Summary: ${passedCount}/${testCount} Passed`);
  console.log('========================================================');

  if (passedCount !== testCount) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };

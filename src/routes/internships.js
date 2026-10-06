const express = require('express');
const router = express.Router();
const { db, formatInternship } = require('../db');
const {
  validatePagination,
  validateCreateInternship,
  validateUpdateInternship
} = require('../validators/internshipValidator');

/**
 * Generate a new ID if not provided in POST (e.g. INT-201, INT-202, ...)
 */
function generateNextId() {
  const rows = db.prepare('SELECT id FROM internships').all();
  let maxNum = 200;
  for (const row of rows) {
    const match = row.id.match(/^INT-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `INT-${maxNum + 1}`;
}

/**
 * GET /api/internships
 * List internships with pagination (?page=1&limit=5) and optional filters (?domain=...&mode=...)
 */
router.get('/', (req, res, next) => {
  try {
    const pagination = validatePagination(req.query);
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: pagination.errors.join('; '),
          details: pagination.errors
        }
      });
    }

    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    // Optional filtering
    const conditions = [];
    const params = [];

    if (req.query.domain && typeof req.query.domain === 'string') {
      conditions.push('LOWER(domain) = LOWER(?)');
      params.push(req.query.domain.trim());
    }

    if (req.query.mode && typeof req.query.mode === 'string') {
      conditions.push('LOWER(mode) = LOWER(?)');
      params.push(req.query.mode.trim());
    }

    if (req.query.search && typeof req.query.search === 'string') {
      conditions.push('(title LIKE ? OR domain LIKE ? OR location LIKE ?)');
      const term = `%${req.query.search.trim()}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countStmt = db.prepare(`SELECT COUNT(*) AS total FROM internships ${whereClause}`);
    const { total } = countStmt.get(...params);

    const queryStmt = db.prepare(`
      SELECT * FROM internships
      ${whereClause}
      ORDER BY id ASC
      LIMIT ? OFFSET ?
    `);

    const rows = queryStmt.all(...params, limit, offset);
    const data = rows.map(formatInternship);
    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/internships/:id
 * Retrieve single internship details by ID
 */
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('SELECT * FROM internships WHERE id = ?');
    const row = stmt.get(id);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Internship with ID '${id}' not found`
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: formatInternship(row)
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/internships
 * Create a new internship record
 */
router.post('/', (req, res, next) => {
  try {
    const validation = validateCreateInternship(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: validation.errors.join('; '),
          details: validation.errors
        }
      });
    }

    const { sanitized } = validation;
    const finalId = sanitized.id || generateNextId();

    // Check for duplicate ID
    const existing = db.prepare('SELECT id FROM internships WHERE id = ?').get(finalId);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          message: `Internship with ID '${finalId}' already exists`
        }
      });
    }

    const insertStmt = db.prepare(`
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
    `);

    insertStmt.run(
      finalId,
      sanitized.title,
      sanitized.domain,
      sanitized.mode,
      sanitized.duration_weeks,
      sanitized.applications_open,
      sanitized.location,
      JSON.stringify(sanitized.skills || []),
      sanitized.openings
    );

    const createdRow = db.prepare('SELECT * FROM internships WHERE id = ?').get(finalId);

    return res.status(201).json({
      success: true,
      data: formatInternship(createdRow)
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /api/internships/:id
 * Update an existing internship record
 */
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const existingRow = db.prepare('SELECT * FROM internships WHERE id = ?').get(id);
    if (!existingRow) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Internship with ID '${id}' not found`
        }
      });
    }

    const validation = validateUpdateInternship(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: validation.errors.join('; '),
          details: validation.errors
        }
      });
    }

    const { sanitized } = validation;

    // Merge existing values with updated values
    const updatedTitle = sanitized.title !== undefined ? sanitized.title : existingRow.title;
    const updatedDomain = sanitized.domain !== undefined ? sanitized.domain : existingRow.domain;
    const updatedMode = sanitized.mode !== undefined ? sanitized.mode : existingRow.mode;
    const updatedDuration = sanitized.duration_weeks !== undefined ? sanitized.duration_weeks : existingRow.duration_weeks;
    const updatedAppsOpen = sanitized.applications_open !== undefined ? sanitized.applications_open : existingRow.applications_open;
    const updatedLocation = sanitized.location !== undefined ? sanitized.location : existingRow.location;
    const updatedSkills = sanitized.skills !== undefined ? JSON.stringify(sanitized.skills) : existingRow.skills;
    const updatedOpenings = sanitized.openings !== undefined ? sanitized.openings : existingRow.openings;

    const updateStmt = db.prepare(`
      UPDATE internships
      SET
        title = ?,
        domain = ?,
        mode = ?,
        duration_weeks = ?,
        applications_open = ?,
        location = ?,
        skills = ?,
        openings = ?
      WHERE id = ?
    `);

    updateStmt.run(
      updatedTitle,
      updatedDomain,
      updatedMode,
      updatedDuration,
      updatedAppsOpen,
      updatedLocation,
      updatedSkills,
      updatedOpenings,
      id
    );

    const updatedRow = db.prepare('SELECT * FROM internships WHERE id = ?').get(id);

    return res.status(200).json({
      success: true,
      data: formatInternship(updatedRow)
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /api/internships/:id
 * Delete an internship record by ID
 */
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const existingRow = db.prepare('SELECT * FROM internships WHERE id = ?').get(id);
    if (!existingRow) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Internship with ID '${id}' not found`
        }
      });
    }

    db.prepare('DELETE FROM internships WHERE id = ?').run(id);

    return res.status(200).json({
      success: true,
      message: `Internship with ID '${id}' deleted successfully`,
      data: {
        id
      }
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

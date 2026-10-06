/**
 * Validation rules for Internship CRUD requests and pagination query parameters.
 */

function validatePagination(query) {
  const errors = [];
  let page = 1;
  let limit = 5;

  if (query.page !== undefined) {
    const parsedPage = Number(query.page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      errors.push("Query parameter 'page' must be a positive integer greater than or equal to 1");
    } else {
      page = parsedPage;
    }
  }

  if (query.limit !== undefined) {
    const parsedLimit = Number(query.limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      errors.push("Query parameter 'limit' must be an integer between 1 and 100");
    } else {
      limit = parsedLimit;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    page,
    limit
  };
}

function validateCreateInternship(body) {
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: ['Request body must be a valid JSON object'],
      sanitized: null
    };
  }

  // Required field: title
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    errors.push("Field 'title' is required and must be a non-empty string");
  }

  // Required field: domain
  if (!body.domain || typeof body.domain !== 'string' || body.domain.trim() === '') {
    errors.push("Field 'domain' is required and must be a non-empty string");
  }

  // Required field: mode
  if (!body.mode || typeof body.mode !== 'string' || body.mode.trim() === '') {
    errors.push("Field 'mode' is required and must be a non-empty string");
  }

  // Optional: id
  if (body.id !== undefined) {
    if (typeof body.id !== 'string' || body.id.trim() === '') {
      errors.push("Field 'id' must be a non-empty string if provided");
    }
  }

  // Optional: duration_weeks
  let durationWeeks = 4;
  if (body.duration_weeks !== undefined) {
    const parsedDuration = Number(body.duration_weeks);
    if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
      errors.push("Field 'duration_weeks' must be a positive integer greater than 0");
    } else {
      durationWeeks = parsedDuration;
    }
  }

  // Optional: applications_open
  let applicationsOpen = 1;
  if (body.applications_open !== undefined) {
    if (typeof body.applications_open === 'boolean') {
      applicationsOpen = body.applications_open ? 1 : 0;
    } else if (body.applications_open === 0 || body.applications_open === 1 || body.applications_open === '0' || body.applications_open === '1') {
      applicationsOpen = Number(body.applications_open);
    } else {
      errors.push("Field 'applications_open' must be a boolean (true/false) or integer (1/0)");
    }
  }

  // Optional: location
  let location = null;
  if (body.location !== undefined && body.location !== null) {
    if (typeof body.location !== 'string') {
      errors.push("Field 'location' must be a string");
    } else {
      location = body.location.trim();
    }
  }

  // Optional: skills
  let skills = [];
  if (body.skills !== undefined && body.skills !== null) {
    if (Array.isArray(body.skills)) {
      if (!body.skills.every((s) => typeof s === 'string')) {
        errors.push("Field 'skills' must be an array of strings");
      } else {
        skills = body.skills.map((s) => s.trim()).filter(Boolean);
      }
    } else if (typeof body.skills === 'string') {
      skills = body.skills.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      errors.push("Field 'skills' must be an array of strings or comma-separated string");
    }
  }

  // Optional: openings
  let openings = 1;
  if (body.openings !== undefined && body.openings !== null) {
    const parsedOpenings = Number(body.openings);
    if (!Number.isInteger(parsedOpenings) || parsedOpenings < 0) {
      errors.push("Field 'openings' must be an integer greater than or equal to 0");
    } else {
      openings = parsedOpenings;
    }
  }

  const sanitized = {
    id: body.id ? body.id.trim() : null,
    title: body.title ? body.title.trim() : '',
    domain: body.domain ? body.domain.trim() : '',
    mode: body.mode ? body.mode.trim() : '',
    duration_weeks: durationWeeks,
    applications_open: applicationsOpen,
    location,
    skills,
    openings
  };

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

function validateUpdateInternship(body) {
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: ['Request body must be a valid JSON object'],
      sanitized: null
    };
  }

  const allowedFields = ['title', 'domain', 'mode', 'duration_weeks', 'applications_open', 'location', 'skills', 'openings'];
  const providedFields = Object.keys(body).filter((key) => allowedFields.includes(key));

  if (providedFields.length === 0) {
    return {
      isValid: false,
      errors: [`Request body must contain at least one editable field: ${allowedFields.join(', ')}`],
      sanitized: null
    };
  }

  const sanitized = {};

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim() === '') {
      errors.push("Field 'title' must be a non-empty string");
    } else {
      sanitized.title = body.title.trim();
    }
  }

  if (body.domain !== undefined) {
    if (typeof body.domain !== 'string' || body.domain.trim() === '') {
      errors.push("Field 'domain' must be a non-empty string");
    } else {
      sanitized.domain = body.domain.trim();
    }
  }

  if (body.mode !== undefined) {
    if (typeof body.mode !== 'string' || body.mode.trim() === '') {
      errors.push("Field 'mode' must be a non-empty string");
    } else {
      sanitized.mode = body.mode.trim();
    }
  }

  if (body.duration_weeks !== undefined) {
    const parsedDuration = Number(body.duration_weeks);
    if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
      errors.push("Field 'duration_weeks' must be a positive integer greater than 0");
    } else {
      sanitized.duration_weeks = parsedDuration;
    }
  }

  if (body.applications_open !== undefined) {
    if (typeof body.applications_open === 'boolean') {
      sanitized.applications_open = body.applications_open ? 1 : 0;
    } else if (body.applications_open === 0 || body.applications_open === 1 || body.applications_open === '0' || body.applications_open === '1') {
      sanitized.applications_open = Number(body.applications_open);
    } else {
      errors.push("Field 'applications_open' must be a boolean (true/false) or integer (1/0)");
    }
  }

  if (body.location !== undefined) {
    if (body.location !== null && typeof body.location !== 'string') {
      errors.push("Field 'location' must be a string or null");
    } else {
      sanitized.location = body.location ? body.location.trim() : null;
    }
  }

  if (body.skills !== undefined) {
    if (Array.isArray(body.skills)) {
      if (!body.skills.every((s) => typeof s === 'string')) {
        errors.push("Field 'skills' must be an array of strings");
      } else {
        sanitized.skills = body.skills.map((s) => s.trim()).filter(Boolean);
      }
    } else if (typeof body.skills === 'string') {
      sanitized.skills = body.skills.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (body.skills === null) {
      sanitized.skills = [];
    } else {
      errors.push("Field 'skills' must be an array of strings or comma-separated string");
    }
  }

  if (body.openings !== undefined) {
    if (body.openings !== null) {
      const parsedOpenings = Number(body.openings);
      if (!Number.isInteger(parsedOpenings) || parsedOpenings < 0) {
        errors.push("Field 'openings' must be an integer greater than or equal to 0");
      } else {
        sanitized.openings = parsedOpenings;
      }
    } else {
      sanitized.openings = null;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

module.exports = {
  validatePagination,
  validateCreateInternship,
  validateUpdateInternship
};

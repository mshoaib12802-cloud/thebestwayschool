const AuditLog = require('../models/AuditLog');

/**
 * Log an action to the audit trail.
 * @param {object} opts
 * @param {object} opts.req           - Express request (for user + IP info)
 * @param {string} opts.action        - create|update|delete|login|logout|export|print|approve|reject
 * @param {string} opts.module        - e.g. 'Student', 'Finance', 'Attendance'
 * @param {string} [opts.entity_type] - e.g. 'Student'
 * @param {*}      [opts.entity_id]
 * @param {string} [opts.entity_label]- human-readable name for the entity
 * @param {string} [opts.description]
 * @param {*}      [opts.old_value]
 * @param {*}      [opts.new_value]
 */
async function audit(opts) {
  try {
    const { req, action, module, entity_type, entity_id, entity_label, description, old_value, new_value } = opts;
    const user = req?.user;
    await AuditLog.create({
      user_id:      user?._id || user?.id,
      user_name:    user?.name,
      user_role:    user?.role,
      action,
      module,
      entity_type,
      entity_id,
      entity_label,
      description,
      old_value:  old_value  ? JSON.parse(JSON.stringify(old_value))  : undefined,
      new_value:  new_value  ? JSON.parse(JSON.stringify(new_value))  : undefined,
      ip_address: req?.ip || req?.headers?.['x-forwarded-for'],
      user_agent: req?.headers?.['user-agent'],
    });
  } catch (err) {
    // Audit failures must never break the main flow
    console.error('[AuditLog Error]', err.message);
  }
}

module.exports = audit;

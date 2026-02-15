const { authorize } = require('./auth');

// Permission definitions
const PERMISSIONS = {
  // User Management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_PASSWORD_CHANGE: 'user:password:change',
  
  // Organization Management
  ORG_CREATE: 'org:create',
  ORG_READ: 'org:read',
  ORG_UPDATE: 'org:update',
  ORG_DELETE: 'org:delete',
  
  // Document Management
  DOC_CREATE: 'doc:create',
  DOC_READ: 'doc:read',
  DOC_UPDATE: 'doc:update',
  DOC_DELETE: 'doc:delete',
  
  // Financial Data
  FINANCIAL_READ: 'financial:read',
  FINANCIAL_UPDATE: 'financial:update',
  
  // System Configuration
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_EXPORT: 'system:export',
  
  // Audit Logs
  AUDIT_READ: 'audit:read',
  
  // Custom Entities
  ENTITY_CREATE: 'entity:create',
  ENTITY_READ: 'entity:read',
  ENTITY_UPDATE: 'entity:update',
  ENTITY_DELETE: 'entity:delete',
};

// Role definitions with permissions
const ROLE_PERMISSIONS = {
  admin: [
    // Full access to everything
    ...Object.values(PERMISSIONS)
  ],
  executive: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.ORG_READ,
    PERMISSIONS.DOC_READ,
    PERMISSIONS.FINANCIAL_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.ENTITY_READ,
    PERMISSIONS.SYSTEM_EXPORT,
  ],
  manager: [
    // Department-specific permissions handled in checkPermission
    PERMISSIONS.USER_READ,
    PERMISSIONS.ORG_READ,
    PERMISSIONS.ORG_UPDATE,
    PERMISSIONS.DOC_CREATE,
    PERMISSIONS.DOC_READ,
    PERMISSIONS.DOC_UPDATE,
    PERMISSIONS.ENTITY_READ,
    PERMISSIONS.ENTITY_UPDATE,
  ],
  staff: [
    PERMISSIONS.ORG_READ,
    PERMISSIONS.DOC_READ,
    PERMISSIONS.ENTITY_READ,
  ],
  guest: [
    PERMISSIONS.DOC_READ, // Limited read-only
  ]
};

// Check if user has permission
const hasPermission = (user, permission, resource = null) => {
  if (!user || !user.role) return false;
  
  // Admin has all permissions
  if (user.role === 'admin') return true;
  
  // Check role permissions
  const rolePerms = ROLE_PERMISSIONS[user.role] || [];
  if (!rolePerms.includes(permission)) return false;
  
  // Department-based restrictions for managers
  if (user.role === 'manager' && resource) {
    // Managers can only access resources in their department
    if (resource.department && resource.department !== user.department) {
      return false;
    }
  }
  
  return true;
};

// Middleware to check permissions
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!hasPermission(req.user, permission, req.resource)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    
    next();
  };
};

// Check department access
const checkDepartmentAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Admin and executive can access all departments
  if (['admin', 'executive'].includes(req.user.role)) {
    return next();
  }
  
  // Managers can only access their department
  if (req.user.role === 'manager' && req.query.department) {
    if (req.query.department !== req.user.department) {
      return res.status(403).json({ error: 'Forbidden: Cannot access other departments' });
    }
  }
  
  next();
};

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  checkPermission,
  checkDepartmentAccess
};

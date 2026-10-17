/**
 * Authentication and authorization middleware.
 * Verifies Bearer tokens or supplies a default trainer context for development.
 */
export function authenticateTrainer(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    // In production, verify JWT. In dev, accept token or default trainer
    req.user = {
      id: token === 'trainer_token' ? 'trainer_default' : 'trainer_user',
      role: 'trainer',
      name: 'Senior Technical Trainer'
    };
  } else {
    // Development fallback
    req.user = {
      id: 'trainer_default',
      role: 'trainer',
      name: 'Lead Curriculum Trainer'
    };
  }

  next();
}

/**
 * Validates resource ownership for presentations and slides.
 */
export function checkOwnership(resourceUserId) {
  return (req, res, next) => {
    if (req.user.id !== resourceUserId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to modify this resource.' });
    }
    next();
  };
}

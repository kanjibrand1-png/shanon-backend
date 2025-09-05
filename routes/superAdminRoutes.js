const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const superAdminAuth = require('../middlewares/superAdminAuth');

// Super Admin management routes
// GET /api/superadmins (Super Admin only)
router.get('/', superAdminAuth, superAdminController.getAllSuperAdmins);

// POST /api/superadmins (Super Admin only)
router.post('/', superAdminAuth, superAdminController.createSuperAdmin);

// POST /api/superadmins/login (Public - for super admin login)
router.post('/login', superAdminController.loginSuperAdmin);

// PUT /api/superadmins/:id (Super Admin only - for updating own profile)
router.put('/:id', superAdminAuth, superAdminController.updateSuperAdmin);

// DELETE /api/superadmins/:id (Super Admin only)
router.delete('/:id', superAdminAuth, superAdminController.deleteSuperAdmin);

// PATCH /api/superadmins/:id/toggle-status (Super Admin only)
router.patch('/:id/toggle-status', superAdminAuth, superAdminController.toggleSuperAdminStatus);

module.exports = router;

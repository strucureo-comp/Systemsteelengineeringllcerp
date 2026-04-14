const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const Role = require('../models/Role');

// GET all roles
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const roles = await Role.find({ tenant_id }).sort({ createdAt: -1 });
        
        res.json({ success: true, data: roles });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET single role
router.get('/:id', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const role = await Role.findOne({ 
            _id: req.params.id, 
            tenant_id 
        });
        
        if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }
        
        res.json({ success: true, data: role });
    } catch (error) {
        console.error('Error fetching role:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST create role
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        
        const role = await Role.create({
            ...req.body,
            tenant_id,
            isCustom: true,
            created_by: req.user._id,
            updated_by: req.user._id
        });
        
        res.status(201).json({ 
            success: true, 
            data: role, 
            message: 'Role created successfully' 
        });
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// PUT update role
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        
        const role = await Role.findOneAndUpdate(
            { _id: req.params.id, tenant_id },
            { 
                ...req.body, 
                updated_by: req.user._id 
            },
            { 
                new: true, 
                runValidators: true 
            }
        );
        
        if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }
        
        res.json({ 
            success: true, 
            data: role, 
            message: 'Role updated successfully' 
        });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// DELETE role
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        
        const role = await Role.findOneAndDelete({ 
            _id: req.params.id, 
            tenant_id,
            isDefault: false  // Only allow deletion of custom roles
        });
        
        if (!role) {
            return res.status(404).json({ 
                success: false, 
                error: 'Role not found or cannot be deleted' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Role deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET check permission
router.get('/check-permission', auth, async (req, res) => {
    try {
        const { module, action } = req.query;
        
        if (!module || !action) {
            return res.status(400).json({ 
                success: false, 
                error: 'Module and action are required' 
            });
        }
        
        const tenant_id = req.user?.tenant_id || 'default';
        const userRole = req.user?.role || 'Employee';
        
        const role = await Role.findOne({ 
            tenant_id, 
            name: userRole 
        });
        
        if (!role) {
            return res.json({ success: true, hasPermission: false });
        }
        
        const permission = role.permissions.find(p => p.module === module);
        const hasPermission = permission && permission[action] === true;
        
        res.json({ success: true, hasPermission });
    } catch (error) {
        console.error('Error checking permission:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

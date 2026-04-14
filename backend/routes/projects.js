const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { auth } = require('../middleware/auth');

// GET all projects
router.get('/', auth, async (req, res) => {
    try {
        const projects = await Project.find().populate('client_id', 'full_name email').sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// GET single project
router.get('/:id', auth, async (req, res) => {
    try {
        const project = await Project.findOne({ id: req.params.id }).populate('client_id', 'full_name email');
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// CREATE project
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, client_id } = req.body;
        const count = await Project.countDocuments();
        const project = new Project({
            id: `PRJ-${String(count + 1).padStart(4, '0')}`,
            title,
            description,
            client_id
        });
        await project.save();
        res.status(201).json(project);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create project', detail: err.message });
    }
});

// UPDATE project
router.put('/:id', auth, async (req, res) => {
    try {
        const project = await Project.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// FILE UPLOADS MOCK STORE
const projectFiles = [];

// GET project files
router.get('/upload-files', auth, async (req, res) => {
    try {
        const { project_id, module_type } = req.query;
        const filtered = projectFiles.filter(f => 
            f.project_id === project_id && 
            f.module_type === module_type
        );
        res.json({ success: true, files: filtered, data: filtered });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST project files
router.post('/upload-files', auth, async (req, res) => {
    try {
        const fileData = req.body;
        const newFile = {
            id: Math.random().toString(36).substr(2, 9),
            ...fileData,
            created_at: new Date().toISOString()
        };
        projectFiles.push(newFile);
        res.json({ success: true, data: [newFile], file: newFile });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

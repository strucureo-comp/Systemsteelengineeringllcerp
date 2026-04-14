const express = require('express');
const router = express.Router();
const { PlanningNote, Enquiry } = require('../models/Misc');
const { auth } = require('../middleware/auth');

// ── PLANNING NOTES ──────────────────────────────────────────────────────────
router.get('/planning-notes', auth, async (req, res) => {
    try {
        const notes = await PlanningNote.find({ created_by: req.user.id }).sort({ updatedAt: -1 });
        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch planning notes' });
    }
});

router.post('/planning-notes', auth, async (req, res) => {
    try {
        const note = new PlanningNote({ ...req.body, created_by: req.user.id });
        await note.save();
        res.status(201).json(note);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create planning note' });
    }
});

// ── ENQUIRIES ────────────────────────────────────────────────────────────────
router.get('/enquiries', auth, async (req, res) => {
    try {
        const enquiries = await Enquiry.find().sort({ createdAt: -1 });
        res.json(enquiries);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch enquiries' });
    }
});

router.post('/enquiries', async (req, res) => {
    try {
        const enquiry = new Enquiry(req.body);
        await enquiry.save();
        res.status(201).json(enquiry);
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit enquiry' });
    }
});

module.exports = router;

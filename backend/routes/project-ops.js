const express = require('express');
const router = express.Router();
const { Timesheet, ResourceBooking } = require('../models/ProjectOps');
const { auth } = require('../middleware/auth');

// ── TIMESHEETS ─────────────────────────────────────────────────────────────
router.get('/timesheets', auth, async (req, res) => {
    try {
        const query = req.query.project_id ? { project_id: req.query.project_id } : {};
        const sheets = await Timesheet.find(query).populate('employee_id', 'name');
        res.json(sheets);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch timesheets' });
    }
});

router.post('/timesheets', auth, async (req, res) => {
    try {
        const sheet = new Timesheet(req.body);
        await sheet.save();
        res.status(201).json(sheet);
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit timesheet' });
    }
});

// ── RESOURCE BOOKINGS ───────────────────────────────────────────────────────
router.get('/resource-bookings', auth, async (req, res) => {
    try {
        const bookings = await ResourceBooking.find().sort({ start_date: 1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch resource bookings' });
    }
});

module.exports = router;

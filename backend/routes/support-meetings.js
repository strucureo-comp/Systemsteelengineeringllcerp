const express = require('express');
const router = express.Router();
const { SupportRequest, MeetingRequest } = require('../models/SupportMeeting');
const { auth } = require('../middleware/auth');

// ── SUPPORT REQUESTS ────────────────────────────────────────────────────────
router.get('/support', auth, async (req, res) => {
    try {
        const query = req.user.role === 'admin' ? {} : { client_id: req.user.id };
        const requests = await SupportRequest.find(query)
            .populate('client_id', 'full_name email')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch support requests' });
    }
});

router.post('/support', auth, async (req, res) => {
    try {
        const request = new SupportRequest({ ...req.body, client_id: req.user.id });
        await request.save();
        res.status(201).json(request);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create support request' });
    }
});

// ── MEETING REQUESTS ────────────────────────────────────────────────────────
router.get('/meetings', auth, async (req, res) => {
    try {
        const query = req.user.role === 'admin' ? {} : { client_id: req.user.id };
        const meetings = await MeetingRequest.find(query)
            .populate('client_id', 'full_name email')
            .sort({ requested_date: 1 });
        res.json(meetings);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
});

router.post('/meetings', auth, async (req, res) => {
    try {
        const meeting = new MeetingRequest({ ...req.body, client_id: req.user.id });
        await meeting.save();
        res.status(201).json(meeting);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create meeting request' });
    }
});

module.exports = router;

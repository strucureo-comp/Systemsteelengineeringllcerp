const express = require('express');
const router = express.Router();
const { StockJournal } = require('../models/StockJournal');
const { auth } = require('../middleware/auth');

// ── STOCK JOURNALS ──────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        const journals = await StockJournal.find()
            .populate('created_by', 'full_name')
            .sort({ date: -1 });
        res.json(journals);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stock journals' });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        const count = await StockJournal.countDocuments();
        const journal = new StockJournal({
            ...req.body,
            number: `STJ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`,
            created_by: req.user.id
        });
        await journal.save();
        res.status(201).json(journal);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create stock journal' });
    }
});

module.exports = router;

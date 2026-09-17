const express = require("express");
const db = require("../database/database");

const router = express.Router();

/*
    GET /outbox

    Returns notification events created
    when a member changes tier.
*/
router.get("/", (req, res) => {
    const events = db.prepare(`
        SELECT
            id,
            member_id,
            event_type,
            payload,
            created_at,
            delivered
        FROM outbox
        ORDER BY id ASC
    `).all();

    res.json({
        success: true,
        events: events.map(event => ({
            ...event,
            payload: JSON.parse(event.payload)
        }))
    });
});


/*
    GET /outbox/pending

    Returns only undelivered notifications.
*/
router.get("/pending", (req, res) => {
    const events = db.prepare(`
        SELECT
            id,
            member_id,
            event_type,
            payload,
            created_at,
            delivered
        FROM outbox
        WHERE delivered = 0
        ORDER BY id ASC
    `).all();

    res.json({
        success: true,
        events: events.map(event => ({
            ...event,
            payload: JSON.parse(event.payload)
        }))
    });
});


/*
    POST /outbox/:id/deliver

    Marks a notification as delivered.
*/
router.post("/:id/deliver", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid outbox ID"
        });
    }

    const result = db.prepare(`
        UPDATE outbox
        SET delivered = 1
        WHERE id = ?
    `).run(id);

    if (result.changes === 0) {
        return res.status(404).json({
            success: false,
            message: "Outbox event not found"
        });
    }

    res.json({
        success: true,
        message: "Notification marked as delivered"
    });
});

module.exports = router;
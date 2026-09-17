const express = require("express");
const db = require("../database/database");

const {
    getTier,
    getRate,
    getNextTier
} = require("../services/loyaltyService");

const router = express.Router();

/*
    GET /api/members
    Long member list
*/
router.get("/", (req, res) => {
    const members = db.prepare(`
        SELECT
            id,
            name,
            phone,
            points,
            lifetime_points,
            created_at
        FROM members
        ORDER BY id DESC
    `).all();

    res.json({
        success: true,
        members: members.map(member => ({
            ...member,
            tier: getTier(member.lifetime_points),
            rate: getRate(member.lifetime_points),
            nextTier: getNextTier(member.lifetime_points)
        }))
    });
});


/*
    GET /api/members/search?phone=XXXXXXXXXX
    Staff lookup by phone number
*/
router.get("/search", (req, res) => {
    const phone = String(req.query.phone || "").trim();

    if (!phone) {
        return res.status(400).json({
            success: false,
            message: "Phone number is required"
        });
    }

    const member = db.prepare(`
        SELECT
            id,
            name,
            phone,
            points,
            lifetime_points,
            created_at
        FROM members
        WHERE phone = ?
    `).get(phone);

    if (!member) {
        return res.status(404).json({
            success: false,
            message: "Member not found"
        });
    }

    const transactions = db.prepare(`
        SELECT
            id,
            type,
            amount,
            points,
            created_at
        FROM transactions
        WHERE member_id = ?
        ORDER BY id DESC
    `).all(member.id);

    res.json({
        success: true,
        member: {
            ...member,
            tier: getTier(member.lifetime_points),
            rate: getRate(member.lifetime_points),
            nextTier: getNextTier(member.lifetime_points),
            transactions
        }
    });
});


/*
    POST /api/members
    Create new member
*/
router.post("/", (req, res) => {
    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").trim();

    if (!name) {
        return res.status(400).json({
            success: false,
            message: "Name is required"
        });
    }

    if (!/^[0-9]{10}$/.test(phone)) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid 10-digit phone number"
        });
    }

    const existing = db.prepare(`
        SELECT id
        FROM members
        WHERE phone = ?
    `).get(phone);

    if (existing) {
        return res.status(409).json({
            success: false,
            message: "Member already exists"
        });
    }

    const now = Date.now();

    const result = db.prepare(`
        INSERT INTO members
        (name, phone, points, lifetime_points, created_at)
        VALUES (?, ?, 0, 0, ?)
    `).run(
        name,
        phone,
        now
    );

    const member = db.prepare(`
        SELECT
            id,
            name,
            phone,
            points,
            lifetime_points,
            created_at
        FROM members
        WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
        success: true,
        message: "Member created successfully",
        member: {
            ...member,
            tier: getTier(member.lifetime_points),
            rate: getRate(member.lifetime_points),
            nextTier: getNextTier(member.lifetime_points)
        }
    });
});


module.exports = router;
const express = require("express");
const db = require("../database/database");

const router = express.Router();

function getClockTime(req) {
    const value =
        req.body?.now ??
        req.body?.timestamp ??
        req.body?.at;

    if (value === undefined || value === null) {
        return Date.now();
    }

    if (typeof value === "number") {
        return value;
    }

    const parsed = Date.parse(String(value));

    if (Number.isNaN(parsed)) {
        return null;
    }

    return parsed;
}


/*
    POST /clock

    Expires all unused point lots whose
    expiry time has been reached.
*/
router.post("/", (req, res) => {
    const now = getClockTime(req);

    if (now === null) {
        return res.status(400).json({
            success: false,
            message: "Invalid clock time"
        });
    }

    const expiredLots = db.prepare(`
        SELECT *
        FROM point_lots
        WHERE remaining > 0
          AND expires_at <= ?
        ORDER BY expires_at ASC, id ASC
    `).all(now);

    let totalExpired = 0;
    let affectedMembers = 0;

    const expirePoints = db.transaction(() => {

        const affected = new Set();

        for (const lot of expiredLots) {

            if (lot.remaining <= 0) {
                continue;
            }

            const expiredPoints = lot.remaining;

            /*
                Mark this lot as fully consumed.
            */
            db.prepare(`
                UPDATE point_lots
                SET remaining = 0
                WHERE id = ?
            `).run(lot.id);

            /*
                Reduce LIVE balance only.
                Lifetime points remain unchanged.
            */
            db.prepare(`
                UPDATE members
                SET points = MAX(0, points - ?)
                WHERE id = ?
            `).run(
                expiredPoints,
                lot.member_id
            );

            /*
                Record expiry in transaction history.
            */
            db.prepare(`
                INSERT INTO transactions
                (
                    member_id,
                    type,
                    amount,
                    points,
                    created_at
                )
                VALUES (?, 'Expiry', 0, ?, ?)
            `).run(
                lot.member_id,
                -expiredPoints,
                now
            );

            totalExpired += expiredPoints;
            affected.add(lot.member_id);
        }

        affectedMembers = affected.size;
    });

    expirePoints();

    res.json({
        success: true,
        clock: now,
        expiredPoints: totalExpired,
        affectedMembers
    });
});

module.exports = router;
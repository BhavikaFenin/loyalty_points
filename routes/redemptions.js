const express = require("express");
const db = require("../database/database");

const {
    getTier,
    getRate
} = require("../services/loyaltyService");

const router = express.Router();

router.post("/", (req, res) => {
    const phone = String(req.body.phone || "").trim();
    const points = Number(req.body.points);

    if (!/^[0-9]{10}$/.test(phone)) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid 10-digit phone number"
        });
    }

    if (!Number.isInteger(points) || points <= 0) {
        return res.status(400).json({
            success: false,
            message: "Enter valid redemption points"
        });
    }

    if (points % 100 !== 0) {
        return res.status(400).json({
            success: false,
            message: "Redemption must be in multiples of 100"
        });
    }

    const member = db.prepare(`
        SELECT *
        FROM members
        WHERE phone = ?
    `).get(phone);

    if (!member) {
        return res.status(404).json({
            success: false,
            message: "Member not found"
        });
    }

    if (member.points < points) {
        return res.status(400).json({
            success: false,
            message: `Insufficient points. Balance: ${member.points}`
        });
    }

    const now = Date.now();

    const transaction = db.transaction(() => {

        let remainingToRedeem = points;

        /*
            FIFO:
            Oldest point lots are consumed first.
        */
        const lots = db.prepare(`
            SELECT *
            FROM point_lots
            WHERE member_id = ?
              AND remaining > 0
            ORDER BY earned_at ASC, id ASC
        `).all(member.id);

        for (const lot of lots) {
            if (remainingToRedeem <= 0) {
                break;
            }

            const used = Math.min(
                lot.remaining,
                remainingToRedeem
            );

            db.prepare(`
                UPDATE point_lots
                SET remaining = remaining - ?
                WHERE id = ?
            `).run(
                used,
                lot.id
            );

            remainingToRedeem -= used;
        }

        /*
            Update live spendable balance.
            Lifetime points do NOT decrease.
        */
        db.prepare(`
            UPDATE members
            SET points = points - ?
            WHERE id = ?
        `).run(
            points,
            member.id
        );

        /*
            Record redemption transaction.
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
            VALUES (?, 'Redemption', 0, ?, ?)
        `).run(
            member.id,
            -points,
            now
        );
    });

    transaction();

    const updatedMember = db.prepare(`
        SELECT *
        FROM members
        WHERE id = ?
    `).get(member.id);

    res.json({
        success: true,
        message: "Points redeemed successfully",
        redeemedPoints: points,
        member: {
            ...updatedMember,
            tier: getTier(updatedMember.lifetime_points),
            rate: getRate(updatedMember.lifetime_points)
        }
    });
});

module.exports = router;
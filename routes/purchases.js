const express = require("express");
const db = require("../database/database");

const {
    getTier,
    getRate,
    calculatePurchasePoints
} = require("../services/loyaltyService");

const router = express.Router();

const DAYS_90 = 90 * 24 * 60 * 60 * 1000;

router.post("/", (req, res) => {
    const phone = String(req.body.phone || "").trim();
    const amount = Number(req.body.amount);

    if (!/^[0-9]{10}$/.test(phone)) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid 10-digit phone number"
        });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid purchase amount"
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

    /*
        Tier/rate before this purchase
    */
    const oldTier = getTier(member.lifetime_points);
    const rate = getRate(member.lifetime_points);

    const earnedPoints = calculatePurchasePoints(
        amount,
        member.lifetime_points
    );

    if (earnedPoints <= 0) {
        return res.status(400).json({
            success: false,
            message: "Purchase did not earn any points"
        });
    }

    const now = Date.now();
    const expiresAt = now + DAYS_90;

    const transaction = db.transaction(() => {

        /*
            Add spendable balance
            and lifetime earned points
        */
        db.prepare(`
            UPDATE members
            SET
                points = points + ?,
                lifetime_points = lifetime_points + ?
            WHERE id = ?
        `).run(
            earnedPoints,
            earnedPoints,
            member.id
        );

        /*
            Store earned points separately.
            This allows 90-day expiry.
        */
        db.prepare(`
            INSERT INTO point_lots
            (
                member_id,
                points,
                remaining,
                earned_at,
                expires_at
            )
            VALUES (?, ?, ?, ?, ?)
        `).run(
            member.id,
            earnedPoints,
            earnedPoints,
            now,
            expiresAt
        );

        /*
            Purchase transaction
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
            VALUES (?, 'Purchase', ?, ?, ?)
        `).run(
            member.id,
            amount,
            earnedPoints,
            now
        );

        /*
            Check whether purchase crossed a tier.
        */
        const updatedMember = db.prepare(`
            SELECT *
            FROM members
            WHERE id = ?
        `).get(member.id);

        const newTier = getTier(updatedMember.lifetime_points);

        if (newTier !== oldTier) {

            db.prepare(`
                INSERT INTO outbox
                (
                    member_id,
                    event_type,
                    payload,
                    created_at
                )
                VALUES (?, 'TIER_CHANGED', ?, ?)
            `).run(
                member.id,
                JSON.stringify({
                    memberId: member.id,
                    name: member.name,
                    phone: member.phone,
                    oldTier,
                    newTier
                }),
                now
            );
        }
    });

    transaction();

    const updatedMember = db.prepare(`
        SELECT *
        FROM members
        WHERE id = ?
    `).get(member.id);

    const newTier = getTier(updatedMember.lifetime_points);

    res.json({
        success: true,
        message: "Purchase recorded successfully",
        purchase: {
            amount,
            earnedPoints,
            rate
        },
        member: {
            ...updatedMember,
            tier: newTier,
            rate: getRate(updatedMember.lifetime_points)
        }
    });
});

module.exports = router;
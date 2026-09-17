const express = require("express");
const cors = require("cors");
const path = require("path");

require("./database/database");

const membersRouter = require("./routes/members");
const purchasesRouter = require("./routes/purchases");
const redemptionsRouter = require("./routes/redemptions");
const clockRouter = require("./routes/clock");
const outboxRouter = require("./routes/outbox");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname)));

app.use("/api/members", membersRouter);
app.use("/api/purchases", purchasesRouter);
app.use("/api/redemptions", redemptionsRouter);
app.use("/clock", clockRouter);
app.use("/outbox", outboxRouter);

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Cafe Loyalty System API is running"
    });
});

app.get("/api/transactions", (req, res) => {
    const db = require("./database/database");

    const transactions = db.prepare(`
        SELECT
            transactions.id,
            transactions.type,
            transactions.amount,
            transactions.points,
            transactions.created_at,
            members.name,
            members.phone
        FROM transactions
        JOIN members
            ON members.id = transactions.member_id
        ORDER BY transactions.id DESC
    `).all();

    res.json({
        success: true,
        transactions
    });
});

app.get("/api/dashboard", (req, res) => {
    const db = require("./database/database");

    const totalMembers = db.prepare(`
        SELECT COUNT(*) AS count
        FROM members
    `).get().count;

    const totalPoints = db.prepare(`
        SELECT COALESCE(SUM(points), 0) AS total
        FROM members
    `).get().total;

    const pointsRedeemed = db.prepare(`
        SELECT COALESCE(SUM(ABS(points)), 0) AS total
        FROM transactions
        WHERE type = 'Redemption'
    `).get().total;

    const totalTransactions = db.prepare(`
        SELECT COUNT(*) AS count
        FROM transactions
    `).get().count;

    const goldMembers = db.prepare(`
        SELECT COUNT(*) AS count
        FROM members
        WHERE lifetime_points >= 500
        AND lifetime_points < 5000
    `).get().count;

    const platinumMembers = db.prepare(`
        SELECT COUNT(*) AS count
        FROM members
        WHERE lifetime_points >= 5000
    `).get().count;

    const silverMembers = db.prepare(`
        SELECT COUNT(*) AS count
        FROM members
        WHERE lifetime_points >= 100
        AND lifetime_points < 500
    `).get().count;

    const regularMembers = db.prepare(`
        SELECT COUNT(*) AS count
        FROM members
        WHERE lifetime_points < 100
    `).get().count;

    res.json({
        success: true,
        stats: {
            totalMembers,
            totalPoints,
            pointsRedeemed,
            totalTransactions,
            goldMembers,
            platinumMembers,
            silverMembers,
            regularMembers
        }
    });
});

app.listen(PORT, () => {
    console.log(`Cafe Loyalty System running on port ${PORT}`);
});
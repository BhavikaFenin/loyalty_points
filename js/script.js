const API = "";

let currentMember = null;

function showSection(sectionId) {
    document.querySelectorAll(".section").forEach(section => {
        section.classList.add("hidden");
    });

    const section = document.getElementById(sectionId);

    if (section) {
        section.classList.remove("hidden");
    }

    if (sectionId === "dashboard") {
        loadDashboard();
    }

    if (sectionId === "members") {
        loadMembers();
    }

    if (sectionId === "transactions") {
        loadTransactions();
    }
}

async function loadDashboard() {
    try {
        const response = await fetch(`${API}/api/members`);
        const data = await response.json();

        const members = data.members || [];

        document.getElementById("totalMembers").textContent =
            members.length;

        const totalPoints = members.reduce(
            (sum, member) => sum + Number(member.points),
            0
        );

        const goldMembers = members.filter(
            member =>
                member.tier === "Gold" ||
                member.tier === "Platinum"
        ).length;

        document.getElementById("totalPoints").textContent =
            totalPoints;

        document.getElementById("goldMembers").textContent =
            goldMembers;

        const transactionsResponse =
            await fetch(`${API}/api/transactions`);

        if (transactionsResponse.ok) {
            const transactionData =
                await transactionsResponse.json();

            const redeemed = (transactionData.transactions || [])
                .filter(t => t.type === "Redemption")
                .reduce(
                    (sum, t) => sum + Math.abs(Number(t.points)),
                    0
                );

            const pointsRedeemed =
                document.getElementById("pointsRedeemed");

            if (pointsRedeemed) {
                pointsRedeemed.textContent = redeemed;
            }
        }

    } catch (error) {
        console.error("Dashboard error:", error);
    }
}

async function addMember() {
    const name =
        document.getElementById("memberName").value.trim();

    const phone =
        document.getElementById("memberPhone").value.trim();

    if (!name || !/^[0-9]{10}$/.test(phone)) {
        alert("Enter valid name and 10-digit phone number.");
        return;
    }

    try {
        const response = await fetch(`${API}/api/members`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                phone
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        alert("Member created successfully!");

        document.getElementById("memberName").value = "";
        document.getElementById("memberPhone").value = "";

        loadMembers();
        loadDashboard();

    } catch (error) {
        alert("Server connection failed.");
        console.error(error);
    }
}

async function searchMember() {
    const phone =
        document.getElementById("searchPhone").value.trim();

    if (!/^[0-9]{10}$/.test(phone)) {
        alert("Enter a valid 10-digit phone number.");
        return;
    }

    try {
        const response = await fetch(
            `${API}/api/members/search?phone=${encodeURIComponent(phone)}`
        );

        const data = await response.json();

        const result =
            document.getElementById("searchResult");

        if (!response.ok) {
            result.innerHTML = `<p>${data.message}</p>`;
            return;
        }

        currentMember = data.member;

        result.innerHTML = `
            <div class="member-card">
                <h3>${data.member.name}</h3>

                <p>
                    <strong>Phone:</strong>
                    ${data.member.phone}
                </p>

                <p>
                    <strong>Balance:</strong>
                    ${data.member.points} points
                </p>

                <p>
                    <strong>Lifetime Points:</strong>
                    ${data.member.lifetime_points}
                </p>

                <p>
                    <strong>Tier:</strong>
                    ${data.member.tier}
                </p>

                <p>
                    <strong>Rate:</strong>
                    ${data.member.rate} points/₹
                </p>
            </div>
        `;

    } catch (error) {
        alert("Server connection failed.");
        console.error(error);
    }
}

async function loadMembers() {
    try {
        const response =
            await fetch(`${API}/api/members`);

        const data = await response.json();

        const list =
            document.getElementById("memberList");

        if (!list) return;

        if (!data.members.length) {
            list.innerHTML = "<p>No members found.</p>";
            return;
        }

        list.innerHTML = data.members.map(member => `
            <div class="member-card">

                <h3>${member.name}</h3>

                <p>
                    Phone:
                    ${member.phone}
                </p>

                <p>
                    Points:
                    <strong>${member.points}</strong>
                </p>

                <p>
                    Lifetime:
                    ${member.lifetime_points}
                </p>

                <p>
                    Tier:
                    <strong>${member.tier}</strong>
                </p>

                <p>
                    Rate:
                    ${member.rate} points/₹
                </p>

            </div>
        `).join("");

    } catch (error) {
        console.error("Members error:", error);
    }
}

async function makePurchase() {
    const phone =
        document.getElementById("purchasePhone").value.trim();

    const amount =
        Number(document.getElementById("purchaseAmount").value);

    if (!/^[0-9]{10}$/.test(phone)) {
        alert("Enter a valid 10-digit phone number.");
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Enter a valid purchase amount.");
        return;
    }

    try {
        const response = await fetch(
            `${API}/api/purchases`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    phone,
                    amount
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        alert(
            `Purchase successful!\n\n` +
            `Points earned: ${data.purchase.earnedPoints}\n` +
            `New balance: ${data.member.points}\n` +
            `Tier: ${data.member.tier}`
        );

        document.getElementById("purchasePhone").value = "";
        document.getElementById("purchaseAmount").value = "";

        loadDashboard();

    } catch (error) {
        alert("Server connection failed.");
        console.error(error);
    }
}

async function redeemPoints() {
    const phone =
        document.getElementById("redeemPhone").value.trim();

    const points =
        Number(document.getElementById("redeemPoints").value);

    if (!/^[0-9]{10}$/.test(phone)) {
        alert("Enter a valid 10-digit phone number.");
        return;
    }

    if (!Number.isInteger(points) || points <= 0) {
        alert("Enter valid points.");
        return;
    }

    try {
        const response = await fetch(
            `${API}/api/redemptions`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    phone,
                    points
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        alert(
            `Redemption successful!\n\n` +
            `Redeemed: ${points} points\n` +
            `Remaining balance: ${data.member.points}`
        );

        document.getElementById("redeemPhone").value = "";
        document.getElementById("redeemPoints").value = "";

        loadDashboard();

    } catch (error) {
        alert("Server connection failed.");
        console.error(error);
    }
}

async function loadTransactions() {
    try {
        const response =
            await fetch(`${API}/api/transactions`);

        if (!response.ok) {
            return;
        }

        const data = await response.json();

        const list =
            document.getElementById("transactionList");

        if (!list) return;

        if (!data.transactions.length) {
            list.innerHTML = "<p>No transactions yet.</p>";
            return;
        }

        list.innerHTML = data.transactions.map(transaction => `
            <div class="transaction-card">

                <h4>${transaction.type}</h4>

                <p>
                    Member:
                    ${transaction.name}
                </p>

                <p>
                    Phone:
                    ${transaction.phone}
                </p>

                <p>
                    Points:
                    ${transaction.points}
                </p>

                <p>
                    Amount:
                    ₹${transaction.amount}
                </p>

            </div>
        `).join("");

    } catch (error) {
        console.error("Transaction error:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
    loadMembers();
});
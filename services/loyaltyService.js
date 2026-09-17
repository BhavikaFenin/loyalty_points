const TIERS = [
    {
        name: "Regular",
        threshold: 0,
        rate: 1
    },
    {
        name: "Silver",
        threshold: 100,
        rate: 1.25
    },
    {
        name: "Gold",
        threshold: 500,
        rate: 1.5
    },
    {
        name: "Platinum",
        threshold: 5000,
        rate: 0.3
    }
];

function getTier(lifetimePoints) {
    let currentTier = TIERS[0];

    for (const tier of TIERS) {
        if (lifetimePoints >= tier.threshold) {
            currentTier = tier;
        }
    }

    return currentTier.name;
}

function getRate(lifetimePoints) {
    let currentTier = TIERS[0];

    for (const tier of TIERS) {
        if (lifetimePoints >= tier.threshold) {
            currentTier = tier;
        }
    }

    return currentTier.rate;
}

function calculatePurchasePoints(amount, lifetimePoints) {
    const rate = getRate(lifetimePoints);

    return Math.floor(amount * rate);
}

function getNextTier(lifetimePoints) {
    for (const tier of TIERS) {
        if (lifetimePoints < tier.threshold) {
            return {
                name: tier.name,
                threshold: tier.threshold,
                pointsNeeded: tier.threshold - lifetimePoints
            };
        }
    }

    return null;
}

module.exports = {
    TIERS,
    getTier,
    getRate,
    calculatePurchasePoints,
    getNextTier
};
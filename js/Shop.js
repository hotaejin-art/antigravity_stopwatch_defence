export default class Shop {
    constructor() {
        this.upgrades = {
            radius: { level: 1, maxLevel: 3, costs: [100, 200], name: 'Radius' },
            power: { level: 1, maxLevel: 3, costs: [150, 300], name: 'Power' },
            heal: { level: 1, maxLevel: 999, cost: 100, name: 'Repair' },
            maxHealth: { level: 1, maxLevel: 999, cost: 100, name: 'Fortify' }
        };
    }

    getUpgrade(name) {
        return this.upgrades[name];
    }

    getCost(name) {
        const upgrade = this.upgrades[name];
        if (!upgrade) return 999999;

        if (name === 'radius' || name === 'power') {
            if (upgrade.level >= upgrade.maxLevel) return 'MAX';
            return upgrade.costs[upgrade.level - 1];
        }

        return upgrade.cost;
    }

    // Returns true if purchase successful (state updated)
    purchase(name) {
        const upgrade = this.upgrades[name];
        if (!upgrade) return false;

        if (name === 'radius' || name === 'power') {
            if (upgrade.level >= upgrade.maxLevel) return false;
            upgrade.level++;
        }
        // Heal and MaxHealth don't "level up" in cost, just effect
        // We can track purchasing them if stats need tracking, but cost remains flat.

        return true;
    }
}

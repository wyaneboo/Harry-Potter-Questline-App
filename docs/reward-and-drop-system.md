# Reward and Drop System

## 📊 Reward System

When a quest is completed, the player receives **XP + Galleons** based on the quest's **difficulty level**:

| Difficulty | XP  | Galleons |
| ---------- | --- | -------- |
| **Easy**   | 10  | 5        |
| **Normal** | 30  | 12       |
| **Hard**   | 70  | 25       |
| **Boss**   | 150 | 50       |

- These are **default values** that can be customized via `settingsHelper.ts`
- Rewards are stored in the `settings` table as JSON under keys like `reward_easy`, `reward_normal`, etc.
- If no custom value is set, the defaults are used

---

## 🎁 Drop System

When a quest is completed, the player also has a chance to receive a **random item drop**.

### Rarity Tiers & Weights

| Rarity        | Weight | Chance |
| ------------- | ------ | ------ |
| **Common**    | 60     | ~60%   |
| **Rare**      | 25     | ~25%   |
| **Epic**      | 10     | ~10%   |
| **Legendary** | 4      | ~4%    |
| **Mythic**    | 1      | ~1%    |

### Default Drops (17 items)

**Common (5):**

- 🐸 Chocolate Frog
- 🫘 Bertie Bott's Beans
- 🎃 Pumpkin Juice
- 🪶 Quill
- 🖋️ Ink Bottle

**Rare (4):**

- 🍺 Butterbeer
- ♟️ Wizard Chess Piece
- 🔮 Remembrall
- 🔭 Sneakoscope

**Epic (3):**

- 🗺️ Marauder's Map
- ⏳ Time-Turner
- ✨ Felix Felicis

**Legendary (3):**

- 👻 Invisibility Cloak
- 🪄 Elder Wand
- 💎 Resurrection Stone

**Mythic (2):**

- 🔴 Philosopher's Stone
- ⚔️ Sword of Gryffindor

---

## 📦 Inventory System

- Items are stored in the `inventory` table with `drop_id` and `qty` (quantity)
- If you receive a duplicate item, the quantity increases instead of creating a new entry
- Can view inventory stats by rarity, unique items, and total count

---

## 🔄 Flow Summary

```
Quest Completed → Award XP → Award Galleons → Roll for Random Drop → Add to Inventory
```

The logic is managed atomically in `questActionsHelper.ts` to ensure rewards aren't lost if part of the process fails.

---

## Related Files

- [`settingsHelper.ts`](../services/settingsHelper.ts) - Reward configuration
- [`dropsHelper.ts`](../services/dropsHelper.ts) - Drop definitions
- [`inventoryHelper.ts`](../services/inventoryHelper.ts) - Inventory management
- [`questActionsHelper.ts`](../services/questActionsHelper.ts) - Quest completion logic

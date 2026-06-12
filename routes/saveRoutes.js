const express = require("express");
const mongoose = require("mongoose");
const Save = require("../models/Save");

const router = express.Router();
const memorySaves = new Map();
const allowedFields = [
  "playerName",
  "slot",
  "currentScene",
  "day",
  "energy",
  "stress",
  "money",
  "projectProgress",
  "studyProgress",
  "knowledge",
  "happiness",
  "hasLuckyCat",
  "hasReferenceBook",
  "difficulty",
  "achievements",
  "projectActionCount",
  "currentCharacterState",
  "unlockedEndings"
];

function cleanSave(payload) {
  return allowedFields.reduce((result, field) => {
    if (payload[field] !== undefined) result[field] = payload[field];
    return result;
  }, {});
}

function saveKey(playerName, slot) {
  return `${playerName}::${slot}`;
}

router.get("/:playerName/:slot?", async (req, res) => {
  try {
    const playerName = req.params.playerName.trim();
    const slot = Number(req.params.slot || 1);

    if (!Number.isInteger(slot) || slot < 1 || slot > 4) {
      return res.status(400).json({ message: "存檔槽位必須介於 1 到 4" });
    }

    const save =
      mongoose.connection.readyState === 1
        ? await Save.findOne({ playerName, slot }).lean()
        : memorySaves.get(saveKey(playerName, slot));

    if (!save) {
      return res.status(404).json({ message: "NO DATA" });
    }

    res.json(save);
  } catch (error) {
    res.status(500).json({ message: "讀取存檔失敗", error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = cleanSave(req.body);
    data.slot = Number(data.slot || 1);

    if (!data.playerName || !data.playerName.trim()) {
      return res.status(400).json({ message: "playerName 為必填欄位" });
    }
    if (!Number.isInteger(data.slot) || data.slot < 1 || data.slot > 4) {
      return res.status(400).json({ message: "存檔槽位必須介於 1 到 4" });
    }

    data.playerName = data.playerName.trim();
    let save;

    if (mongoose.connection.readyState === 1) {
      save = await Save.findOneAndUpdate(
        { playerName: data.playerName, slot: data.slot },
        data,
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      ).lean();
    } else {
      save = { ...data, updatedAt: new Date().toISOString() };
      memorySaves.set(saveKey(data.playerName, data.slot), save);
    }

    res.json({ message: `存檔 ${data.slot} 儲存成功`, save });
  } catch (error) {
    res.status(400).json({ message: "儲存失敗", error: error.message });
  }
});

module.exports = router;

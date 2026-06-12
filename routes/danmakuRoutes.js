const express = require("express");
const mongoose = require("mongoose");
const Danmaku = require("../models/Danmaku");

const router = express.Router();
const memoryDanmaku = [];

async function getDanmaku(day) {
  if (mongoose.connection.readyState === 1) {
    const query = day ? { day } : {};
    return Danmaku.find(query).sort({ createdAt: -1 }).limit(100).lean();
  }

  return memoryDanmaku
    .filter((item) => !day || item.day === day)
    .slice()
    .reverse();
}

router.get("/", async (req, res) => {
  try {
    const day = req.query.day ? Number(req.query.day) : null;
    res.json(await getDanmaku(day));
  } catch (error) {
    res.status(500).json({ message: "讀取彈幕失敗", error: error.message });
  }
});

router.get("/:day", async (req, res) => {
  try {
    const day = Number(req.params.day);
    if (!Number.isInteger(day) || day < 1 || day > 21) {
      return res.status(400).json({ message: "day 必須介於 1 到 21" });
    }
    res.json(await getDanmaku(day));
  } catch (error) {
    res.status(500).json({ message: "讀取彈幕失敗", error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    if (
      process.env.NODE_ENV === "production" &&
      mongoose.connection.readyState !== 1
    ) {
      return res.status(503).json({
        message: "彈幕資料庫尚未連線，內容未送出。請檢查 MONGODB_URI。"
      });
    }

    const data = {
      name: String(req.body.name || "").trim(),
      content: String(req.body.content || "").trim(),
      color: req.body.color || "#ffffff",
      day: Number(req.body.day)
    };

    if (!data.name || !data.content) {
      return res.status(400).json({ message: "暱稱與彈幕內容不可空白" });
    }
    if (!Number.isInteger(data.day) || data.day < 1 || data.day > 21) {
      return res.status(400).json({ message: "出現天數必須介於 1 到 21" });
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(data.color)) {
      return res.status(400).json({ message: "顏色格式不正確" });
    }

    let danmaku;
    if (mongoose.connection.readyState === 1) {
      danmaku = await Danmaku.create(data);
    } else {
      danmaku = {
        ...data,
        _id: `memory-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      memoryDanmaku.push(danmaku);
    }

    res.status(201).json({
      message: "彈幕新增成功",
      storage: mongoose.connection.readyState === 1 ? "mongodb" : "memory",
      persistent: mongoose.connection.readyState === 1,
      danmaku
    });
  } catch (error) {
    res.status(400).json({ message: "新增彈幕失敗", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let deleted = false;

    if (mongoose.connection.readyState === 1) {
      const result = await Danmaku.findByIdAndDelete(id);
      deleted = Boolean(result);
    } else {
      const index = memoryDanmaku.findIndex((item) => item._id === id);
      if (index !== -1) {
        memoryDanmaku.splice(index, 1);
        deleted = true;
      }
    }

    if (!deleted) {
      return res.status(404).json({ message: "找不到這則彈幕" });
    }
    res.json({ message: "彈幕已刪除" });
  } catch (error) {
    res.status(400).json({ message: "刪除彈幕失敗", error: error.message });
  }
});

module.exports = router;

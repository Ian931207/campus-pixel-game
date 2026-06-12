const mongoose = require("mongoose");

const danmakuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80
  },
  color: {
    type: String,
    default: "#ffffff",
    match: /^#[0-9a-fA-F]{6}$/
  },
  day: {
    type: Number,
    required: true,
    min: 1,
    max: 21
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Danmaku", danmakuSchema);

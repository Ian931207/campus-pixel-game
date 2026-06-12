const mongoose = require("mongoose");

const saveSchema = new mongoose.Schema(
  {
    playerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30
    },
    slot: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
      default: 1
    },
    currentScene: {
      type: String,
      default: "room"
    },
    day: {
      type: Number,
      min: 1,
      default: 1
    },
    energy: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    stress: {
      type: Number,
      min: 0,
      max: 100,
      default: 10
    },
    money: {
      type: Number,
      min: 0,
      default: 500
    },
    projectProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    studyProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    knowledge: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    happiness: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    hasLuckyCat: {
      type: Boolean,
      default: false
    },
    hasReferenceBook: {
      type: Boolean,
      default: false
    },
    difficulty: {
      type: String,
      enum: ["easy", "normal", "hard"],
      default: "normal"
    },
    achievements: {
      type: [String],
      default: []
    },
    projectActionCount: {
      type: Number,
      min: 0,
      default: 0
    },
    currentCharacterState: {
      type: String,
      enum: ["computer", "seal", "music", "reading"],
      default: "computer"
    },
    unlockedEndings: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

saveSchema.index({ playerName: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model("Save", saveSchema);

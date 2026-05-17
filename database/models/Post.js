const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    currentTitle: { type: String, default: "" },
    currentVersion: { type: mongoose.Types.ObjectId, ref: "PostVersion" },
    creator: { type: mongoose.Types.ObjectId, ref: "User", immutable: true },
    image: {
      url: String,
      id: String,
      source: String,
    },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    postedAt: { type: Date },
  },
  { timestamps: true },
);

const Post = mongoose.model("Post", postSchema);

module.exports = Post;

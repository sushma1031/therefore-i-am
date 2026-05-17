const mongoose = require("mongoose");

const postVersionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: "" },
  postID: { type: mongoose.Types.ObjectId, ref: "Post", required: true },
  versionNum: { type: Number, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const PostVersion = mongoose.model("PostVersion", postVersionSchema);

module.exports = PostVersion;

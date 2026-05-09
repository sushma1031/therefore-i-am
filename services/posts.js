const Post = require("../database/models/Post.js");
const { ObjectId } = require("mongoose").Types;
const sanitizeHtml = require("sanitize-html");
const cloudinary = require("cloudinary").v2;
const config = require("../config.js"); // TODO: remove!

const PostStatus = Object.freeze({
  DRAFT: "draft",
  PUBLISHED: "published",
});

const getRecentPosts = (count = 3) => {
  return Post.find({ status: PostStatus.PUBLISHED }).sort({ postedAt: -1 }).limit(count);
};

const getAllPosts = () => {
  return Post.find({ status: PostStatus.PUBLISHED }, { creator: 0 }).sort({ postedAt: -1 });
};

const searchPosts = (query) => {
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = { title: new RegExp(escapedQuery, "i"), status: PostStatus.PUBLISHED };
  return Post.find(filter, { title: 1 });
};

const getPostById = (id) => {
  return Post.findOne({ _id: id, status: PostStatus.PUBLISHED }).populate("creator", "username");
};

const getPostForEdit = (id) => {
  return Post.findById(id);
};

const createPost = ({ title, content, file, imageSource, userId }) => {
  if (!title || title.trim().length === 0 || !content) {
    const err = new Error("Title or content cannot be empty.");
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  let imageData = undefined;

  if (file != null) {
    if (!imageSource || imageSource.trim().length === 0) {
      const err = new Error("Provide the source/credit for the uploaded image.");
      err.code = "VALIDATION_ERROR";
      throw err;
    }

    imageData = {
      url: file.path,
      id: file.filename,
      source: sanitizeHtml(imageSource, {
        allowedTags: ["a"],
        allowedAttributes: { a: ["href"] },
      }),
    };
  }

  const sanitizedContent = sanitizeHtml(content);

  return Post.create({
    title: title.trim(),
    content: sanitizedContent,
    creator: new ObjectId(userId),
    image: imageData,
    status: PostStatus.PUBLISHED,
    postedAt: new Date(),
  });
};

// Updates and returns the previous state of the document.
const updatePost = async (id, fields, image) => {
  const updates = {};
  const allowedFields = ["title", "content", "imageSource"];

  allowedFields.forEach((field) => {
    if (field in fields) {
      if (field === "imageSource") {
        updates["image.source"] = fields.imageSource
          ? sanitizeHtml(fields.imageSource, { allowedTags: ["a"], allowedAttributes: { a: ["href"] } })
          : "";
      } else if (field === "content") {
        updates[field] = sanitizeHtml(fields[field]);
      } else {
        updates[field] = fields[field];
      }
    }
  });

  if (image) {
    updates["image.url"] = image.path;
    updates["image.id"] = image.filename;
  }

  let oldPost;
  try {
    oldPost = await Post.findByIdAndUpdate(id, { $set: updates }, { runValidators: true });
  } catch (error) {
    if (error.name === "CastError") {
      const err = new Error();
      err.code = "INVALID_ID";
      throw err;
    } else if (error.name === "ValidationError") {
      const err = new Error();
      err.code = "INVALID_BODY";
      throw err;
    }
    console.error(`Post edit ${id}: Failed to update post: `, error);
    throw error;
  }

  if (!oldPost) {
    const err = new Error();
    err.code = "NOT_FOUND";
    throw err;
  }

  if (image && oldPost.image?.id) {
    try {
      await cloudinary.uploader.destroy(oldPost.image.id);
    } catch (error) {
      console.error(`Post edit ${id}: Failed to delete previous image: `, error);
    }
  }

  return oldPost;
};

const deletePostById = async (id) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(id);
    if (!deletedPost) return null;

    if (deletedPost.image?.id) {
      try {
        await cloudinary.uploader.destroy(deletedPost.image.id);
      } catch (err) {
        console.error(`Cleanup failed for image: ${deletedPost.image.id}:`, err);
      }
    }

    return deletedPost;
  } catch (err) {
    if (err.name === "CastError") {
      const error = new Error();
      error.code = "INVALID_ID";
      throw error;
    }

    console.error(`Post delete ${id}: Failed to delete post from DB:`, err);
    const error = new Error();
    error.code = "DB_DELETE_FAILED";
    throw error;
  }
};

const getAllDrafts = () => {
  return Post.find({ status: PostStatus.DRAFT }).populate("creator", "username").sort({ createdAt: -1 });
};

const createDraft = ({ title, content, file, imageSource, userId }) => {
  if (!title || title.trim().length === 0 || !content) {
    const err = new Error("Title or content cannot be empty.");
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  let imageData = undefined;

  if (file != null) {
    if (!imageSource || imageSource.trim().length === 0) {
      const err = new Error("Provide the source/credit for the uploaded image.");
      err.code = "VALIDATION_ERROR";
      throw err;
    }

    imageData = {
      url: file.path,
      id: file.filename,
      source: sanitizeHtml(imageSource, {
        allowedTags: ["a"],
        allowedAttributes: { a: ["href"] },
      }),
    };
  }

  const sanitizedContent = sanitizeHtml(content);

  return Post.create({
    title: title.trim(),
    content: sanitizedContent,
    creator: new ObjectId(userId),
    image: imageData,
    status: PostStatus.DRAFT,
  });
};

const getDraftById = (id) => {
  return Post.findOne({ _id: id, status: PostStatus.DRAFT }).populate("creator", "username");
};

const publishDraft = (id) => {
  return Post.updateOne({ _id: id }, { $set: { status: PostStatus.PUBLISHED, postedAt: new Date() } });
};

module.exports = {
  PostStatus,
  getRecentPosts,
  getAllPosts,
  searchPosts,
  getPostById,
  getPostForEdit,
  createPost,
  updatePost,
  deletePostById,
  getAllDrafts,
  createDraft,
  getDraftById,
  publishDraft,
};

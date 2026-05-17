const mongoose = require("mongoose");
const Post = require("../database/models/Post.js");
const PostVersion = require("../database/models/PostVersion.js");
const { ObjectId } = require("mongoose").Types;
const sanitizeHtml = require("sanitize-html");
const cloudinary = require("cloudinary").v2;

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
  const filter = { currentTitle: new RegExp(escapedQuery, "i"), status: PostStatus.PUBLISHED };
  return Post.find(filter, { currentTitle: 1 });
};

const getPostById = (id) => {
  return Post.findOne({ _id: id, status: PostStatus.PUBLISHED })
    .populate("creator", "username")
    .populate("currentVersion", "title content -_id");
};

const getPostForEdit = (id) => {
  return Post.findById(id).populate("currentVersion", "title content -_id");
};

const createPost = async ({ title, content, file, imageSource, userID }) => {
  if (title) {
    title = title.trim();
  }
  if (!title || !content) {
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

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const opts = { session };

    const [post] = await Post.create(
      [
        {
          creator: new ObjectId(userID),
          image: imageData,
          status: PostStatus.PUBLISHED,
          postedAt: new Date(),
        },
      ],
      opts,
    );

    const [version] = await PostVersion.create(
      [
        {
          postID: post._id,
          title: title,
          content: sanitizedContent,
          versionNum: 1,
        },
      ],
      opts,
    );

    post.currentVersion = version._id;
    post.currentTitle = version.title;
    await post.save(opts);

    await session.commitTransaction();

    return post;
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    console.error(`Post create:`, error);
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

const updatePost = async (id, fields, image) => {
  const allowedFields = ["title", "content", "imageSource"];
  let session;
  let oldImageId;

  try {
    const post = await Post.findById(id).populate("currentVersion", "title content versionNum -_id");

    if (!post) {
      const err = new Error();
      err.code = "NOT_FOUND";
      throw err;
    }

    const contentUpdates = {};
    allowedFields.forEach((field) => {
      if (!(field in fields)) return;
      if (field === "imageSource") {
        if (!post.image) {
          post.image = {};
        }
        post.image.source = fields.imageSource
          ? sanitizeHtml(fields.imageSource, { allowedTags: ["a"], allowedAttributes: { a: ["href"] } })
          : "";
      } else if (field === "content") {
        contentUpdates.content = sanitizeHtml(fields.content);
      } else if (field === "title") {
        contentUpdates.title = fields.title.trim();
      }
    });

    if (image) {
      oldImageId = post.image?.id;
      if (!post.image) {
        post.image = {};
      }
      post.image.url = image.path;
      post.image.id = image.filename;
    }

    session = await mongoose.startSession();
    session.startTransaction();
    const opts = { session };

    const [newVersion] = await PostVersion.create(
      [
        {
          postID: post._id,
          title: contentUpdates.title ?? post.currentVersion.title,
          content: contentUpdates.content ?? post.currentVersion.content,
          versionNum: post.currentVersion.versionNum + 1,
        },
      ],
      opts,
    );

    post.currentVersion = newVersion._id;
    if (contentUpdates.title != null) {
      post.currentTitle = contentUpdates.title;
    }

    const updatedPost = await post.save(opts);
    await session.commitTransaction();

    if (oldImageId) {
      try {
        await cloudinary.uploader.destroy(oldImageId);
      } catch (err) {
        console.error(`Post edit ${id}: Failed to delete previous image: `, err);
      }
    }

    return updatedPost;
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }

    if (error.code === "NOT_FOUND") {
      throw error;
    }

    if (error.name === "CastError") {
      const err = new Error();
      err.code = "INVALID_ID";
      throw err;
    }
    if (error.name === "ValidationError") {
      const err = new Error();
      err.code = "INVALID_BODY";
      throw err;
    }

    console.error(`Post edit ${id}: Failed to update post: `, error);
    throw error;
  } finally {
    if (session) session.endSession();
  }
};

const deletePostById = async (id) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const opts = { session };

    const deletedPost = await Post.findByIdAndDelete(id, opts);
    if (!deletedPost) {
      await session.abortTransaction();
      return null;
    }

    await PostVersion.deleteMany({ postID: id }, opts);

    await session.commitTransaction();

    if (deletedPost.image?.id) {
      try {
        await cloudinary.uploader.destroy(deletedPost.image.id);
      } catch (err) {
        console.error(`Cleanup failed for image: ${deletedPost.image.id}:`, err);
      }
    }

    return deletedPost;
  } catch (err) {
    if (session) {
      await session.abortTransaction();
    }

    if (err.name === "CastError") {
      const error = new Error();
      error.code = "INVALID_ID";
      throw error;
    }

    console.error(`Post delete ${id}: Failed to delete post from DB:`, err);
    const error = new Error();
    error.code = "DB_DELETE_FAILED";
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

const getAllDrafts = () => {
  return Post.find({ status: PostStatus.DRAFT }).populate("creator", "username").sort({ createdAt: -1 });
};

const createDraft = async ({ title, content, file, imageSource, userID }) => {
  if (title) {
    title = title.trim();
  }

  if (!title || !content) {
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

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const opts = { session };

    const [draft] = await Post.create(
      [
        {
          creator: new ObjectId(userID),
          image: imageData,
          status: PostStatus.DRAFT,
        },
      ],
      opts,
    );

    const [version] = await PostVersion.create(
      [
        {
          postID: draft._id,
          title: title,
          content: sanitizedContent,
          versionNum: 1,
        },
      ],
      opts,
    );

    draft.currentVersion = version._id;
    draft.currentTitle = version.title;
    await draft.save(opts);

    await session.commitTransaction();

    return draft;
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    console.error(`Draft create: `, error);
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

const getDraftById = (id) => {
  return Post.findOne({ _id: id, status: PostStatus.DRAFT })
    .populate("creator", "username")
    .populate("currentVersion", "title content -_id");
};

const publishDraft = (id) => {
  return Post.updateOne({ _id: id }, { $set: { status: PostStatus.PUBLISHED, postedAt: new Date() } });
};

const getPostHistory = async (postID, count = 0) => {
  try {
    const query = PostVersion.find({ postID }, { __v: 0, content: 0 }).sort({ versionNum: -1 });
    if (count > 0) {
      query.limit(count);
    }
    const versions = await query;
    return versions;
  } catch (error) {
    if (error.name === "CastError") {
      const err = new Error();
      err.code = "INVALID_ID";
      throw err;
    }

    console.log(`Post version history: ${postID}: failed to fetch versions:`, error);
    throw err;
  }
};

const getVersion = async (postID, versionID) => {
  let version;
  try {
    version = await PostVersion.findOne({ _id: versionID, postID: postID });
    return version;
  } catch (error) {
    if (error.name === "CastError") {
      const err = new Error();
      err.code = "INVALID_VERSION";
      throw err;
    }

    console.log(`Fetch post version ${versionID}:`, error);
    throw error;
  }
};

const restoreVersion = async (postID, versionID) => {
  let versionToRestore;
  try {
    versionToRestore = await PostVersion.findOne({ _id: versionID, postID: postID }).populate(
      "postID",
      "currentVersion status",
    );
  } catch (error) {
    if (error.name === "CastError") {
      const err = new Error();
      err.code = "INVALID_VERSION";
      throw err;
    }

    console.log(`Restore version ${versionID}: Failed to fetch version:`, error);
    throw error;
  }

  if (!versionToRestore) {
    const err = new Error();
    err.code = "INVALID_VERSION";
    throw err;
  }

  if (versionToRestore.postID.currentVersion.equals(versionID)) {
    console.log(`Restore version ${versionID}: Already the current version, skipping.`);
    return { status: versionToRestore.postID.status };
  }

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const opts = { session };

    const highestVersion = await PostVersion.findOne({ postID: versionToRestore.postID._id })
      .sort({ versionNum: -1 })
      .select("versionNum")
      .session(session);

    const [newVersion] = await PostVersion.create(
      [
        {
          postID: versionToRestore.postID._id,
          title: versionToRestore.title,
          content: versionToRestore.content,
          versionNum: highestVersion.versionNum + 1,
        },
      ],
      opts,
    );

    await Post.updateOne(
      { _id: versionToRestore.postID._id },
      { $set: { currentVersion: newVersion._id, currentTitle: versionToRestore.title } },
    );

    await session.commitTransaction();

    return { status: versionToRestore.postID.status };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    console.error(`Restore version ${versionID}:`, error);
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
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
  getPostHistory,
  getVersion,
  restoreVersion,
};

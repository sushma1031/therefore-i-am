const postService = require("../services/posts.js");
const date = require("../utils/date.js");
const config = require("../config.js");

function getPostBasePath(status) {
  return status === postService.PostStatus.DRAFT ? "/posts/drafts" : "/posts";
}

const renderHome = (req, res) => {
  postService
    .getRecentPosts()
    .then((posts) => {
      posts.forEach((post) => {
        post.title = post.currentTitle;
        post.relativeDate = date.calcRelativeDate(post.postedAt);
      });
      res.render("home", { posts, defaultImage: config.defaultPostImage.url });
    })
    .catch((err) => {
      console.error("Posts fetch: Unexpected error: ", err);
      res.status(500).render("errors/500", {
        statusCode: 500,
        message: "Failed to fetch posts.",
      });
    });
};

const searchPosts = (req, res) => {
  const rawQuery = req.query["title"];
  let query;

  if (!(typeof rawQuery === "string") || (query = rawQuery.trim()) === "") {
    return res.status(400).render("errors/400", {
      statusCode: 400,
      message: "Missing or empty value for 'title'.",
    });
  }

  postService
    .searchPosts(query)
    .then((posts) => {
      posts.forEach((post) => {
        post.title = post.currentTitle;
        post.dateString = date.getDate(post.postedAt);
      });
      res.render("search", { posts, query });
    })
    .catch((err) => {
      console.error("Posts fetch: Unexpected error: ", err);
      res.status(500).render("errors/500", {
        statusCode: 500,
        message: "Failed to fetch posts.",
      });
    });
};

const getAllPosts = (req, res) => {
  postService
    .getAllPosts()
    .then((posts) => {
      posts.forEach((post) => {
        post.title = post.currentTitle;
        post.dateString = date.getDate(post.postedAt);
      });
      res.render("posts", { posts, title: "All Posts", viewBasePath: "/posts" });
    })
    .catch((err) => {
      console.error("Posts fetch: Unexpected error: ", err);
      res.status(500).render("errors/500", {
        statusCode: 500,
        message: "Failed to fetch posts.",
      });
    });
};

const renderPost = (req, res) => {
  postService
    .getPostById(req.params.postID)
    .then((post) => {
      if (post) {
        return res.render("post", {
          status: postService.PostStatus.PUBLISHED,
          id: post._id,
          title: post.currentVersion.title,
          content: post.currentVersion.content,
          username: post.creator?.username || "Anonymous",
          datePosted: date.getDate(post.postedAt),
          imageURL: post.image?.url,
          imageSource: post.image?.source,
        });
      } else {
        return res.status(404).render("errors/404", {
          title: "Not Found",
          message: "We couldn't find the post you're looking for.",
          redirect: "/posts",
          redirectText: "All Posts",
        });
      }
    })
    .catch((error) => {
      console.error(`Post fetch ${req.params.postID}: Unexpected error: `, error);
      res.status(500).render("errors/500", {
        statusCode: 500,
        message: "An unexpected error occurred.",
      });
    });
};

const renderCompose = (req, res) => {
  res.render("compose");
};

const createPost = async (req, res) => {
  try {
    const post = await postService.createPost({
      title: req.body.title,
      content: req.body.content,
      file: req.file && Object.keys(req.file).length > 0 ? req.file : null,
      imageSource: req.body.imageSource ? req.body.imageSource : "",
      userId: req.session.userId,
    });
    res.redirect(`/posts/${post._id}`);
  } catch (err) {
    if (err.code === "VALIDATION_ERROR") {
      return res.status(400).render("errors/400", {
        statusCode: 400,
        message: err.message,
      });
    }
    console.error("Post create: Unexpected error: ", err);
    res.status(500).render("errors/500", {
      statusCode: 500,
      message: "An unexpected error occurred while creating post.",
    });
  }
};

const renderEdit = (req, res) => {
  postService
    .getPostForEdit(req.params.postID)
    .then((post) => {
      if (post) {
        let regex = /(^.*upload\/)(.*)/;
        let thumbnailUrl = "";
        if (post.image?.url) thumbnailUrl = post.image.url.replace(regex, `$1c_thumb,w_200,g_face/$2`);
        res.render("edit", {
          status: post.status,
          title: post.currentVersion.title,
          content: post.currentVersion.content,
          username: post.username,
          thumbnail: thumbnailUrl,
          imageSource: post.image?.source || "",
          id: post._id,
        });
      } else {
        res.status(404).render("errors/404", {
          statusCode: 404,
          message: "Post not found.",
          redirect: "/posts",
          redirectText: "All Posts",
        });
      }
    })
    .catch((error) => {
      console.error(`Post edit ${req.params.postID}: Unexpected error fetching: `, error);
      res.status(500).render("errors/500", {
        statusCode: 500,
        message: "An unexpected error occurred.",
      });
    });
};

const updatePost = async (req, res) => {
  try {
    const updatedPost = await postService.updatePost(
      req.params.postID,
      req.body,
      req.file && Object.keys(req.file).length > 0 ? req.file : null,
    );

    res.redirect(`${getPostBasePath(updatedPost.status)}/${req.params.postID}`);
  } catch (error) {
    if (error.code === "INVALID_ID" || error.code === "NOT_FOUND") {
      return res.status(404).render("errors/404", {
        statusCode: 404,
        message: "Post not found.",
        redirect: "/posts",
        redirectText: "All Posts",
      });
    }
    if (error.code === "INVALID_BODY") {
      return res.status(400).render("errors/400", {
        statusCode: 400,
        message: "Some information is incorrect.",
      });
    }

    console.error(`Post edit ${req.params.postID}: Unexpected error saving: `, error);
    res.status(500).render("errors/500", {
      statusCode: 500,
      message: "An unexpected error occurred while saving changes.",
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await postService.deletePostById(req.params.postID);
    if (!post) {
      console.warn(`Post delete ${req.params.postID}: Not found.`);
      return res.status(404).render("errors/404", {
        statusCode: 404,
        message: "No post found with the given ID.",
      });
    }

    res.redirect(getPostBasePath(post.status));
  } catch (error) {
    if (error.code === "INVALID_ID") {
      return res.status(404).render("errors/404", {
        statusCode: 404,
        message: "Post not found.",
        redirect: "/posts",
        redirectText: "All Posts",
      });
    }

    if (error.code === "DB_DELETE_FAILED") {
      return res.status(500).render("errors/500", {
        statusCode: 500,
        message: "Failed to delete post. Please try again later.",
      });
    }

    console.error(`Post delete ${req.params.postID}: Unexpected error: `, error);
    res.status(500).render("errors/500", {
      statusCode: 500,
      message: "An unexpected error occurred while deleting the post.",
    });
  }
};

const getAllDrafts = async (req, res) => {
  try {
    const drafts = await postService.getAllDrafts();
    drafts.forEach((draft) => {
      draft.title = draft.currentTitle;
      draft.dateString = `Last updated: ${date.calcRelativeDate(draft.updatedAt)}`;
    });
    res.render("posts", { posts: drafts, title: "Drafts", viewBasePath: "/posts/drafts" });
  } catch (error) {
    console.error("Drafts fetch: Unexpected error: ", error);
    res.status(500).render("errors/500", {
      statusCode: 500,
      message: "Failed to fetch drafts.",
    });
  }
};

const createDraft = async (req, res) => {
  try {
    const draft = await postService.createDraft({
      title: req.body.title,
      content: req.body.content,
      file: req.file && Object.keys(req.file).length > 0 ? req.file : null,
      imageSource: req.body.imageSource ? req.body.imageSource : "",
      userId: req.session.userId,
    });
    res.redirect(`/posts/${draft._id}/edit`);
  } catch (err) {
    if (err.code === "VALIDATION_ERROR") {
      return res.status(400).render("errors/400", {
        statusCode: 400,
        message: err.message,
      });
    }
    console.error("Draft create: Unexpected error: ", err);
    res.status(500).render("errors/500", {
      statusCode: 500,
      message: "An unexpected error occurred while creating draft.",
    });
  }
};

const renderDraft = async (req, res) => {
  try {
    const post = await postService.getDraftById(req.params.postID);

    if (!post) {
      return res.status(404).render("errors/404", {
        title: "Not Found",
        message: "We couldn't find the post you're looking for.",
        redirect: "/posts/drafts",
        redirectText: "All Drafts",
      });
    }

    return res.render("post", {
      status: postService.PostStatus.DRAFT,
      id: post._id,
      title: post.currentVersion.title,
      content: post.currentVersion.content,
      username: post.creator?.username || "Anonymous",
      imageURL: post.image?.url,
      imageSource: post.image?.source,
    });
  } catch (error) {
    console.error(`Draft fetch ${req.params.postID}: Unexpected error: `, error);
    res.status(500).render("errors/500", {
      statusCode: 500,
      message: "An unexpected error occurred.",
    });
  }
};

const publishDraft = async (req, res) => {
  try {
    await postService.publishDraft(req.params.postID);

    res.redirect(`/posts/${req.params.postID}`);
  } catch (error) {
    console.error(`Draft publish ${req.params.postID}: Unexpected error: `, error);
    res.status(500).render("errors/500", {
      statusCode: 500,
      message: "An unexpected error occurred.",
    });
  }
};

const getPostHistory = async (req, res) => {
  try {
    const versions = await postService.getPostHistory(req.params.postID);

    if (versions.length === 0) {
      return res.status(404).render("errors/404", {
        statusCode: 404,
        message: "Post not found.",
      });
    }

    res.render("history", {
      postID: versions[0].postID,
      title: versions[0].title,
      versions,
    });
  } catch (error) {
    if (error.code === "INVALID_ID") {
      return res.status(404).render("errors/404", {
        statusCode: 404,
        message: "Post not found.",
      });
    }

    console.error(`Versions fetch: ${req.params.postID}: Unexpected error: `, error);
    res.status(500).render("errors/500", {
      statusCode: 500,
      message: "An unexpected error occurred.",
    });
  }
};

const getPostVersion = async (req, res) => {
  try {
    const version = await postService.getVersion(req.params.postID, req.params.versionID);
    if (!version) {
      return res.status(404).json({ error: "Version not found." });
    }

    res.json(version);
  } catch (error) {
    if (error.code === "INVALID_VERSION") {
      return res.status(404).json({ error: "Version not found." });
    }

    res.status(500).json({ error: "An unexpected error occurred while fetching the version." });
  }
};

const restorePostVersion = async (req, res) => {
  let versionID = req.body["versionID"];

  if (versionID) {
    versionID = versionID.trim();
  }

  if (!versionID) {
    return res.status(400).render("errors/400", {
      statusCode: 400,
      message: "Version ID missing.",
    });
  }

  try {
    const { status } = await postService.restoreVersion(req.params.postID, versionID);
    return res.redirect(`${getPostBasePath(status)}/${req.params.postID}`);
  } catch (error) {
    if (error.code === "INVALID_VERSION") {
      return res.status(404).render("errors/404", {
        statusCode: 404,
        message: "Version not found.",
      });
    }

    console.error(`Restore version ${req.params.postID}: Unexpected error: `, error);
    res.status(500).render("errors/500", {
      statusCode: 500,
      message: "An unexpected error occurred while restoring the version.",
    });
  }
};

module.exports = {
  renderHome,
  searchPosts,
  getAllPosts,
  renderPost,
  renderCompose,
  createPost,
  renderEdit,
  updatePost,
  deletePost,
  getAllDrafts,
  createDraft,
  renderDraft,
  publishDraft,
  getPostHistory,
  getPostVersion,
  restorePostVersion,
};

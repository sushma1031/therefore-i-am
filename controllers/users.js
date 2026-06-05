const userService = require("../services/users.js");

const renderLogin = (req, res) => {
  let message;
  switch (req.query.error) {
    case "server":
      message = "Internal server error.";
      break;
    case "invalidcredentials":
      message = "Invalid credentials provided.";
      break;
    default:
      message = undefined;
  }
  res.render("login", { errorMessage: message });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await userService.findByEmail(email);

    if (!user) {
      return res.redirect("/login?error=invalidcredentials");
    }

    const isPasswdMatch = await userService.validatePassword(password, user.password);
    if (!isPasswdMatch) {
      return res.redirect("/login?error=invalidcredentials");
    }

    req.session.userId = user._id;

    const redirectTo = req.query.redirect ? decodeURIComponent(req.query.redirect) : "/";
    if (redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      return res.redirect(redirectTo);
    }
    return res.redirect("/");
  } catch (error) {
    if (error?.code === "PASSWORD_HASH_ERROR") {
      console.error(`Hash and compare password (email: ${email}): ${error}`);
      return res.redirect("/login?error=server");
    }

    console.error(`Unexpected error while logging in user: ${email}:`, error);
    res.redirect("/login?error=server");
  }
};

const logout = (req, res) => {
  if (req.session && req.session.userId) {
    req.session.destroy((err) => {
      if (err) {
        console.error(`Destroy session for user: ${req.session.userId}:`, err);
      }
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  } else {
    res.redirect("/login");
  }
};

const deleteUser = async (req, res) => {
  const userID = req.params.userID;
  if (!userID) {
    return res.status(400).render("errors/400", {
      statusCode: 400,
      message: "No user ID provided.",
    });
  }

  if (userID !== req.session.userId) {
    console.warn(`User ${req.session.userId} attempt to delete user: ${userID}.`);
    return res.status(403).render("errors/403", {
      statusCode: 403,
      message: "Forbidden action.",
    });
  }

  try {
    await userService.deleteUserById(userID);
    console.log(`User deletion successful: ${userID}.`);

    req.session.destroy((error) => {
      if (error) {
        console.error(`User session deletion: ${userID}:`, error);
      }
      res.redirect("/");
    });
  } catch (error) {
    if (error.code === "INVALID_ID" || error.code === "NOT_FOUND") {
      return res.status(404).render("errors/404", {
        statusCode: 404,
        message: "User not found.",
      });
    }

    if (error.code === "CANNOT_DELETE_LAST_ADMIN") {
      return res.status(400).render("errors/400", {
        statusCode: 400,
        message: "Cannot delete the last remaining admin.",
      });
    }

    console.error(`Unexpected error while deleting user: ${userID}:`, error);
    res.status(500).render("errors/500", {
      statusCode: 500,
      message: "An unexpected error occurred while deleting account.",
    });
  }
};

module.exports = { deleteUser, renderLogin, login, logout };

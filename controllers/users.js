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

const login = (req, res) => {
  const { email, password } = req.body;

  userService
    .findByEmail(email)
    .then((foundUser) => {
      if (!foundUser) {
        return res.redirect("/login?error=invalidcredentials");
      }
      userService
        .validatePassword(password, foundUser.password)
        .then((result) => {
          if (result) {
            req.session.userId = foundUser._id;
            return res.redirect("/");
          }
          return res.redirect("/login?error=invalidcredentials");
        })
        .catch((err) => {
          console.error("Bcrypt error:", err);
          return res.redirect("/login?error=server");
        });
    })
    .catch((error) => {
      console.error(`Unexpected error while logging in user: ${email}`, error);
      res.redirect("/login?error=server");
    });
};

const logout = (req, res) => {
  if (req.session && req.session.userId) {
    req.session.destroy((err) => {
      if (err) {
        console.error(`Error destroying session for user: ${req.session.userId}`, err);
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
      message: "User deletion error: No user ID provided.",
    });
  }

  if (userID !== req.session.userId) {
    console.warn("Danger: User trying to delete different user's account.");
    return res.status(403).render("errors/403", {
      statusCode: 403,
      message: "Forbidden action.",
    });
  }

  try {
    const user = await userService.deleteUserById(userID);
    if (!user) {
      console.warn(`Danger: User ${req.session.userId} tried to delete account ${userID}.`);
      return res.status(404).render("errors/404", {
        statusCode: 404,
        message: "Invalid user provided.",
      });
    }
    console.log(`User deletion successful: ${user.username} (${userID}).`);
    req.session.destroy((error) => {
      if (error) {
        console.error(`User session deletion error: Error destroying session for user: ${userID}`, error);
      }
      res.redirect("/");
    });
  } catch (error) {
    console.error(`Unexpected error while deleting user: ${userID}`, error);
    res.status(500).render("errors/500", {
      statusCode: 500,
      message: "An unexpected error occurred while deleting account.",
    });
  }
};

module.exports = { deleteUser, renderLogin, login, logout };

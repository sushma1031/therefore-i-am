const userService = require("../services/users.js");

const redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect("/");
  } else next();
};

const authenticate = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    const redirect = encodeURIComponent(req.originalUrl);
    return res.redirect(`/login?redirect=${redirect}`);
  }

  try {
    const user = await userService.findById(req.session.userId, ["username"]);
    if (user) {
      res.locals.username = user.username;
      return next();
    }

    const redirect = encodeURIComponent(req.originalUrl);
    return req.session.destroy(() => {
      res.redirect(`/login?redirect=${redirect}`);
    });
  } catch (error) {
    console.error("Authentication middleware:", error);
    next(error)
  }
};

module.exports = { redirectIfAuthenticated, authenticate };

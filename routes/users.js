const express = require("express");
const router = express.Router();
const usersController = require("../controllers/users.js");
const { redirectIfAuthenticated, authenticate } = require("../middleware/auth.js");

router.get("/login", redirectIfAuthenticated, usersController.renderLogin);
router.post("/login", redirectIfAuthenticated, usersController.login);
router.get("/logout", usersController.logout);

router.get("/users/:userID/delete", authenticate, usersController.deleteUser);

module.exports = router;

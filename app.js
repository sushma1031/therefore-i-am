const config = require("./config.js");
const express = require("express");
const { connectDB, closeDBConn } = require("./database/db.js");
const expressSession = require("express-session");
const connectMongo = require("connect-mongo");
const seedAdmins = require("./startup/seedAdmins.js");
const routes = require("./routes/index.js");

const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Enabling Sessions
const TWELVE_HOURS = 1000 * 60 * 60 * 12;
app.use(
  expressSession({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: connectMongo.create({
      mongoUrl: config.mongoURI,
    }),
    cookie: {
      maxAge: TWELVE_HOURS,
    },
  }),
);

app.use(function (req, res, next) {
  res.locals = {
    auth: req.session.userId,
    scripts: config.scripts,
  };
  next();
});

app.use(routes);

app.use((req, res) => {
  res.status(404).render("errors/404", { title: "Page Not Found" });
});

app.use((err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.url}:`, err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || "An unexpected error occurred on the server.";

  res.status(statusCode).render("errors/500", { title: "Server Error", statusCode, message });
});

let server;

async function startServer() {
  try {
    await connectDB();
    await seedAdmins();

    server = app.listen(config.port, () => {
      console.log(`Server started on port ${config.port}`);
    });

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("Critical startup error:", error.message);
    process.exit(1);
  }
}

let isShuttingDown = false;
const shutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  const timeout = setTimeout(() => {
    console.warn("Forcing closure of remaining hanging connections...");
    if (server) {
      server.closeAllConnections();
    }
  }, 5000);

  console.log("\nReceived kill signal, shutting down gracefully.");

  if (!server) {
    process.exit(0);
  }

  clearTimeout(timeout);
  server.close(async () => {
    console.log("Closing remaining connections.");
    try {
      await closeDBConn();
      console.log("Database connection closed cleanly.");
      process.exit(0);
    } catch (dbErr) {
      console.error("Error closing database conn:", dbErr);
      process.exit(1);
    }
  });
  server.closeAllConnections();
};

startServer();

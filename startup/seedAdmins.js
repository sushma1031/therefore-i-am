const config = require("../config.js");
const userService = require("../services/users.js")

const seedAdmins = async() => {
  const admins = config.admins.split(",");
  console.log("Starting admin seeding, count:", admins.length);
  let added = 0, skipped = 0;

  try {
    for (const admin of admins) {
      const details = admin.split("|"); // username|email|password
      if (details.length !== 3) {
        console.warn("Skipping due to insuffient details, want 3 fields, got:", details.length);
        skipped++;
        continue;
      }
      const existing = await userService.findByEmail(details[1]);

      if (!existing) {
        await userService.createUser({ username: details[0], email: details[1], password: details[2] });
        added++;
      } else {
        skipped++;
      }
    }

    console.info(`Finished admin seeding. Added: ${added}, Skipped: ${skipped}`);
  } catch (error) {
    console.error("Failed to seed admins:", error);
    throw error;
  }
}

module.exports = seedAdmins;

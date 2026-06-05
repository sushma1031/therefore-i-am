const dotenv = require("dotenv");
const { z } = require("zod");

const result = dotenv.config();

const envVars = {
  ...result.parsed,
  ...process.env,
};

const envSchema = z.object({
  MONGO_URI: z.url(),
  PORT: z.string().default("3000"),
  SESSION_SECRET: z.string(),
  CLOUDINARY_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  RENDER_API_KEY: z.string(),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DEFAULT_POST_IMAGE_URL: z.string(),
  ADMINS: z.string(),
});

const parsed = envSchema.safeParse(envVars);

if (!parsed.success) {
  console.error("Invalid environment variables:", z.flattenError(parsed.error));
  process.exit(1);
}

const config = {
  mongoURI: encodeURI(parsed.data.MONGO_URI),
  port: parsed.data.PORT,
  env: parsed.data.NODE_ENV,

  sessionSecret: parsed.data.SESSION_SECRET,
  admins: parsed.data.ADMINS,
  defaultPostImage: {
    url: parsed.data.DEFAULT_POST_IMAGE_URL,
  },

  cloudinary: {
    name: parsed.data.CLOUDINARY_NAME,
    apiKey: parsed.data.CLOUDINARY_API_KEY,
    apiSecret: parsed.data.CLOUDINARY_API_SECRET,
  },
  render: {
    apiKey: parsed.data.RENDER_API_KEY,
  },
  scripts: {
    fontAwesome: envVars.FONTAWESOME_KIT,
    tinyMCE: envVars.TINYMCE_API_KEY,
  },
};

module.exports = config;

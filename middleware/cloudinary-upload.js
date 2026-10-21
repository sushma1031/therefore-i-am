const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const config = require("../config");

cloudinary.config({
  cloud_name: config.cloudinary.name,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

const storage = {
  _handleFile(req, file, callback) {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "tia-blog-images",
        allowed_formats: ["jpg", "png"],
        transformation: [{ width: 1280, height: 720, crop: "fill" }],
      },
      (error, result) => {
        if (error) return callback(error);

        callback(null, {
          path: result.secure_url,
          filename: result.public_id,
          size: result.bytes,
        });
      },
    );

    file.stream.pipe(uploadStream);
  },

  _removeFile(req, file, callback) {
    cloudinary.uploader.destroy(
      file.filename,
      { invalidate: true },
      (error, _) => callback(error),
    );
  },
};

module.exports = multer({ storage });

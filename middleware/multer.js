// const multer = require("multer");
// const path = require("path");

// const storage = multer.diskStorage({
//   destination: function (req, res, cb) {
//     cb(null, path.join(__dirname, "./uploads"));
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     const filename = file.originalname.split(".")[0];
//     cb(null, filename + "-" + uniqueSuffix + ".png");
//   },
// });

// exports.upload = multer({ storage: storage });
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads");

// Create the uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = file.originalname.split(".")[0];
    cb(null, filename + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only .jpg, .jpeg, and .png file types are allowed!"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

module.exports = { upload };
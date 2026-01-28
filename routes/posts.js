const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

// Upload route
router.post("/upload", upload.single("image"), auth, async (req, res) => {
  console.log("req.file:", req.file);
  console.log("req.body:", req.body);

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.json({
    message: "File uploaded successfully",
    filename: req.file.filename,
    path: req.file.path,
  });
});

module.exports = router;

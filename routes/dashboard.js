const express = require("express");
const router = express.Router();
const {
  listDrive,
  upload,
  download,
  createNewFolder,
  deleteFile,
} = require("../controllers/dashboard");

router.get("/", listDrive);
router.post("/upload", upload);
router.get("/download", download);
router.post("/createNewFolder", createNewFolder);
router.post("/deleteFile", deleteFile);

module.exports = router;

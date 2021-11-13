const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    uid: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const folderSchema = new mongoose.Schema(
  {
    folderName: {
      type: String,
      required: true,
    },
    files: [fileSchema],
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      max: 128,
    },
    lastName: {
      type: String,
      required: true,
      max: 128,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    isActivated: {
      type: Boolean,
    },
    emailVerifyToken: {
      type: String,
    },
    folders: [folderSchema],
  },
  { timestamps: true }
);

module.exports = {
  User: mongoose.model("User", userSchema),
  Folder: mongoose.model("Folder", folderSchema),
  File: mongoose.model("File", fileSchema),
};

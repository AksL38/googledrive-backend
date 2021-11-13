const AWS = require("aws-sdk");
const fs = require("fs");
const { User, Folder, File } = require("../models/user");
const path = require("path");
const multer = require("multer");

const AWS_config = {
  accessKeyId: process.env.AWS_accessKeyId,
  secretAccessKey: process.env.AWS_secretAccessKey,
  region: process.env.AWS_region,
};

AWS.config.update(AWS_config);

exports.listDrive = (req, resp) => {
  const user = req.user;
  User.findOne({ email: user.email }, (err, data) => {
    if (err) {
      return resp.status(500).json({ error: err });
    } else {
      return resp.status(200).json({ folders: data.folders });
    }
  });
  //s3 = new AWS.S3({ apiVersion: "2006-03-01" });
};

exports.download = (req, resp) => {
  const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
  const options = {
    Bucket: process.env.AWS_bucket,
    Key: req.query.uid,
  };

  resp.attachment(req.query.fileName);
  const fileStream = s3.getObject(options).createReadStream();
  fileStream.pipe(resp);

  //resp.send("testing checking console log");
};

const uploadFile = (multerName, fileName, folderName, user, resp) => {
  const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
  var uploadParams = { Bucket: process.env.AWS_bucket, Key: "", Body: "" };
  var file = "./files/" + multerName;
  var fileStream = fs.createReadStream(file);
  fileStream.on("error", function (err) {
    console.log("File Error", err);
  });
  uploadParams.Body = fileStream;
  uploadParams.Key =
    user.email + "-" + folderName + "-" + Date.now() + "-" + fileName;
  // call S3 to retrieve upload file to specified bucket
  s3.upload(uploadParams, function (err, data) {
    if (err) {
      return resp.status(500).json({ error: err });
    }
    if (data) {
      fs.rm(file, (err) => {
        if (err) {
          console.error("Error in deleting multer file: ", err);
        }
      });
      const newFile = new File({
        url: data.Location,
        fileName,
        uid: uploadParams.Key,
      });
      const index = user.folders.findIndex((elem) => {
        if (elem.folderName === folderName) {
          return true;
        }
        return false;
      });
      if (index === -1) {
        const newFolder = new Folder({
          folderName,
          files: [],
        });
        newFolder.files.push(newFile);
        user.folders.push(newFolder);
      } else {
        user.folders[index].files = [...user.folders[index].files, newFile];
      }

      user
        .save()
        .then((response) => {
          return resp.status(200).json({ updatedUser: response });
        })
        .catch((err) => {
          return resp.status(500).json({ error: err });
        });
    }
  });
};

exports.upload = (req, resp) => {
  User.findOne({ email: req.user.email }, (err, user) => {
    if (err) {
      return resp.status(500).json({ error: err });
    } else {
      const upload = multer({ dest: "./files/" }).single("file");
      upload(req, resp, (err) => {
        if (err instanceof multer.MulterError) {
          return resp.status(500).json(err);
        } else if (err) {
          return resp.status(500).json(err);
        }
        //console.log(user);
        uploadFile(
          req.file.filename,
          req.body.fileName,
          req.body.folderName,
          user,
          resp
        );
      });
    }
  });
};

exports.createNewFolder = (req, resp) => {
  User.findOne({ email: req.user.email }, (err, user) => {
    if (err) {
      return resp.status(500).send("Error in finding user in the database.");
    }
    const newFolder = new Folder({
      folderName: req.body.folderName,
      files: [],
    });
    user.folders = [...user.folders, newFolder];
    user
      .save()
      .then((response) => {
        return resp.status(200).json({ updatedUser: response });
      })
      .catch((err) => {
        return resp.status(500).json({ error: err });
      });
  });
};

exports.deleteFile = (req, resp) => {
  User.findOne({ email: req.user.email }, (err, user) => {
    if (err) {
      return resp.status(500).send("Error in finding user in the database.");
    }
    const index = user.folders.findIndex((elem) => {
      return elem.folderName === req.body.folderName;
    });
    if (index === -1) {
      return resp
        .status(500)
        .send("Foldername not present in folders of logged in User");
    }
    const fileIndex = user.folders[index].files.findIndex((elem) => {
      return elem.uid === req.body.uid;
    });
    if (fileIndex === -1) {
      return resp
        .status(500)
        .send("File uid doesn't match any files in this folder");
    }

    const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
    const objectName = user.folders[index].files[fileIndex].uid;
    const params = { Bucket: process.env.AWS_bucket, Key: objectName };

    s3.deleteObject(params, function (err, data) {
      if (err) {
        resp.status(500).json({ error: err });
      } else {
        user.folders[index].files.splice(fileIndex, 1);
        user
          .save()
          .then((response) => {
            return resp.status(200).json({ updatedUser: response });
          })
          .catch((err) => {
            return resp.status(500).json({ error: err });
          });
      }
    });
  });
};

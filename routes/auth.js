const express = require("express");
const router = express.Router();

const {
  signup,
  activation,
  signin,
  verifyEmail,
  forgetPassword,
  resetPassword,
} = require("../controllers/auth");

router.post("/signup", signup);
router.post("/activation", activation);
router.post("/signin", signin);
router.post("/verifyEmail", verifyEmail);
router.post("/forgetPassword", forgetPassword);
router.post("/resetPassword", resetPassword);

module.exports = router;

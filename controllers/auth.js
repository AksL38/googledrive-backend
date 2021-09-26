const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

async function sendMail(recipient, verificationLink) {
  try {
    const accessToken = await oauth2Client.getAccessToken();

    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: "aksl38development@gmail.com",
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    const mailOptions = {
      from: "Akshay Lele <aksl38development@gmail.com>",
      to: recipient,
      subject: "Verify your email address for google drive clone",
      text: `Click on this link to verify your email address.\n${verificationLink}\nThis is system generated message. Do not reply to this mail.`,
    };

    const result = await transport.sendMail(mailOptions);
    return result;
  } catch (error) {
    return error;
  }
}

function saveUser(
  firstName,
  lastName,
  email,
  password,
  emailVerifyToken,
  message,
  resp,
  verificationLink
) {
  bcrypt
    .hash(password, 10)
    .then((data) => {
      let newUser = new User({
        firstName,
        lastName,
        email,
        password: data,
        isActivated: false,
        emailVerifyToken,
      });
      newUser.save((err, success) => {
        if (err) {
          return resp.status(400).json({ error: err });
        }
        sendMail(email, verificationLink).then((data) => {
          resp.json({
            message,
          });
        });
      });
    })
    .catch((error) => {
      return resp.status(400).json({
        error: "Something went wrong in password encryption:" + error.message,
      });
    });
}

function updateUser(filter, update, message, resp, verificationLink = null) {
  User.findOneAndUpdate(filter, update)
    .then((data) => {
      if (verificationLink) {
        sendMail(data.email, verificationLink).then((data) => {
          resp.json({
            message,
          });
        });
      } else {
        resp.json({
          message,
        });
      }
    })
    .catch((error) => {
      resp.status(400).json({ error });
    });
}

function sendActivationLink(
  firstName,
  lastName,
  email,
  password,
  message,
  resp,
  user = null
) {
  const emailVerifyToken = jwt.sign(
    { firstName, lastName, email },
    process.env.JWT_ACTIVATION_KEY
  );
  const verificationLink = `${process.env.FRONTEND_URI}/#/activation/${emailVerifyToken}`;
  if (user) {
    updateUser(
      { email },
      { emailVerifyToken },
      message,
      resp,
      verificationLink
    );
  } else {
    saveUser(
      firstName,
      lastName,
      email,
      password,
      emailVerifyToken,
      message,
      resp,
      verificationLink
    );
  }
}

exports.signup = (req, resp) => {
  const { firstName, lastName, email, password } = req.body;
  User.findOne({ email }).exec((err, user) => {
    if (user) {
      if (user.isActivated) {
        return resp
          .status(400)
          .json({ error: "Email address already registered and verified!" });
      } else {
        let message =
          "Email already registered. Account unverified. New activation email sent to email address: " +
          email;
        sendActivationLink(
          firstName,
          lastName,
          email,
          password,
          message,
          resp,
          user
        );
      }
    } else {
      let message = "Activation email sent to email address: " + email;
      sendActivationLink(firstName, lastName, email, password, message, resp);
    }
  });
};

exports.activation = (req, resp) => {
  const { token } = req.body;

  if (token) {
    jwt.verify(token, process.env.JWT_ACTIVATION_KEY, (err, decodedToken) => {
      if (err) {
        return resp.json({
          error: "Incorrect or expired activation link.",
        });
      }
      const { email } = decodedToken;
      User.findOne({ email }).exec((err, user) => {
        if (user) {
          let message = "Account verified for email address: " + email;
          updateUser({ email }, { isActivated: true }, message, resp);
          return;
        }
        resp.json({
          error:
            "Something went wrong in finding email in database! " + err.message,
        });
      });
    });
  } else {
    return resp.json({
      error: "Token absent in the request.",
    });
  }
};

exports.signin = (req, resp) => {
  const { email, password } = req.body;
  User.findOne({ email }).exec((err, user) => {
    if (user) {
      bcrypt
        .compare(password, user.password)
        .then((valid) => {
          if (valid) {
            const token = jwt.sign({ email }, process.env.JWT_ACTIVATION_KEY);
            return resp.json({
              access_token: token,
            });
          }
          return resp.status(401).json({
            error: "Invalid password.",
          });
        })
        .catch((err) => {
          return resp.status(400).json({
            error: err.message,
          });
        });
    } else {
      return resp.status(400).json({
        error: "Invalid email",
      });
    }
  });
};

exports.verifyEmail = (req, resp) => {
  const { email } = req.body;
  User.findOne({ email }).exec((err, user) => {
    if (user) {
      return resp.status(200).json({
        message: "Valid email",
      });
    } else {
      return resp.status(400).json({
        error: "Invalid email",
      });
    }
  });
};

async function sendResetMail(recipient, resetLink, resp) {
  try {
    const accessToken = await oauth2Client.getAccessToken();

    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: "aksl38development@gmail.com",
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    const mailOptions = {
      from: "Akshay Lele <aksl38development@gmail.com>",
      to: recipient,
      subject: "Reset your password for google drive clone",
      text: `Click on this link to reset your password.\n${resetLink}\nThis is system generated message. Do not reply to this mail.`,
    };

    const result = await transport.sendMail(mailOptions);
    if (result.accepted.length === 0) {
      resp.status(400).send("Failed to send mail: " + result.response);
    } else {
      resp
        .status(200)
        .send(
          "Mail sent to following addresses: " + JSON.stringify(result.accepted)
        );
    }
  } catch (error) {
    resp.status(400).json({
      error,
    });
  }
}

exports.forgetPassword = (req, resp) => {
  const { email } = req.body;
  User.findOne({ email }).exec((err, user) => {
    if (user) {
      const resetPasswordToken = jwt.sign(
        { firstName: user.firstName, lastName: user.lastName, email },
        process.env.JWT_ACTIVATION_KEY
      );
      const resetLink = `${process.env.FRONTEND_URI}/auth/resetPassword/${resetPasswordToken}`;

      sendResetMail(email, resetLink, resp);
    } else {
      return resp.status(400).send("User not found! Send verified email");
    }
  });
};

exports.resetPassword = (req, resp) => {
  const { token, password } = req.body;

  if (token) {
    jwt.verify(token, process.env.JWT_ACTIVATION_KEY, (err, decodedToken) => {
      if (err) {
        return resp.json({
          error: "Incorrect or expired reset link.",
        });
      }
      const { email } = decodedToken;
      User.findOne({ email }).exec((err, user) => {
        if (user) {
          let message = "Password reset for email address: " + email;
          bcrypt.hash(password, 10).then((hashPassword) => {
            updateUser({ email }, { password: hashPassword }, message, resp);
            return;
          });
        } else {
          resp.json({
            error: "Something went wrong in finding user in database! ",
          });
        }
      });
    });
  } else {
    return resp.json({
      error: "Token absent in the request.",
    });
  }
};

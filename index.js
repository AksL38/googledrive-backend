const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./db/connectDB");
const authRoutes = require("./routes/auth");
const jwt = require("jsonwebtoken");

const app = express();

app.use(express.json());
app.use(cors());

app.use("/auth", authRoutes);

app.use((req, resp, next) => {
  const header = req.headers["authorization"];
  const token = header && header.split(" ")[1];
  if (token == null)
    return resp
      .status(401)
      .send(
        "Unauthorised as no token. Please include bearer token in authorization header"
      );

  jwt.verify(token, process.env.JWT_ACTIVATION_KEY, (err, decodedToken) => {
    if (err) return resp.status(403).send(err.message);
    req.user = decodedToken;
    next();
  });
});

app.get("/", function (req, res) {
  res.send("Hello " + req.user.email);
});

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server running on localhost:${port}`);
});

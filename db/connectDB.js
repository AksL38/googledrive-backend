const mongoose = require("mongoose");

mongoose
  .connect(process.env.DATABASE)
  .then(() => console.log("Connected to database"))
  .catch((err) => console.log("Error in connecting to database: ", err));

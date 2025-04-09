const fs = require("fs");
const https = require("https");
const express = require("express");

const app = express();
app.use(express.static("public")); // your HTML/CSS/JS folder

https.createServer({
  key: fs.readFileSync("localhost-key.pem"),
  cert: fs.readFileSync("localhost.pem")
}, app).listen(8443, () => {
  console.log("HTTPS server running at https://localhost:8443");
});

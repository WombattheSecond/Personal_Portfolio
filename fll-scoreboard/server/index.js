const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const { initDB } = require("./db");

const teamsRoutes = require("./routes/teams");
const runsRoutes = require("./routes/runs");
const settingsRoutes = require("./routes/settings");

initDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set("io", io);

app.use(express.json());
app.use(express.static("public"));

app.use("/api/teams", teamsRoutes);
app.use("/api/runs", runsRoutes);
app.use("/api/settings", settingsRoutes);

io.on("connection", () => {
  console.log("Client connected");
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
const express = require("express");
const app = express();
const logger = require("./logging_middleware/log");
const api = require("./config/axios");

const vehicleRouter = require("./vehicle_maintainence_scheduler/vehicle");

// app.post("http://20.207.122.201/evaluation-service/auth", info);

logger.logger("backend", "debug", "cache", "recieved!");
app.use("/vehicle_maintain", vehicleRouter);

app.listen(3000, () => {
	console.log("server is running at 3000");
});

const express = require("express");
const log = require('../logging_middleware/log.js');
const router = express.Router();
const api = require("../config/axios");

router.post("/", async (req, res) => {
	try {
		const [depotsRes, vehiclesRes] = await Promise.all([
			api.get("/depots"),
			api.get("/vehicles"),
		]);

		const depots = depotsRes.data.depots;
		const vehicles = vehiclesRes.data.vehicles;

		const depotHours = {};
		depots.forEach((d) => {
			depotHours[d.ID] = d.MechanicHours;
		});

		const sorted = [...vehicles].sort((a, b) => b.Impact - a.Impact);
		log.logger('backend', 'handle', 'info', 'fetching notifications');

		const sortedAssignedVehicles = {};
		sorted.forEach((v) => {
			let bestDepot = null;
			let minRemaining = Infinity;
			for (const d of depots) {
				const remaining = depotHours[d.ID] - v.Duration;
				if (remaining >= 0 && remaining < minRemaining) {
					minRemaining = remaining;
					bestDepot = d.ID;
				}
			}
			if (bestDepot !== null) {
				depotHours[bestDepot] -= v.Duration;
				if (!sortedAssignedVehicles[bestDepot])
					sortedAssignedVehicles[bestDepot] = [];
				sortedAssignedVehicles[bestDepot].push({
					TaskID: v.TaskID,
					Duration: v.Duration,
					Impact: v.Impact,
				});
			}
		});
		log.logger('backend', 'controller', 'info', 'fetching notifications');
		res.json({ sortedAssignedVehicles });
	} catch (error) {
		console.error("api call failed!: ", error.message);
		res.status(500).json({ message: "failed to fetch!" });
	}
});

module.exports = router;

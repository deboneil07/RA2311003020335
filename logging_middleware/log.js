const axios = require("../config/axios");

const logger = async (stack, level, Package, message) => {
	try {
		const logData = {
			stack: stack,
			level: level,
			package: Package,
			message: message,
		};
		const res = await axios
			.post("http://20.207.122.201/evaluation-service/logs", logData)
			.then((response) => {
				console.log(response.data);
			})
			.catch((error) => {
				console.error(error);
			});
	} catch (error) {
		console.log("api error failed, error.message");
		res.status(500).json({ message: "failed to fetch data" });
	}
};

module.exports = {
	logger,
};

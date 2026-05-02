const axios = require("axios");
const accessToken =
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJkYjE4MzNAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwNzU5NiwiaWF0IjoxNzc3NzA2Njk2LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiNDk3YzNjNDEtYzI0NS00YjZkLWEyYzgtZDJhMjRjMWU1N2YzIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoiZGVib25laWwiLCJzdWIiOiI3ZWI5NWQyMy0wNzRlLTRhZWQtYmU4Yy1jOGQ0MWViZTNhOWYifSwiZW1haWwiOiJkYjE4MzNAc3JtaXN0LmVkdS5pbiIsIm5hbWUiOiJkZWJvbmVpbCIsInJvbGxObyI6InJhMjMxMTAwMzAyMDMzNSIsImFjY2Vzc0NvZGUiOiJRa2JweEgiLCJjbGllbnRJRCI6IjdlYjk1ZDIzLTA3NGUtNGFlZC1iZThjLWM4ZDQxZWJlM2E5ZiIsImNsaWVudFNlY3JldCI6InJiWENrRndFWU5NVnVZUWsifQ.zP3SdzmjnzwIsWA1ZY17LKZmjxZa7gc5QPvjnT1kHiQ";
const tokenType = "Bearer";
const api = axios.create({
	baseURL: "http://20.207.122.201/evaluation-service",
});
api.interceptors.request.use(
	(config) => {
		config.headers["Authorization"] = `${tokenType} ${accessToken}`;
		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);
module.exports = api;

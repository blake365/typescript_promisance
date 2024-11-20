export const language = (req, res, next) => {
	const lang =
		req.headers["accept-language"]?.split(",")[0] || req.query.lang || "en";

	res.locals.language = lang.substring(0, 2);
	next();
};

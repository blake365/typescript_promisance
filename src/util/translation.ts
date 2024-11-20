import i18next from "../config/i18n";

export const translate = (
	key: string,
	language: string,
	variables?: Record<string, any>,
) => {
	return i18next.t(key, { lng: language, ...variables });
};

const createErrorResponse = (key: string, language: string) => {
	return {
		error: translate(`errors:${key}`, language),
	};
};

export const sendError = (res, status) => (key, language) => {
	return res.status(status).json(createErrorResponse(key, language));
};

import i18next from "../config/i18n";

export const translate = (
	key: string,
	language: string,
	variables?: Record<string, any>,
) => {
	return i18next.t(key, { lng: language, ...variables });
};

const createErrorResponse = (
	key: string,
	language: string,
	variables?: Record<string, any>,
) => {
	return {
		error: translate(`errors:${key}`, language, variables),
	};
};

export const sendError =
	(res: any, status: number) =>
	(key: string, language: any, variables?: Record<string, any>) => {
		return res
			.status(status)
			.json(createErrorResponse(key, language, variables));
	};

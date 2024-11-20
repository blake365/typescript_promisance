import i18next from "i18next";
import Backend from "i18next-fs-backend";
import path from "node:path";

const i18nConfig = {
	backend: {
		loadPath: path.join(__dirname, "./locales/{{lng}}/{{ns}}.json"),
	},
	fallbackLng: "en",
	ns: ["errors", "responses"],
	interpolation: {
		escapeValue: false,
	},
};

i18next.use(Backend).init(i18nConfig);

export default i18next;

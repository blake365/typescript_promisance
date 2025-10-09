import i18next from "i18next";
import Backend from "i18next-fs-backend";
import path from "node:path";
import fs from "node:fs";

// Resolve locales directory for both ts-node (src) and compiled build (build)
const candidateLocaleDirs = [
    // When running ts-node in development (src tree)
    path.join(__dirname, "./locales"),
    // When running compiled JS from build/, fall back to src if available
    path.join(__dirname, "../../src/config/locales"),
    // Explicit fallbacks in case process is started from project root
    path.join(process.cwd(), "build/config/locales"),
    path.join(process.cwd(), "src/config/locales"),
];

const resolvedLocalesDir = candidateLocaleDirs.find((dir) => {
    try {
        return fs.existsSync(dir);
    } catch {
        return false;
    }
}) || candidateLocaleDirs[0];

const i18nConfig = {
    backend: {
        loadPath: path.join(resolvedLocalesDir, "{{lng}}/{{ns}}.json"),
    },
    fallbackLng: "en",
    ns: ["errors", "responses"],
    interpolation: {
        escapeValue: false,
    },
};

i18next.use(Backend).init(i18nConfig);

export default i18next;

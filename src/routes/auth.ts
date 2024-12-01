import type { Request, Response } from "express";
import { Router } from "express";
import { validate, isEmpty } from "class-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import cookie from "cookie";
import passport from "passport";
import passportGoogle from "passport-google-oauth20";
import User from "../entity/User";
import auth from "../middleware/auth";
import user from "../middleware/user";
import Session from "../entity/Session";
import { makeId } from "../util/helpers";
import ResetToken from "../entity/ResetToken";
import { sendSESEmail } from "../util/mail";
import { translate, sendError } from "../util/translation";
import { language } from "../middleware/language";

const GoogleStrategy = passportGoogle.Strategy;

const mapErrors = (errors: Object[]) => {
	return errors.reduce((prev: any, err: any) => {
		prev[err.property] = Object.entries(err.constraints)[0][1];
		return prev;
	}, {});
};

const register = async (req: Request, res: Response) => {
	const { email, username, password } = req.body;
	const language = res.locals.language;

	const empires = [];
	let errors: any = {};

	const emailUser = await User.findOne({ email });
	const usernameUser = await User.findOne({ username });

	if (emailUser)
		errors.email = translate("errors.auth.emailAlreadyInUse", language);
	if (usernameUser)
		errors.username = translate("errors.auth.usernameAlreadyTaken", language);

	console.log(errors);
	if (Object.keys(errors).length > 0) {
		return res.status(500).json(errors);
	}

	// Create the user
	const user = new User({ email, username, password, empires });

	errors = await validate(user);

	if (errors.length > 0) {
		return res.status(400).json(mapErrors(errors));
	}
	await user.save();

	// Return the user
	return res.json(user);
};

const login = async (req: Request, res: Response) => {
	const { username, password, stayLoggedIn } = req.body;
	const language = res.locals.language;
	// console.log(username, password)
	try {
		let errors: any = {};
		if (isEmpty(username))
			errors.username = translate("errors.auth.usernameEmpty", language);
		if (isEmpty(password))
			errors.password = translate("errors.auth.passwordEmpty", language);
		if (Object.keys(errors).length > 0) {
			return res.status(400).json(errors);
		}

		const user = await User.findOne({ username }, { relations: ["empires"] });
		// console.log(user)

		if (!user) return sendError(res, 404)("auth.userNotFound", language);

		const passwordMatches = await bcrypt.compare(password, user.password);

		if (!passwordMatches) {
			return sendError(res, 401)("auth.passwordIncorrect", language);
		}

		const token = jwt.sign({ username }, process.env.JWT_SECRET!);

		// const data = token
		let time = 3600;
		if (stayLoggedIn === "1 day") {
			time = 86400;
		} else if (stayLoggedIn === "1 week") {
			time = 604800;
		} else if (stayLoggedIn === "1 month") {
			time = 2678400;
		} else if (stayLoggedIn === "6 months") {
			time = 15552000;
		}
		// console.log(token)
		try {
			res.set(
				"Set-Cookie",
				cookie.serialize("token", token, {
					// httpOnly: true,
					domain:
						process.env.NODE_ENV === "production" ? ".neopromisance.com" : "",
					secure: process.env.NODE_ENV === "production",
					sameSite: "strict",
					maxAge: time,
					path: "/",
				}),
			);
		} catch (error) {
			console.log(error);
		}

		// const session = new Session()
		// session.data = data
		// session.time = time
		// session.user_id = user.id
		// if (user?.empires?.length > 0) {
		// 	session.empire_id = user.empires[0].id
		// }
		// session.role = 'user'
		// await session.save()

		user.lastIp =
			<string>req.connection.remoteAddress ||
			<string>req.headers["x-forwarded-for"];

		await user.save();

		return res.json(user);
	} catch (err) {
		console.log(err);
		return sendError(res, 500)("generic", language);
	}
};

const me = (_: Request, res: Response) => {
	return res.json(res.locals.user);
};

const logout = async (_: Request, res: Response) => {
	res.set(
		"Set-Cookie",
		cookie.serialize("token", "", {
			// httpOnly: true,
			domain: process.env.NODE_ENV === "production" ? ".neopromisance.com" : "",
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			expires: new Date(0),
			path: "/",
		}),
	);

	// const session = await Session.findOne({ user_id: res.locals.user.id })

	// session.time = 0
	// await session.save()

	return res.status(200).json({ success: true });
};

const demoAccount = async (req: Request, res: Response) => {
	const empires = [];
	const language = res.locals.language;

	let ip = Array.isArray(req.headers["x-forwarded-for"])
		? req.headers["x-forwarded-for"][0]
		: req.headers["x-forwarded-for"] || req.connection.remoteAddress || "";

	console.log(req.headers["x-forwarded-for"]);
	console.log(ip);

	// process ip address or headers
	if (ip === "::1") {
		ip = "localhost";
	} else if (ip.includes(",")) {
		ip = ip.split(",")[0];
	} else if (ip.length > 15 && ip.split(":").length === 8) {
		let ipArr = ip.split(":");
		ipArr.splice(ipArr.length / 2, ipArr.length);
		ip = ipArr.join(".");
	} else if (ip.includes("::")) {
		ip = ip.split("::")[1];
	} else if (ip.length <= 15 && ip.includes(".")) {
		let ipArr = ip.split(".");
		if (ipArr.length === 4) {
			ip = ipArr.join(".");
		} else {
			ip = "";
		}
	} else {
		ip = "";
	}

	console.log(ip);
	if (ip === "" || ip === undefined) {
		console.error("No IP address");
		return sendError(res, 400)("auth.ipError", language);
	}

	const addOn = new Date().getDay();

	const email = ip + addOn + "@demo.com";
	const username = ip + addOn;
	const password = "none";
	const role = "demo";

	// console.log(username)

	try {
		// Validate Data
		let errors: any = {};

		if (Object.keys(errors).length > 0) {
			return res.status(400).json(errors);
		}

		// Create the user
		const user = new User({ email, username, password, role, empires });

		errors = await validate(user);

		console.log(errors);
		if (errors.length > 0) {
			return res.status(400).json(mapErrors(errors));
		}
		await user.save();

		// console.log(user)
		const token = jwt.sign({ username }, process.env.JWT_SECRET!);

		const data = token;
		const time = 3600;
		// console.log(token)
		res.set(
			"Set-Cookie",
			cookie.serialize("token", token, {
				// httpOnly: true,
				domain:
					process.env.NODE_ENV === "production" ? ".neopromisance.com" : "",
				secure: process.env.NODE_ENV === "production",
				sameSite: "strict",
				maxAge: time,
				path: "/",
			}),
		);

		const session = new Session();
		session.data = data;
		session.time = time;
		session.user_id = user.id;
		if (user?.empires?.length > 0) {
			session.empire_id = user.empires[0].id;
		}
		session.role = role;
		await session.save();

		// Return the user
		return res.json(user);
	} catch (err) {
		console.log(err.code);
		if (err.code === "23505" || err.code === "23514" || err.code === "23502") {
			return sendError(res, 500)("auth.demoError", language);
		}
	}
};

const createDemoToken = async (req: Request, res: Response) => {
	const username = "demoLoginLink";
	const issuer = "rebornpromisance.com";
	const expiration = new Date(Date.now() + 3600);
	const secret = process.env.LINK_SECRET;

	const token = jwt.sign(
		{ username, issuer, expiration, secret },
		process.env.LINK_SECRET!,
	);

	console.log(token);
	return res.json({ token });
};

const loginFromLink = async (req: Request, res: Response) => {
	const { token } = req.params;
	console.log(token);
	const language = res.locals.language;

	if (!token) {
		return sendError(res, 400)("auth.invalidToken", language);
	}

	let errors: any = {};

	try {
		const decoded = jwt.verify(token, process.env.LINK_SECRET!) as JwtPayload;
		if (typeof decoded === "object" && decoded !== null) {
			const { username, issuer, expiration, secret } = decoded as {
				username: string;
				issuer: string;
				expiration: Date;
				secret: string;
			};
			console.log({ username, issuer, expiration, secret });
		} else {
			return sendError(res, 400)("auth.invalidToken", language);
		}

		if (decoded.issuer !== "rebornpromisance.com") {
			return sendError(res, 400)("auth.invalidToken", language);
		}

		if (decoded.expiration < new Date()) {
			return sendError(res, 400)("auth.tokenExpired", language);
		}

		if (decoded.secret !== process.env.LINK_SECRET) {
			return sendError(res, 400)("auth.invalidToken", language);
		}

		const user = await User.findOne(
			{ username: decoded.username },
			{ relations: ["empires"] },
		);

		if (!user) {
			console.log("creating user");
			const username = decoded.username;
			// create a user
			const user = new User({
				username,
				password: makeId(10),
				email: `${username}@neopromisance.com`,
				role: "user",
				method: "link",
				empires: [],
			});

			errors = await validate(user);

			if (errors.length > 0) {
				return res.status(400).json(mapErrors(errors));
			}

			console.log("saving user");
			await user.save();

			console.log("logging in user");
			const token = jwt.sign({ username }, process.env.JWT_SECRET!);

			const data = token;
			const time = 3600;
			// console.log(token)
			res.set(
				"Set-Cookie",
				cookie.serialize("token", token, {
					// httpOnly: true,
					domain:
						process.env.NODE_ENV === "production" ? ".neopromisance.com" : "",
					secure: process.env.NODE_ENV === "production",
					sameSite: "strict",
					maxAge: time,
					path: "/",
				}),
			);

			const session = new Session();
			session.data = data;
			session.time = time;
			session.user_id = user.id;
			if (user?.empires?.length > 0) {
				session.empire_id = user.empires[0].id;
			}
			session.role = "user";
			await session.save();

			console.log("returning user");
			return res.json(user);
		}

		if (user) {
			console.log("user found");
			console.log("logging in user");
			const username = user.username;
			const token = jwt.sign({ username }, process.env.JWT_SECRET!);

			const data = token;
			const time = 3600;
			// console.log(token)
			res.set(
				"Set-Cookie",
				cookie.serialize("token", token, {
					// httpOnly: true,
					domain:
						process.env.NODE_ENV === "production" ? ".neopromisance.com" : "",
					secure: process.env.NODE_ENV === "production",
					sameSite: "strict",
					maxAge: time,
					path: "/",
				}),
			);

			const session = new Session();
			session.data = data;
			session.time = time;
			session.user_id = user.id;
			if (user?.empires?.length > 0) {
				session.empire_id = user.empires[0].id;
			}
			session.role = "user";
			await session.save();

			console.log("returning user");
			return res.json(user);
		}
	} catch (err) {
		console.log(err);
		return res.status(400).json({ error: "Something went wrong" });
	}
};

const forgotPassword = async (req: Request, res: Response) => {
	const { email } = req.body;
	const origin = req.headers.origin;
	const language = res.locals.language;
	// console.log(origin)

	try {
		const user = await User.findOne({ email });

		if (!user) {
			return sendError(res, 400)("auth.emailNotFound", language);
		}

		const token = makeId(40);

		const selector = token.slice(0, 18);
		let validator = token.slice(18);
		validator = await bcrypt.hash(validator, 6);

		const resetToken = new ResetToken();
		resetToken.email = email;
		resetToken.selector = selector;
		resetToken.verifier = validator;
		resetToken.expiredAt = new Date(Date.now() + 3600000);
		await resetToken.save();

		const link = `${origin}/reset-password/${token}`;
		const text = translate("responses:auth.passwordResetEmailText", language, {
			link,
			username: user.username,
		});
		const html = translate("responses:auth.passwordResetEmailHtml", language, {
			link,
			username: user.username,
		});

		await sendSESEmail(
			email,
			"admin@neopromisance.com",
			translate("responses:auth.emailSubject", language),
			text,
			html,
		);

		return res.json({
			message: translate("responses:auth.emailSent", language),
		});
	} catch (err) {
		console.log(err);
		return sendError(res, 500)("generic", language);
	}
};

const confirmToken = async (req: Request, res: Response) => {
	const { token, password } = req.body;
	let language = res.locals.language;

	if (!language) {
		language = "en";
	}

	try {
		const resetToken = await ResetToken.findOne({
			selector: token.slice(0, 18),
		});

		if (!resetToken) {
			return sendError(res, 400)("generic", language);
		}

		const isValid = await bcrypt.compare(token.slice(18), resetToken.verifier);

		if (resetToken.expiredAt < new Date()) {
			return sendError(res, 400)("auth.tokenExpired", language);
		}

		// console.log(isValid)
		if (!isValid) {
			return sendError(res, 400)("generic", language);
		}

		const user = await User.findOne({ email: resetToken.email });

		if (!user) {
			return sendError(res, 400)("auth.userNotFound", language);
		}

		user.password = await bcrypt.hash(password, 6);
		await user.save();
		await resetToken.remove();
		return res.json({ message: translate("responses:auth.success", language) });
	} catch (err) {
		console.log(err);
		return sendError(res, 500)("generic", language);
	}
};

const forgotUsername = async (req: Request, res: Response) => {
	const { email } = req.body;
	const language = res.locals.language;
	try {
		const user = await User.findOne({ email });

		if (!user) {
			return sendError(res, 400)("auth.emailNotFound", language);
		}

		const text = translate("responses:auth.forgotUsername", language, {
			username: user.username,
		});

		return res.json({ message: text });
	} catch (err) {
		console.log(err);
		return sendError(res, 500)("generic", language);
	}
};

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL:
				process.env.NODE_ENV === "production"
					? "https://api.neopromisance.com/api/auth/auth/google/callback"
					: "http://localhost:5001/api/auth/auth/google/callback",
		},
		async function verify(accessToken, refreshToken, profile, cb) {
			try {
				// console.log('email', email)
				// console.log('profile', profile)
				let existingUser = await User.findOne({
					email: profile.emails[0].value,
				});
				// if user exists return the user
				if (existingUser) {
					console.log("Found existing user...");
					return cb(null, existingUser);
				}

				console.log("Creating new user...");
				// if user does not exist create a new user
				const newUser = new User({
					method: "google",
					username: profile.displayName,
					password: makeId(10),
					empires: [],
					email: profile.emails[0].value,
				});
				await newUser.save();
				return cb(null, newUser);
			} catch (error) {
				console.error("Error in /auth/google:", error);
				return cb(error, false);
			}
		},
	),
);

passport.serializeUser((user, done) => {
	console.log("serializing user...");
	done(null, user);
});

passport.deserializeUser((user: any, done) => {
	console.log("deserializing user...");
	done(null, user);
});

const router = Router();
router.get("/login-from-link/:token", language, loginFromLink);
// router.get("/demo-token", createDemoToken);
router.post("/register", language, register);
router.post("/demo", language, demoAccount);
router.post("/login", language, login);
router.get("/me", user, auth, me);
router.get("/logout", user, auth, logout);
router.post("/forgot-password", language, forgotPassword);
router.post("/confirm-token", language, confirmToken);
router.post("/forgot-username", language, forgotUsername);
router.get(
	"/auth/google",
	passport.authenticate("google", { scope: ["profile", "email"] }),
);
router.get("/auth/google/callback", (req, res, next) => {
	passport.authenticate("google", async (err, gUser) => {
		console.log("hello");
		// console.log(user)
		if (err) {
			console.log("Error", err);
			return next(err);
		}
		if (!gUser) {
			console.log("No user");
			return res.redirect(
				process.env.NODE_ENV === "production"
					? "https://www.neopromisance.com/login"
					: "http://localhost:5173/login",
			);
		}

		console.log("user found");
		console.log(gUser.username);
		const user = await User.findOne({ username: gUser.username });
		console.log(user);
		const username = gUser.username;
		const token = jwt.sign({ username }, process.env.JWT_SECRET!);

		const data = token;
		const time = 3600;
		// console.log(token)
		try {
			res.set(
				"Set-Cookie",
				cookie.serialize("token", token, {
					// httpOnly: true,
					domain:
						process.env.NODE_ENV === "production" ? ".neopromisance.com" : "",
					secure: process.env.NODE_ENV === "production",
					sameSite: "strict",
					maxAge: time,
					path: "/",
				}),
			);
		} catch (error) {
			console.log(error);
		}

		// const session = new Session()
		// session.data = data
		// session.time = time
		// session.user_id = user.id
		// if (user?.empires?.length > 0) {
		// 	session.empire_id = user.empires[0].id
		// }
		// session.role = 'user'
		// await session.save()

		user.lastIp =
			<string>req.connection.remoteAddress ||
			<string>req.headers["x-forwarded-for"];

		await user.save();

		return res.redirect(
			process.env.NODE_ENV === "production"
				? "https://www.neopromisance.com/select?token=" + token.slice(0, 18)
				: "http://localhost:5173/select?token=" + token.slice(0, 18),
		);
	})(req, res, next);
});

export default router;

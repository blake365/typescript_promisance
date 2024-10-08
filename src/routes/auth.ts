import type { Request, Response } from "express";
import e, { Router } from "express";
import { validate, isEmpty } from "class-validator";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
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
const GoogleStrategy = passportGoogle.Strategy;

const mapErrors = (errors: Object[]) => {
	return errors.reduce((prev: any, err: any) => {
		prev[err.property] = Object.entries(err.constraints)[0][1];
		return prev;
	}, {});
};

const register = async (req: Request, res: Response) => {
	const { email, username, password } = req.body;

	const empires = [];
	let errors: any = {};

	const emailUser = await User.findOne({ email });
	const usernameUser = await User.findOne({ username });

	if (emailUser) errors.email = "Email is already in use";
	if (usernameUser) errors.username = "Username is already taken";

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
	// console.log(username, password)
	try {
		let errors: any = {};
		if (isEmpty(username)) errors.username = "Username must not be empty";
		if (isEmpty(password)) errors.password = "Password must not be empty";
		if (Object.keys(errors).length > 0) {
			return res.status(400).json(errors);
		}

		const user = await User.findOne({ username }, { relations: ["empires"] });
		// console.log(user)

		if (!user) return res.status(404).json({ username: "User not found" });

		const passwordMatches = await bcrypt.compare(password, user.password);

		if (!passwordMatches) {
			return res.status(401).json({ password: "Password is incorrect" });
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
		return res.json({ error: "Something went wrong" });
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
		return res.status(400).json({
			error:
				"An error occurred, please try again. Make an account if this problem persists.",
		});
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
			return res.status(500).json({
				error: "Please wait a while before creating a new demo account",
			});
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

	if (!token) {
		return res.status(400).json({ error: "Invalid token" });
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
			return res.status(400).json({ error: "Invalid token payload" });
		}

		if (decoded.issuer !== "rebornpromisance.com") {
			return res.status(400).json({ error: "Invalid token" });
		}

		if (decoded.expiration < new Date()) {
			return res.status(400).json({ error: "Token expired" });
		}

		if (decoded.secret !== process.env.LINK_SECRET) {
			return res.status(400).json({ error: "Invalid token" });
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
				email: username + "@neopromisance.com",
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

	// console.log(origin)

	try {
		const user = await User.findOne({ email });

		if (!user) {
			return res.json({ error: "Email address not found" });
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
		const text = `NeoPromisance password reset link: ${link}. NeoPromisance username: ${user.username}.`;
		const html = `<p>Click the link below to reset your NeoPromisance password:</p><a href="${link}">${link}</a><p>Your NeoPromisance username is: ${user.username}.</p>`;

		await sendSESEmail(
			email,
			"admin@neopromisance.com",
			"Reset your NeoPromisance password",
			text,
			html,
		);

		return res.json({
			message: "Email sent, be sure to check your spam filters",
		});
	} catch (err) {
		console.log(err);
		return res.json({ error: "Something went wrong" });
	}
};

const confirmToken = async (req: Request, res: Response) => {
	const { token, password } = req.body;

	try {
		const resetToken = await ResetToken.findOne({
			selector: token.slice(0, 18),
		});

		if (!resetToken) {
			return res.json({ error: "Invalid Request" });
		}

		const isValid = await bcrypt.compare(token.slice(18), resetToken.verifier);

		if (resetToken.expiredAt < new Date()) {
			return res.json({ error: "Token expired" });
		}

		// console.log(isValid)
		if (!isValid) {
			return res.json({ error: "Invalid Request" });
		}

		const user = await User.findOne({ email: resetToken.email });

		if (!user) {
			return res.json({ error: "User not found" });
		}

		user.password = await bcrypt.hash(password, 6);
		await user.save();
		await resetToken.remove();
		return res.json({ message: "Success!" });
	} catch (err) {
		console.log(err);
		return res.json({ error: "Something went wrong" });
	}
};

const forgotUsername = async (req: Request, res: Response) => {
	const { email } = req.body;

	try {
		const user = await User.findOne({ email });

		if (!user) {
			return res.json({ error: "Email address not found" });
		}

		const text = `Your username is: ${user.username}`;

		return res.json({ message: text });
	} catch (err) {
		console.log(err);
		return res.json({ error: "Something went wrong" });
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
router.get("/login-from-link/:token", loginFromLink);
// router.get("/demo-token", createDemoToken);
router.post("/register", register);
router.post("/demo", demoAccount);
router.post("/login", login);
router.get("/me", user, auth, me);
router.get("/logout", user, auth, logout);
router.post("/forgot-password", forgotPassword);
router.post("/confirm-token", confirmToken);
router.post("/forgot-username", forgotUsername);
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

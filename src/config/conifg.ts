export const GAME_VERSION = 0.1
export const GAME_TITLE = 'NeoPromisance' + ' ' + GAME_VERSION // server title, may customize to liking
export const URL_BASE = 'http://www.yoursite.com/promisance/' // the path in which Promisance is installed
export const URL_HOMEPAGE = 'http://www.yoursite.com/' // where users will be sent when they logout
export const URL_FORUMS = 'http://www.yoursite.com/forums/viewforum.php?f=N' // where your site's forums are located
// (comment out if you have none)
export const MAIL_ADMIN = 'admin@yoursite.com' // administrative contact address
export const MAIL_VALIDATE = 'promisance@yoursite.com' // source address for validation emails
export const TXT_NEWS =
	'<span style="color:white">Welcome to ' + GAME_TITLE + '!</span>'
// news message displayed at top of all pages
// undefine if you don't want any
export const TXT_RULES =
	'Additional information can be found in our forums.<br />' + // extra rules to display on signup page
	'Please read through the FAQs before contacting an Administrator.' // undefine if you don't want any
export const TXT_EMAIL =
	'Be sure to check out http://www.qmtpro.com/ and tell your friends about us!'
// custom text to display in signup email
export const DEFAULT_LANGUAGE = 'en-US' // Default language pack to use, also used when not logged in
export const BASE_LANGUAGE = 'en-US' // Base language pack, used for anything not defined in current/default

export const ROUND_START = new Date('2023-12-01T08:00:00') // Date and time of round start
export const ROUND_END = new Date('2023-12-29T18:00:00') // Date and time of round end

export const ROUND_NAME = 'Round 0' // Name of round
export const ROUND_DESCRIPTION = 'Test' // Description of round

export const EMPIRES_PER_USER = 1 // How many empires can be owned at once by a particular user?
export const TURNS_PROTECTION = 400 // Duration of protection
export const TURNS_INITIAL = 250 // Turns given on signup
export const TURNS_MAXIMUM = 400 // Max accumulated turns
export const TURNS_STORED = 200 // Max stored turns
export const TURNS_VALIDATE = 150 // How long before validation is necessary
export const TURNS_ERA = 500 // Minimum number of turns that must be spent in an era before one can advance or regress
export const TURNS_DEMO = 600 // How many turns to give to demo accounts

export const VACATION_START = 12 // Delay before empire is protected
export const VACATION_LIMIT = 72 // Minimum vacation length (not including start delay)

export const TURNS_FREQ = 10 // how often to give turns
export const TURNS_OFFSET = 0 // offset (in minutes) for giving turns, relative to round start
export const TURNS_OFFSET_HOURLY = 0 // offset (in minutes) for performing hourly events, relative to round start
export const TURNS_OFFSET_DAILY = 60 * 12 // offset (in minutes) for performing daily events, relative to round start
export const TURNS_CRONTAB = true // use "turns.php" to give out turns, scheduled via crontab; otherwise, trigger on page loads
export const TURNS_CRONLOG = true // if TURNS_CRONTAB is disabled, store turn logs in the database for retrieval by turns.php
export const TURNS_COUNT = 2 // how many turns to give during each period
export const TURNS_UNSTORE = 1 // how many turns to release from Stored Turns at once

export const IDLE_TIMEOUT_NEW = 3 // Remove new empire if idle for this many days before being prompted to validate (create and abandon)
export const IDLE_TIMEOUT_VALIDATE = 2 // Remove new empire if prompted to validate but fails to do so within this many days (bad email address)
export const IDLE_TIMEOUT_ABANDON = 14 // Remove established empire if idle for this many days (and not on vacation or disabled)
export const IDLE_TIMEOUT_KILLED = 2 // Remove dead empire after this many days if never logged in to see notification
export const IDLE_TIMEOUT_DELETE = 3 // Remove deleted empire after this many days (unless still under protection, in which case it is immediate)

export const LOTTERY_MAXTICKETS = 3 // Maximum number of lottery tickets per empire
export const LOTTERY_JACKPOT: number = 1000000000 // Base jackpot

export const BUILD_COST = 10000 // Base building cost
export const DROP_DELAY = 60 * 60 * 12 // Minimum delay (in seconds) between gaining land and dropping it

export const BANK_SAVERATE = 4.0 // Base savings interest rate
export const BANK_LOANRATE = 7.5 // Base loan interest rate

export const PUBMKT_START = 6 // Hours before goods will arrive on public market
export const PUBMKT_MINTIME = -1 // Number of hours before users can manually remove items (-1 to disallow)
export const PUBMKT_MAXTIME = 72 // Number of hours before items are automatically removed (-1 to disallow)
export const PUBMKT_MINSELL = 0 // Minimum percentage of troops, per shipment, that can be sold on public market (0-100)
export const PUBMKT_MAXSELL = 50 // Maximum percentage of troops, total, that can be sold on public market (0-100)
export const PUBMKT_MINFOOD = 0 // Same as MINSELL, except for food
export const PUBMKT_MAXFOOD = 90 // Same as MAXSELL, except for food
export const PUBMKT_MINRUNES = 0 // Same as MINSELL, except for runes
export const PUBMKT_MAXRUNES = 90 // Same as MAXSELL, except for runes

export const CLAN_ENABLE = true // Master enable for clans
export const CLAN_MINJOIN = 72 // Empires can't leave clans until they've been a member for this many hours
export const CLAN_MINREJOIN = 24 // Empires can't create/join a new clan until this many hours after they left
export const CLAN_MINSHARE = 2 // Unsharing clan forces takes this many hours to take effect
export const CLAN_MINRELATE = 48 // How long a clan must wait before it can modify an alliance or war slot
export const CLAN_MAXALLY = 3 // Maximum number of alliances (outbound and inbound)
export const CLAN_MAXWAR = 3 // Maximum number of wars (outbound only)
export const CLAN_VIEW_STAT = true // Allow clan leaders to view the detailed Empire Status of members
export const CLAN_VIEW_AID = true // Display summary of all foreign aid sent between clan members on Clan Management page
export const CLAN_INVITE_TIME = 48 // How long clan invites last before they expire
export const CLAN_LATE_JOIN = true // Allow empires to join clans during the cooldown period

export const PVTM_MAXSELL = 8000 // Percentage of troops that can be sold on private market (0-10000)
export const PVTM_SHOPBONUS = 0.2 // Percentage of private market cost bonus for which shops are responsible (0-1)
export const PVTM_TRPARM = 500 // Base market costs for each unit
export const PVTM_TRPLND = 1000
export const PVTM_TRPFLY = 2000
export const PVTM_TRPSEA = 3000
export const PVTM_FOOD = 30
export const PVTM_RUNES = 1400

export const INDUSTRY_MULT = 3 // Industry output multiplier
export const MAX_ATTACKS = 35 // Maximum number of attacks
export const MAX_SPELLS = 25 // Maximum number of attack spells
export const DR_RATE = 1.5 // diminishing returns rate
export const BASE_LUCK = 5 // Base luck

export const AID_ENABLE = true // Enable sending foreign aid
export const AID_MAXCREDITS = 5 // Maximum number of aid credits that can be accumulated at once
export const AID_DELAY = 60 * 60 * 3 // Once you send too much aid, how many seconds before you can send more
export const MESSAGES_MAXCREDITS = 5 // Maximum number of new private messages that can be sent at once
export const MESSAGES_DELAY = 10 * 60 // Once you send too many messages, how many seconds before you can send more
export const FRIEND_MAGIC_ENABLE = false // Enable casting spells on friendly empires
export const SCORE_ENABLE = false // Enable keeping score for empires attacking each other
export const MAGIC_ALLOW_REGRESS = true // Enables usage of the "Regress to Previous Era" spell
export const GRAVEYARD_DISCLOSE = false // Reveal user account name of empires in the Graveyard

export const CLANSTATS_MINSIZE = 1 // Minimum member count for inclusion on Top Clans page
export const TOPEMPIRES_COUNT = 50 // Maximum number of empires to list on Top Empires page
export const TOPPLAYERS_COUNT = 50 // Maximum number of user accounts to list on All Time Top Players page

export const SIGNUP_CLOSED_USER = false // Don't allow creation of new user accounts from signup page
export const SIGNUP_CLOSED_EMPIRE = false // Don't allow creation of new empires from signup page

export const VALIDATE_REQUIRE = false // Require users to validate their empires before they can continue playing
export const VALIDATE_ALLOW = false // Allow users to validate their own empires
export const VALIDATE_RESEND = 60 * 60 // How long users must wait between resending their validation code

export const COUNTER_TEMPLATE = 'counter2.png' // Digit style for "registered empires" counter
// Set to empty string to use plain bold text
export const COUNTER_DIGITS = 3 // Number of digits for "registered empires" counter
// Set to 0 to determine automatically

export const BONUS_TURNS = true // Allow users to collect 1 hour worth of bonus turns each day.
// Turns are collected by clicking a banner (defined below) or,
// if none are defined, a "Bonus Turns" button at the top of the page.

export const banners = [] // Define banners below. Do NOT use paid advertisements if bonus
// turns are enabled, as it provides an incentive for click fraud.
// $banners[] = array('label' => 'Hover text', 'image' => 'Image URL', 'url' => 'Click URL', 'width' => '468', 'height' => '60', 'ismap' => '1' if imagemap, '0' if not);

// Stylesheets for use in-game
// export const styles = [
// 	{qmt => array('file' => 'qmt.css', 'name' => 'QMT Black'),
// 	'ezclan' => array('file' => 'ezclan.css', 'name' => 'EZClan Blue'),
// ]

export const DEFAULT_STYLE = 'qmt' // Default style, also used when not logged in
export const DEFAULT_TIMEZONE = -21600 // Default timezone for new accounts
// Specify UTC offset in seconds, must be defined in constants.php
export const DEFAULT_DATEFORMAT = 'r' // Default date/time format for new accounts

export const LOG_ENABLE = false // Enable logging of all in-game events
// Warnings are logged regardless of this setting
export const DEBUG_FOOTER = false // Display page generation time, memory usage, and query count at bottom of page

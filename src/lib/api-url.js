import { env } from '$env/dynamic/private';

/**
 * Return url to telegram api, optionally with parameters added
 * https://github.com/cvzi/telegram-bot-cloudflare/blob/b149ea8d0300c5c879adee1a48f4841169ac64d8/bot4.js#L126
 */
function apiUrl(methodName, params = null) {
	let query = '';
	if (params) {
		query = '?' + new URLSearchParams(params).toString();
	}
	return `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${methodName}${query}`;
}

export { apiUrl };

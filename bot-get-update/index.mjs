import TelegramBot from 'node-telegram-bot-api';
import { nanoid } from 'nanoid';
// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TG_BOT_TOKEN;
const D1_TOKEN = process.env.D1_TOKEN;
const D1_ACCOUNT_ID = process.env.D1_ACCOUNT_ID;
const D1_DB_ID = process.env.D1_DB_ID;
const BASE_URL = process.env.BASE_URL; // url of sveltekit with https://

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', async (message) => {
	// console.log(msg)
	// const chatId = msg.chat.id;

	if ('new_chat_member' in message) {
		try {
			await fetch(
				apiUrl('deleteMessage', { chat_id: message.chat.id, message_id: message.message_id })
			);
		} catch (e) {
			console.log(e);
		}

		const newMember = message['new_chat_member'];

		if (newMember['is_bot']) {
			return;
		}

		var tgUser = await (
			await fetch(d1Url(), {
				method: 'POST',
				headers: {
					Authorization: D1_TOKEN
				},
				body: JSON.stringify({
					params: [newMember.id],
					sql: 'SELECT * from tg_user WHERE user_id = ?'
				})
			})
		).json();
		tgUser = tgUser['result'][0]['results'];

		if (tgUser.length == 0) {
			await fetch(d1Url(), {
				method: 'POST',
				headers: {
					Authorization: D1_TOKEN
				},
				body: JSON.stringify({
					params: [
						newMember.id,
						newMember.first_name,
						newMember?.last_name || '',
						JSON.stringify(newMember),
						0
					],
					sql: 'INSERT INTO tg_user VALUES (?, ?, ?, ?, ?)'
				})
			});
		}

		const restrictUntil = parseInt(new Date().getTime() / 1000 + 3.024e7); // 350 days

		var responseJson = await (
			await fetch(
				apiUrl('restrictChatMember', {
					chat_id: message.chat.id,
					user_id: newMember.id,
					until_date: restrictUntil,
					permissions: JSON.stringify({
						can_send_messages: false,
						can_send_media_messages: false,
						can_send_other_messages: false,
						can_add_web_page_previews: false,
						can_send_polls: false,
						can_change_info: false,
						can_pin_messages: false,
						can_manage_topics: false,
						can_invite_users: false
					})
				})
			)
		).json();
		if (!responseJson.ok) {
			console.log(responseJson);
			return;
		}

		const requestId = nanoid();

		var responseJson = await (
			await fetch(
				apiUrl('sendMessage', {
					chat_id: message.chat.id,
					parse_mode: 'MarkdownV2',
					protect_content: true,
					text: `Halo [${newMember.first_name}](tg://user?id=${newMember.id}), Klik Verifikasi untuk bisa mengirim pesan`,
					reply_markup: JSON.stringify({
						inline_keyboard: [
							[{ text: 'Verifikasi', login_url: { url: `${BASE_URL}/verify/${requestId}` } }]
						]
					})
				})
			)
		).json();
		if (!responseJson.ok) {
			console.log(responseJson);
			return;
		}

		if (responseJson.ok) {
			await fetch(d1Url(), {
				method: 'POST',
				headers: {
					Authorization: D1_TOKEN
				},
				body: JSON.stringify({
					params: [
						requestId,
						newMember.id,
						message.chat.id,
						message.date,
						'wait-for-verification',
						nanoid(4),
						responseJson.result.message_id
					],
					sql: 'INSERT INTO tg_waitlist VALUES (?, ?, ?, ?, ?, ?, ?)'
				})
			});
		}
	}
});

function apiUrl(methodName, params = null) {
	let query = '';
	if (params) {
		query = '?' + new URLSearchParams(params).toString();
	}
	return `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/${methodName}${query}`;
}

function d1Url() {
	return `https://api.cloudflare.com/client/v4/accounts/${D1_ACCOUNT_ID}/d1/database/${D1_DB_ID}/query`;
}

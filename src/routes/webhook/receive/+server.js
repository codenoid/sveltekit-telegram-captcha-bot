import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { apiUrl } from '$lib/api-url.js';
import { isInSubnet } from 'is-in-subnet';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('23456789ABCDEFGHJKLMNPRTWXYZ', 10);

export async function POST({ request, url, platform, locals }) {
	const ip = request.headers.get('cf-connecting-ip');

	if (!isInSubnet(ip, '149.154.160.0/20') && !isInSubnet(ip, '91.108.4.0/22')) {
		locals.logger.info('Request from outside allowed subnet', { payload: { ip } });
		return json({});
	}

	const payload = await request.json();
	if ('message' in payload) {
		const message = payload.message;

		if (message.from.is_bot) {
			return json({});
		}

		if ('new_chat_member' in message) {
			await fetch(
				apiUrl('deleteMessage', { chat_id: message.chat.id, message_id: message.message_id })
			);

			const newMember = message['new_chat_member'];

			if (newMember['is_bot']) {
				return json({});
			}

			const tgUser = await platform.env.DB.prepare('SELECT * from tg_user WHERE user_id = ?')
				.bind(newMember.id)
				.first();

			if (!tgUser) {
				await platform.env.DB.prepare('INSERT INTO tg_user VALUES (?, ?, ?, ?, ?)')
					.bind(
						newMember.id,
						newMember.first_name,
						newMember?.last_name || '',
						JSON.stringify(newMember),
						0
					)
					.run();
			} else {
				switch (tgUser.automated_account) {
					case 1:
						await fetch(
							apiUrl('banChatMember', {
								chat_id: message.chat.id,
								user_id: newMember.id,
								until_date: 0,
								revoke_messages: true
							})
						);
						locals.logger.warn('Banned user with automated account', { payload: { newMember } });
						return json({});
					case 2:
						locals.logger.info('Allowing user with non-automated account', {
							payload: { newMember }
						});
						return json({});
				}
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
				locals.logger.error('error restrict', { payload: { response: responseJson, request } });
				error(500, 'error');
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
								[{ text: 'Verifikasi', login_url: { url: `${url.origin}/verify/${requestId}` } }]
							]
						})
					})
				)
			).json();
			if (!responseJson.ok) {
				locals.logger.error('error send greeting', {
					payload: { response: responseJson, request }
				});
				error(500, 'error');
			}

			if (responseJson.ok) {
				await platform.env.DB.prepare('INSERT INTO tg_waitlist VALUES (?, ?, ?, ?, ?, ?, ?)')
					.bind(
						requestId,
						newMember.id,
						message.chat.id,
						message.date,
						'wait-for-verification',
						nanoid(4),
						responseJson.result.message_id
					)
					.run();
			}
		}
	}

	return json({});
}

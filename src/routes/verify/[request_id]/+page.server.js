import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { AuthDataValidator } from '@telegram-auth/server';
import { apiUrl } from '$lib/api-url.js';

/*
 * @type {import('./$types').PageServerLoad}
 */
export async function load({ params, platform, url, locals }) {
	const tgWaitlist = await platform.env.DB.prepare(
		`SELECT tg_waitlist.*, tg_user.first_name, tg_user.last_name 
FROM tg_waitlist 
JOIN tg_user ON tg_waitlist.user_id = tg_user.user_id 
WHERE tg_waitlist.request_id = ?;`
	)
		.bind(params.request_id)
		.first();

	if (!tgWaitlist) {
		error(404, 'invalid request id');
	}

	try {
		const validator = new AuthDataValidator({ botToken: env.TG_BOT_TOKEN });
		const user = await validator.validate(url.searchParams);

		if (user.id != tgWaitlist.user_id) {
			error(403, 'forbidden');
		}
	} catch (e) {
		locals.logger.error('invalid signature', { payload: { error: e.message } });
		locals.logger.flush();
		return error(403, 'invalid signature ' + e.message);
	}

	return {
		urlParam: url.searchParams.toString(),
		name: tgWaitlist.first_name + (tgWaitlist.last_name || '')
	};
}

export const actions = {
	default: async ({ request, params, platform, url, locals }) => {
		const form = await request.formData();
		const token = form.get('cf-turnstile-response');
		const ip = request.headers.get('CF-Connecting-IP');

		let formData = new FormData();
		formData.append('secret', env.TURNSTILE_SECRET_KEY);
		formData.append('response', token);
		formData.append('remoteip', ip);

		const cfUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
		const captchaRes = await fetch(cfUrl, { body: formData, method: 'POST' });
		const outcome = await captchaRes.json();

		if (outcome?.success != true) {
			locals.logger.warn('Failed to validate Captcha', { payload: { request } });
			locals.logger.flush();
			return { success: false, message: 'Gagal Memvalidasi Captcha' };
		}

		const tgWaitlist = await platform.env.DB.prepare(
			`SELECT tg_waitlist.*, tg_user.first_name, tg_user.last_name 
       FROM tg_waitlist 
       JOIN tg_user ON tg_waitlist.user_id = tg_user.user_id 
       WHERE tg_waitlist.request_id = ?;`
		)
			.bind(params.request_id)
			.first();

		if (!tgWaitlist) {
			error(404, 'invalid request id');
		}

		try {
			const validator = new AuthDataValidator({ botToken: env.TG_BOT_TOKEN });
			const user = await validator.validate(url.searchParams);

			if (user.id != tgWaitlist.user_id) {
				error(403, 'forbidden');
			}
		} catch (e) {
			locals.logger.error('invalid signature', { payload: { error: e.message, request } });
			locals.logger.flush();
			return error(403, 'invalid signature ' + e.message);
		}

		var responseJson = await (
			await fetch(
				apiUrl('restrictChatMember', {
					chat_id: tgWaitlist.group_id,
					user_id: tgWaitlist.user_id,
					permissions: JSON.stringify({
						can_send_messages: true,
						can_send_audios: true,
						can_send_documents: true,
						can_send_photos: true,
						can_send_videos: true,
						can_send_video_notes: true,
						can_send_voice_notes: true,
						can_send_polls: true,
						can_send_other_message: true,
						can_add_web_page_previews: true,
						can_change_info: true,
						can_invite_users: true,
						can_pin_messages: true,
						can_manage_topics: true
					})
				})
			)
		).json();

		if (!responseJson.ok) {
			locals.logger.error('error tg update', { payload: { response: responseJson, request } });
			locals.logger.flush();
			error(500, 'error tg update');
		}

		var responseJson = await (
			await fetch(
				apiUrl('deleteMessage', {
					chat_id: tgWaitlist.group_id,
					message_id: tgWaitlist.bot_message_id
				})
			)
		).json();

		if (!responseJson.ok) {
			locals.logger.error('error tg update', { payload: { response: responseJson, request } });
			locals.logger.flush();
			error(500, 'tg sudah di allow, namun error menghapus pesan robot');
		}

		await platform.env.DB.prepare("UPDATE tg_waitlist SET status = 'verified' WHERE request_id = ?")
			.bind(params.request_id)
			.run();

		return { success: true, message: 'Berhasil memverifikasi, silahkan kembali ke grup' };
	}
};

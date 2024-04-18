import { env } from '$env/dynamic/private';
import { apiUrl } from '$lib/api-url.js';

export async function GET({ url }) {
	// https://core.telegram.org/bots/api#setwebhook
	const webhookUrl = `${url.protocol}//${url.hostname}/webhook/receive`;
	const r = await (
		await fetch(
			apiUrl('setWebhook', { url: webhookUrl, secret_token: env.TG_WEBHOOK_VERIFY_SECRET })
		)
	).json();
	return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2));
}

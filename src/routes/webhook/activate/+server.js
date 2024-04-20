import { env } from '$env/dynamic/private';
import { apiUrl } from '$lib/api-url.js';
import { error, json } from '@sveltejs/kit';

export async function GET({ request, url }) {
	const authorization = request.headers.get('Authorization');

	if (!authorization || !authorization.startsWith('Basic '))
		return new Response('Unauthorized', {
			status: 401,
			headers: {
				'WWW-Authenticate': 'Basic realm="Protected"'
			}
		});

	const token = authorization.replace('Basic ', '');

	const [username, password] = atob(token).split(':');

	if (username != env.ADMIN_USERNAME || password != env.ADMIN_PASSWORD) {
		error(401, 'unauthorized');
	}

	const webhookUrl = `${url.protocol}//${url.hostname}/webhook/receive`;
	const r = await (
		await fetch(
			apiUrl('setWebhook', { url: webhookUrl, secret_token: env.TG_WEBHOOK_VERIFY_SECRET })
		)
	).json();
	return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2));
}

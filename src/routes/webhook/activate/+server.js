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

	await fetch(apiUrl('deleteWebhook', {}));

	const allowed_updates = [
		'update_id',
		'message',
		'edited_message',
		'channel_post',
		'edited_channel_post',
		'business_connection',
		'business_message',
		'edited_business_message',
		'deleted_business_messages',
		'message_reaction',
		'message_reaction_count',
		'inline_query',
		'chosen_inline_result',
		'shipping_query',
		'pre_checkout_query',
		'poll',
		'poll_answer',
		'my_chat_member',
		'chat_member',
		'chat_join_request',
		'chat_boost',
		'removed_chat_boost'
	];
	const webhookUrl = `${url.protocol}//${url.hostname}/webhook/receive`;
	const r = await (
		await fetch(
			apiUrl('setWebhook', {
				url: webhookUrl,
				allowed_updates,
				max_connections: 100,
				secret_token: env.TG_WEBHOOK_VERIFY_SECRET
			})
		)
	).json();
	return json(r);
}

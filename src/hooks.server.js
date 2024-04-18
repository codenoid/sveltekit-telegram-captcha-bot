import { BaselimeLogger } from '@baselime/edge-logger';
import { env } from '$env/dynamic/private';

export async function handle({ event, resolve }) {
	if (event.url.pathname.startsWith('/custom')) {
		return new Response('custom response');
	}

	const logger = new BaselimeLogger({
		ctx: event.platform.context,
		apiKey: env.BASELIME_API_KEY,
		service: 'tgcaptchabot',
		requestId: crypto.randomUUID()
	});

	event.locals.logger = logger;
	const response = await resolve(event);
	return response;
}

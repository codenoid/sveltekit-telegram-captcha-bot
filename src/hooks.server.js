import { BaselimeLogger } from '@baselime/edge-logger';
import { env } from '$env/dynamic/private';

export async function handle({ event, resolve }) {
	const context = event.platform?.context || {
		waitUntil: () => {},
		passThroughOnException: () => {}
	};
	const logger = new BaselimeLogger({
		ctx: context,
		namespace: event.request.url,
		dataset: 'tgcaptchabot-ds',
		apiKey: env.BASELIME_API_KEY,
		service: 'tgcaptchabot',
		requestId: crypto.randomUUID()
	});

	event.locals.logger = logger;
	const response = await resolve(event);

	context.waitUntil(logger.flush());
	return response;
}

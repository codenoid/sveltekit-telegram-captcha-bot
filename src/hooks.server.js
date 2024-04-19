import { BaselimeLogger } from '@baselime/edge-logger';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

export async function handle({ event, resolve }) {
	const context = event.platform?.context || {
		waitUntil: () => {},
		passThroughOnException: () => {}
	};

	var namespace = event.url.pathname;
	if (namespace.startsWith('/verify')) {
		namespace = '/verify';
	}
	const logger = new BaselimeLogger({
		ctx: context,
		namespace: namespace,
		dataset: 'tgcaptchabot-ds',
		apiKey: env.BASELIME_API_KEY,
		service: 'tgcaptchabot',
		isLocalDev: dev,
		requestId: crypto.randomUUID()
	});

	event.locals.logger = logger;
	const response = await resolve(event);
	if (!response.ok && response.status != 404) {
		const { url } = event;
		const ip = request.headers.get('cf-connecting-ip');
		logger.error('WebAppError', {
			url: {
				href: url.href,
				origin: url.origin,
				protocol: url.protocol,
				hostname: url.hostname,
				port: url.port,
				pathname: url.pathname,
				search: url.search,
				hash: url.hash,
			},
			ip,
		});
	}

	context.waitUntil(logger.flush());
	return response;
}

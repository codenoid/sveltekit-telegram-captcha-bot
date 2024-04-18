<script>
	import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
	import { onMount } from 'svelte';

	export let form;
	export let data;

	let currentPath;

	onMount(() => {
		currentPath = window.location.pathname;
	});

	let clickMe = false;

	const openVerif = () => {
		clickMe = true;
		turnstile.render('#captcha', {
			sitekey: PUBLIC_TURNSTILE_SITE_KEY
		});
	};
</script>

<svelte:head>
	<title>Verifikasi Captcha Grup Telegram</title>
</svelte:head>

<h1>Halo {data.name}, Lakukan verifikasi captcha</h1>

{#if form}
	{form.message}
{:else}
	lakukan verifikasi untuk bisa berdiskusi di grup.

	<form action="{currentPath}?{data.urlParam}" method="post">
		<div id="captcha"></div>
		{#if clickMe}
			<button type="submit">Submit</button>
		{:else}
			<button on:click={openVerif}>Klik untuk Verifikasi</button>
		{/if}
	</form>
{/if}

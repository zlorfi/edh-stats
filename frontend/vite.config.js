import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5173,
		proxy: {
			'/api': {
				// Use Docker service name when running in container, localhost for local dev
				target: process.env.DOCKER ? 'http://backend:3000' : 'http://localhost:3002',
				changeOrigin: true
			}
		}
	}
});

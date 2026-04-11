import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

const dockerBackendHost =
  process.env.VITE_DOCKER_BACKEND_HOST || 'edh-stats-backend'

const proxyTarget =
  process.env.VITE_PROXY_TARGET ||
  (process.env.DOCKER ? `http://${dockerBackendHost}:3000` : 'http://localhost:3002')

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5173,
		proxy: {
			'/api': {
				target: proxyTarget,
				changeOrigin: true
			}
		}
	}
})

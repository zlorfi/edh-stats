import fastify from 'fastify'
import rateLimit from '@fastify/rate-limit'

const app = fastify({ logger: true })
await app.register(rateLimit, {
  global: false
})

app.get('/', async (request, reply) => {
  return { hello: 'world' }
})

app.post(
  '/test',
  {
    config: { rateLimit: { max: 3, timeWindow: '15 minutes' } }
  },

  async (request, reply) => {
    return { received: request.body }
  }
)

app.listen({ port: 3001 }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})

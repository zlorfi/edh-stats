import fastify from 'fastify'

const app = fastify({ logger: true })

app.get('/', async (request, reply) => {
  return { hello: 'world' }
})

app.post('/test', async (request, reply) => {
  return { received: request.body }
})

app.listen({ port: 3001 }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
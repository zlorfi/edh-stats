// Authentication routes
import { z } from 'zod'
import User from '../models/User.js'
import { registrationConfig } from '../config/jwt.js'

// Validation schemas
const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        'Username can only contain letters, numbers, underscores, and hyphens'
    }),
  password: z.string().min(8).max(100),
  email: z.string().email().optional()
})

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional().default(false)
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100)
})

const updateProfileSchema = z.object({
  email: z.string().email().optional()
})

const updateUsernameSchema = z.object({
  newUsername: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        'Username can only contain letters, numbers, underscores, and hyphens'
    })
})

export default async function authRoutes(fastify, options) {
  // Public endpoint to check if registration is allowed
  fastify.get('/config', async (request, reply) => {
    return {
      allowRegistration: registrationConfig.allowRegistration
    }
  })

  // Register new user
  fastify.post(
    '/register',
    {
      config: { rateLimit: { max: 3, timeWindow: '15 minutes' } }
    },
    async (request, reply) => {
      try {
        // Check if registration is allowed
        if (!registrationConfig.allowRegistration) {
          reply.code(403).send({
            error: 'Registration Disabled',
            message: 'User registration is currently disabled'
          })
          return
        }

        // Validate input
        const validatedData = registerSchema.parse(request.body)

        // Create user
        const user = await User.create(validatedData)

        // Generate JWT token
        const token = await reply.jwtSign(
          {
            id: user.id,
            username: user.username
          },
          {
            expiresIn: '15m'
          }
        )

        reply.code(201).send({
          message: 'User registered successfully',
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.created_at
          },
          token
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors.map((e) => e.message)
          })
        } else if (error.message.includes('already exists')) {
          reply.code(400).send({
            error: 'Registration Failed',
            message: error.message
          })
        } else {
          fastify.log.error('Registration error:', error)
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to register user'
          })
        }
      }
    }
  )

  // Login user
  fastify.post(
    '/login',
    {
      config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }
    },
    async (request, reply) => {
      try {
        const { username, password } = loginSchema.parse(request.body)

        // Find user
        const user = await User.findByUsername(username)
        if (!user) {
          reply.code(401).send({
            error: 'Authentication Failed',
            message: 'Invalid username or password'
          })
          return
        }

        // Verify password
        const isValidPassword = await User.verifyPassword(
          password,
          user.password_hash
        )
        if (!isValidPassword) {
          reply.code(401).send({
            error: 'Authentication Failed',
            message: 'Invalid username or password'
          })
          return
        }

        // Generate JWT token
        const token = await reply.jwtSign(
          {
            id: user.id,
            username: user.username
          },
          {
            expiresIn: request.body.remember ? '7d' : '2h'
          }
        )

        reply.send({
          message: 'Login successful',
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          },
          token
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors.map((e) => e.message)
          })
        } else {
          fastify.log.error('Login error:', error)
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to authenticate user'
          })
        }
      }
    }
  )

  // Refresh token
  fastify.post(
    '/refresh',
    {
      config: {
        rateLimit: { max: 20, timeWindow: '15 minutes' }
      }
    },
    async (request, reply) => {
      try {
        await request.jwtVerify()

        const user = await User.findById(request.user.id)
        if (!user) {
          reply.code(401).send({
            error: 'Authentication Failed',
            message: 'User not found'
          })
          return
        }

        // Generate new token
        const token = await reply.jwtSign(
          {
            id: user.id,
            username: user.username
          },
          {
            expiresIn: '15m'
          }
        )

        reply.send({
          message: 'Token refreshed successfully',
          token
        })
      } catch (error) {
        reply.code(401).send({
          error: 'Authentication Failed',
          message: 'Invalid or expired token'
        })
      }
    }
  )

  // Get current user profile
  fastify.get(
    '/me',
    {
      preHandler: [
        async (request, reply) => {
          try {
            await request.jwtVerify()
          } catch (err) {
            reply.code(401).send({
              error: 'Unauthorized',
              message: 'Invalid or expired token'
            })
          }
        }
      ]
    },
    async (request, reply) => {
      try {
        const user = await User.findById(request.user.id)
        if (!user) {
          reply.code(404).send({
            error: 'Not Found',
            message: 'User not found'
          })
          return
        }

        reply.send({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.created_at
          }
        })
      } catch (error) {
        fastify.log.error('Get profile error:', error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to get user profile'
        })
      }
    }
  )

  // Update user profile
  fastify.patch(
    '/me',
    {
      preHandler: [
        async (request, reply) => {
          try {
            await request.jwtVerify()
          } catch (err) {
            reply.code(401).send({
              error: 'Unauthorized',
              message: 'Invalid or expired token'
            })
          }
        }
      ]
    },
    async (request, reply) => {
      try {
        const validatedData = updateProfileSchema.parse(request.body)

        const updated = await User.updateProfile(request.user.id, validatedData)

        if (!updated) {
          reply.code(400).send({
            error: 'Update Failed',
            message: 'No valid fields to update'
          })
          return
        }

        const user = await User.findById(request.user.id)

        reply.send({
          message: 'Profile updated successfully',
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            updated_at: user.updated_at
          }
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors.map((e) => e.message)
          })
        } else if (error.message.includes('already exists')) {
          reply.code(400).send({
            error: 'Update Failed',
            message: error.message
          })
        } else {
          fastify.log.error('Update profile error:', error)
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to update profile'
          })
        }
      }
    }
  )

  // Update username (PUT)
  fastify.put(
    '/update-username',
    {
      preHandler: [
        async (request, reply) => {
          try {
            await request.jwtVerify()
          } catch (err) {
            reply.code(401).send({
              error: 'Unauthorized',
              message: 'Invalid or expired token'
            })
          }
        }
      ],
      config: { rateLimit: { max: 5, timeWindow: '1 hour' } }
    },
    async (request, reply) => {
      try {
        const { newUsername } = updateUsernameSchema.parse(request.body)

        // Check if username is already taken
        const existingUser = await User.findByUsername(newUsername)
        if (existingUser && existingUser.id !== request.user.id) {
          reply.code(400).send({
            error: 'Username Taken',
            message: 'Username is already taken'
          })
          return
        }

        // Update username using User model method
        const updated = await User.updateUsername(request.user.id, newUsername)

        if (!updated) {
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to update username'
          })
          return
        }

        const user = await User.findById(request.user.id)

        reply.send({
          message: 'Username updated successfully',
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors.map((e) => e.message)
          })
        } else {
          fastify.log.error('Update username error:', error)
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to update username'
          })
        }
      }
    }
  )

  // Change password (POST - keep for backward compatibility)
  fastify.post(
    '/change-password',
    {
      preHandler: [
        async (request, reply) => {
          try {
            await request.jwtVerify()
          } catch (err) {
            reply.code(401).send({
              error: 'Unauthorized',
              message: 'Invalid or expired token'
            })
          }
        }
      ],
      config: { rateLimit: { max: 3, timeWindow: '1 hour' } }
    },
    async (request, reply) => {
      try {
        const { currentPassword, newPassword } = changePasswordSchema.parse(
          request.body
        )

        // Verify current password
        const user = await User.findByUsername(request.user.username)
        if (!user) {
          reply.code(404).send({
            error: 'Not Found',
            message: 'User not found'
          })
          return
        }

        const isValidPassword = await User.verifyPassword(
          currentPassword,
          user.password_hash
        )
        if (!isValidPassword) {
          reply.code(401).send({
            error: 'Authentication Failed',
            message: 'Current password is incorrect'
          })
          return
        }

        // Update password
        const updated = await User.updatePassword(request.user.id, newPassword)

        if (!updated) {
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to update password'
          })
          return
        }

        reply.send({
          message: 'Password changed successfully'
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors.map((e) => e.message)
          })
        } else {
          fastify.log.error('Change password error:', error)
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to change password'
          })
        }
      }
    }
  )

  // Change password (PUT)
  fastify.put(
    '/change-password',
    {
      preHandler: [
        async (request, reply) => {
          try {
            await request.jwtVerify()
          } catch (err) {
            reply.code(401).send({
              error: 'Unauthorized',
              message: 'Invalid or expired token'
            })
          }
        }
      ],
      config: { rateLimit: { max: 3, timeWindow: '1 hour' } }
    },
    async (request, reply) => {
      try {
        const { currentPassword, newPassword } = changePasswordSchema.parse(
          request.body
        )

        // Verify current password
        const user = await User.findByUsername(request.user.username)
        if (!user) {
          reply.code(404).send({
            error: 'Not Found',
            message: 'User not found'
          })
          return
        }

        const isValidPassword = await User.verifyPassword(
          currentPassword,
          user.password_hash
        )
        if (!isValidPassword) {
          reply.code(401).send({
            error: 'Authentication Failed',
            message: 'Current password is incorrect'
          })
          return
        }

        // Update password
        const updated = await User.updatePassword(request.user.id, newPassword)

        if (!updated) {
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to update password'
          })
          return
        }

        reply.send({
          message: 'Password changed successfully'
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors.map((e) => e.message)
          })
        } else {
          fastify.log.error('Change password error:', error)
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to change password'
          })
        }
      }
    }
  )
}

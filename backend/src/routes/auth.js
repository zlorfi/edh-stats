// Authentication routes
import { z } from 'zod'
import UserRepository from '../repositories/UserRepository.js'
import { registrationConfig } from '../config/jwt.js'
import {
  validatePasswordStrength,
  isNotReservedUsername,
  isNotDisposableEmail,
  formatValidationErrors,
  createErrorResponse
} from '../utils/validators.js'

// Validation schemas with enhanced validation
const registerSchema = z.object({
  username: z
    .string('Username must be a string')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        'Username can only contain letters, numbers, underscores, and hyphens'
    })
    .transform((val) => val.toLowerCase().trim())
    .refine((val) => isNotReservedUsername(val), {
      message: 'This username is reserved and cannot be used'
    }),
  
  password: z
    .string('Password must be a string')
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .refine((val) => /(?=.*[a-z])/.test(val), {
      message: 'Password must contain at least one lowercase letter'
    })
    .refine((val) => /(?=.*[A-Z])/.test(val), {
      message: 'Password must contain at least one uppercase letter'
    })
    .refine((val) => /(?=.*\d)/.test(val), {
      message: 'Password must contain at least one number'
    }),
  
  email: z
    .string('Email must be a string')
    .email('Invalid email format')
    .toLowerCase()
    .refine((val) => isNotDisposableEmail(val), {
      message: 'Disposable email addresses are not allowed'
    })
    .optional()
})

const loginSchema = z.object({
  username: z
    .string('Username is required')
    .min(1, 'Username is required')
    .transform((val) => val.toLowerCase().trim()),
  
  password: z
    .string('Password is required')
    .min(1, 'Password is required'),
  
  remember: z.boolean('Remember must be true or false').optional().default(false)
})

const changePasswordSchema = z.object({
  currentPassword: z
    .string('Current password is required')
    .min(1, 'Current password is required'),
  
  newPassword: z
    .string('New password must be a string')
    .min(8, 'New password must be at least 8 characters')
    .max(100, 'New password must be less than 100 characters')
    .refine((val) => /(?=.*[a-z])/.test(val), {
      message: 'Password must contain at least one lowercase letter'
    })
    .refine((val) => /(?=.*[A-Z])/.test(val), {
      message: 'Password must contain at least one uppercase letter'
    })
    .refine((val) => /(?=.*\d)/.test(val), {
      message: 'Password must contain at least one number'
    })
})

const updateProfileSchema = z.object({
  email: z
    .string('Email must be a string')
    .email('Invalid email format')
    .toLowerCase()
    .refine((val) => isNotDisposableEmail(val), {
      message: 'Disposable email addresses are not allowed'
    })
    .optional()
})

const updateUsernameSchema = z.object({
  newUsername: z
    .string('Username must be a string')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        'Username can only contain letters, numbers, underscores, and hyphens'
    })
    .transform((val) => val.toLowerCase().trim())
    .refine((val) => isNotReservedUsername(val), {
      message: 'This username is reserved and cannot be used'
    })
})

export default async function authRoutes(fastify, options) {
  // Initialize repository
  const userRepo = new UserRepository()

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
          return reply.code(403).send({
            error: 'Registration Disabled',
            message: 'User registration is currently disabled'
          })
        }

        // LAYER 1: Schema validation
        const validatedData = registerSchema.parse(request.body)

        // LAYER 2: Business logic validation
        // Check username uniqueness
        const existingUser = await userRepo.findByUsername(validatedData.username)
        if (existingUser) {
          return reply.code(409).send({
            error: 'Conflict',
            message: 'Username already taken',
            details: ['This username is already in use. Please choose another.']
          })
        }

        // Check email uniqueness (if provided)
        if (validatedData.email) {
          const existingEmail = await userRepo.findByEmail(validatedData.email)
          if (existingEmail) {
            return reply.code(409).send({
              error: 'Conflict',
              message: 'Email already registered',
              details: ['This email is already in use. Please use a different email.']
            })
          }
        }

        // Create user
        const user = await userRepo.createUser(
          validatedData.username,
          validatedData.password,
          validatedData.email
        )

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
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: formatValidationErrors(error)
          })
        } else if (error.message.includes('already exists')) {
          return reply.code(409).send({
            error: 'Conflict',
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
        // LAYER 1: Schema validation
        const { username, password } = loginSchema.parse(request.body)

        // LAYER 2: Find user (also serves as authorization check)
        const user = await userRepo.findByUsername(username)
        if (!user) {
          // Generic error message to prevent username enumeration
          return reply.code(401).send({
            error: 'Authentication Failed',
            message: 'Invalid username or password'
          })
        }

        // Verify password
        const isValidPassword = await userRepo.verifyPassword(
          password,
          user.password_hash
        )
        if (!isValidPassword) {
          // Generic error message to prevent username enumeration
          return reply.code(401).send({
            error: 'Authentication Failed',
            message: 'Invalid username or password'
          })
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

         const user = await userRepo.findById(request.user.id)
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
         const user = await userRepo.findById(request.user.id)
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

         const updated = await userRepo.updateProfile(request.user.id, validatedData)

         if (!updated) {
           reply.code(400).send({
             error: 'Update Failed',
             message: 'No valid fields to update'
           })
           return
         }

         const user = await userRepo.findById(request.user.id)

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
         const existingUser = await userRepo.findByUsername(newUsername)
         if (existingUser && existingUser.id !== request.user.id) {
           reply.code(400).send({
             error: 'Username Taken',
             message: 'Username is already taken'
           })
           return
         }

         // Update username using repository method
         const updated = await userRepo.updateUsername(request.user.id, newUsername)

         if (!updated) {
           reply.code(500).send({
             error: 'Internal Server Error',
             message: 'Failed to update username'
           })
           return
         }

         const user = await userRepo.findById(request.user.id)

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
         const user = await userRepo.findByUsername(request.user.username)
         if (!user) {
           reply.code(404).send({
             error: 'Not Found',
             message: 'User not found'
           })
           return
         }

         const isValidPassword = await userRepo.verifyPassword(
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
         const updated = await userRepo.updatePassword(request.user.id, newPassword)

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
          const user = await userRepo.findByUsername(request.user.username)
          if (!user) {
            reply.code(404).send({
              error: 'Not Found',
              message: 'User not found'
            })
            return
          }

          const isValidPassword = await userRepo.verifyPassword(
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
          const updated = await userRepo.updatePassword(request.user.id, newPassword)

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

   // Delete account (DELETE /me)
   fastify.delete(
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
       ],
       config: { rateLimit: { max: 2, timeWindow: '1 hour' } }
     },
     async (request, reply) => {
       try {
         const userId = request.user.id

         // Delete user account (cascades to commanders and games)
         const deleted = await userRepo.deleteUser(userId)

         if (!deleted) {
           reply.code(404).send({
             error: 'Not Found',
             message: 'User not found'
           })
           return
         }

         reply.send({
           message: 'Account deleted successfully'
         })
       } catch (error) {
         fastify.log.error('Delete account error:', error)
         reply.code(500).send({
           error: 'Internal Server Error',
           message: 'Failed to delete account'
         })
       }
     }
   )
}

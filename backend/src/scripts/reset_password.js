import User from '../models/User.js'
import dbManager from '../config/database.js'

async function resetPassword() {
  try {
    console.log('Initializing database...')
    await dbManager.initialize()
    
    const username = 'newuser'
    const newPassword = 'password123'
    
    console.log(`Resetting password for user: ${username}`)
    
    // Find user
    const user = await User.findByUsername(username)
    if (!user) {
      console.error('User not found!')
      process.exit(1)
    }
    
    // Update password
    const success = await User.updatePassword(user.id, newPassword)
    
    if (success) {
      console.log('Password reset successfully!')
      
      // Verify immediately
      const updatedUser = await User.findByUsername(username)
      const isValid = await User.verifyPassword(newPassword, updatedUser.password_hash)
      console.log(`Verification result: ${isValid ? 'SUCCESS' : 'FAILED'}`)
    } else {
      console.error('Failed to update password')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await dbManager.close()
  }
}

resetPassword()

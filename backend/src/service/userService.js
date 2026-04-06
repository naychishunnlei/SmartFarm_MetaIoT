import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config/environment.js'
import userRepository from '../data/userRepository.js'

class UserService {
    async register(userData) {
        const {name, email, password} = userData

        //check if user exist or not
        const existingUser = await userRepository.findByEmail(email)
        if (existingUser) {
            throw new Error ('account with this mail already exists')
        }

        //hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        //create user
        const newUser = await userRepository.create({
            name,
            email,
            password: hashedPassword
        })
        return newUser
    }

    async login(email, password) {
        //find user by mail
        const user = await userRepository.findByEmail(email)
        if(!user) {
            throw new Error('Invalid email or password')
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch){
            throw new Error('invalid credentials')
        }

        //create jwt payload
        const payload = {
            userId: user.id,
            email: user.email
        }

        //sign the token
        const token = jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn,
        })

        // Return user info and token (excluding password)
        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                has_avatar: user.has_avatar,
                avatar_config: user.avatar_config
            },
        }
    }

    async updateAvatar(userId, avatarConfig) {
        const updatedUser = await userRepository.updateAvatar(userId, avatarConfig)
        if (!updatedUser) throw new Error('User not found')
        return updatedUser
    }
}

export default new UserService();



import userService from '../../../backend/src/service/userService.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import userRepository from '../../../backend/src/data/userRepository.js'

// Mock bcrypt
jest.mock('bcryptjs', () => ({
    hash: jest.fn(),
    compare: jest.fn()
}));

// Mock JWT
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn()
}));

// Mock repository
jest.mock('../../../backend/src/data/userRepository.js', () => ({
    __esModule: true,
    default: {
        findByEmail: jest.fn(),
        create: jest.fn(),
        updateAvatar: jest.fn()
    }
}));

// Mock environment config
jest.mock('../../../backend/src/config/environment.js', () => ({
    config: {
        jwt: {
            secret: 'test-secret',
            expiresIn: '1h'
        }
    }
}));



describe('User Service', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('register', () => {

        const mockUserData = {
            name: 'Test User',
            email: 'test@farm.com',
            password: 'password123'
        }

        test('should successfully register a new user', async () => {

            userRepository.findByEmail.mockResolvedValue(null)

            bcrypt.hash.mockResolvedValue('hashedPassword')

            const expectedUser = {
                id: 1,
                name: 'Test User',
                email: 'test@farm.com'
            }

            userRepository.create.mockResolvedValue(expectedUser)

            const result = await userService.register(mockUserData)

            expect(userRepository.findByEmail)
                .toHaveBeenCalledWith('test@farm.com')

            expect(bcrypt.hash)
                .toHaveBeenCalledWith('password123', 10)

            expect(userRepository.create)
                .toHaveBeenCalledWith({
                    name: 'Test User',
                    email: 'test@farm.com',
                    password: 'hashedPassword'
                })

            expect(result).toEqual(expectedUser)
        })

        test('should throw if email already exists', async () => {
            userRepository.findByEmail.mockResolvedValue({ id: 99, email: 'test@farm.com' })

            await expect(userService.register(mockUserData))
                .rejects.toThrow('account with this mail already exists')

            expect(bcrypt.hash).not.toHaveBeenCalled()
            expect(userRepository.create).not.toHaveBeenCalled()
        })
    })

    describe('login', () => {

        const mockUser = {
            id: 1,
            name: 'Test User',
            email: 'test@farm.com',
            password: 'hashedPassword',
            has_avatar: true,
            avatar_config: { hair: 'style1' }
        }

        test('should successfully login and return token', async () => {

            userRepository.findByEmail.mockResolvedValue(mockUser)

            bcrypt.compare.mockResolvedValue(true)  

            jwt.sign.mockReturnValue('mocked-jwt-token')

            const result = await userService.login(
                'test@farm.com',
                'password123'
            )

            expect(userRepository.findByEmail)
                .toHaveBeenCalledWith('test@farm.com')

            expect(bcrypt.compare)
                .toHaveBeenCalledWith('password123', 'hashedPassword')

            expect(jwt.sign).toHaveBeenCalledWith(
                { userId: 1, email: 'test@farm.com' },
                'test-secret',
                { expiresIn: '1h' }
            )

            expect(result.token).toBe('mocked-jwt-token')

            expect(result.user).toEqual({
                id: 1,
                name: 'Test User',
                email: 'test@farm.com',
                has_avatar: true,
                avatar_config: { hair: 'style1' }
            })
        })

        // FIX 4: Added missing error-path tests (login)
        test('should throw if user is not found', async () => {
            userRepository.findByEmail.mockResolvedValue(null)

            await expect(userService.login('no@one.com', 'password123'))
                .rejects.toThrow('Invalid email or password')
        })

        test('should throw if password does not match', async () => {
            userRepository.findByEmail.mockResolvedValue(mockUser)
            bcrypt.compare.mockResolvedValue(false)  // ← wrong password

            await expect(userService.login('test@farm.com', 'wrongpassword'))
                .rejects.toThrow('invalid credentials')
        })
    })

    describe('updateAvatar', () => {

        test('should update avatar and return updated user', async () => {
            const updatedUser = { id: 1, avatar_config: { hair: 'style2' } }
            userRepository.updateAvatar.mockResolvedValue(updatedUser)

            const result = await userService.updateAvatar(1, { hair: 'style2' })

            expect(userRepository.updateAvatar).toHaveBeenCalledWith(1, { hair: 'style2' })
            expect(result).toEqual(updatedUser)
        })

        test('should throw if user not found during avatar update', async () => {
            userRepository.updateAvatar.mockResolvedValue(null)

            await expect(userService.updateAvatar(999, {}))
                .rejects.toThrow('User not found')
        })
    })
})

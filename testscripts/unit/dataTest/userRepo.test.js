import userRepository from '../../../backend/src/data/userRepository.js';
import pool from '../../../backend/src/config/database.js';

// Mock the database pool
jest.mock('../../../backend/src/config/database.js', () => ({
    __esModule: true,
    default: {
        query: jest.fn()
    }
}));

describe('User Repository', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findByEmail', () => {
        test('should return exactly one user if email exists', async () => {
            const mockEmail = 'test@farm.com';
            const mockUser = { id: 1, email: mockEmail, name: 'Farmer' };
            
            pool.query.mockResolvedValue({ rows: [mockUser] });

            const result = await userRepository.findByEmail(mockEmail);

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE email = $1', [mockEmail]);
            expect(result).toEqual(mockUser);
        });

        test('should return undefined if user does not exist', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            const result = await userRepository.findByEmail('unknown@farm.com');

            expect(result).toBeUndefined();
        });
    });

    describe('create', () => {
        test('should insert a new user and return the inserted row', async () => {
            const newUser = { name: 'Bob', email: 'bob@farm.com', password: 'hashed' };
            const returnedDbUser = { id: 1, name: 'Bob', email: 'bob@farm.com', created_at: '2026-04-07' };
            
            pool.query.mockResolvedValue({ rows: [returnedDbUser] });

            const result = await userRepository.create(newUser);

            expect(pool.query).toHaveBeenCalledWith(
                'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
                ['Bob', 'bob@farm.com', 'hashed']
            );
            expect(result).toEqual(returnedDbUser);
        });
    });

    describe('findById', () => {
        test('should return user details by id', async () => {
            const mockId = 1;
            const mockUser = { id: mockId, name: 'Farmer', has_avatar: false };
            
            pool.query.mockResolvedValue({ rows: [mockUser] });

            const result = await userRepository.findById(mockId);

            expect(pool.query).toHaveBeenCalledWith(
                'SELECT id, name, email, has_avatar, avatar_config, created_at FROM users WHERE id = $1',
                [mockId]
            );
            expect(result).toEqual(mockUser);
        });
    });

    describe('updateAvatar', () => {
        test('should update avatar config and set has_avatar to true', async () => {
            const mockId = 1;
            const mockAvatarConfig = { hair: 'style1', color: 'blue' };
            const returnedUser = { id: 1, has_avatar: true, avatar_config: mockAvatarConfig };
            
            pool.query.mockResolvedValue({ rows: [returnedUser] });

            const result = await userRepository.updateAvatar(mockId, mockAvatarConfig);

            expect(pool.query).toHaveBeenCalledWith(
                'UPDATE users SET avatar_config = $1, has_avatar = TRUE, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, has_avatar, avatar_config',
                [mockAvatarConfig, mockId]
            );
            expect(result).toEqual(returnedUser);
        });
    });
});
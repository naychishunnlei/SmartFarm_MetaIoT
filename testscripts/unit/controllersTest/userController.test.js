import userController from '../../../backend/src/presentation/controller/userController.js';
import userService from '../../../backend/src/service/userService.js';
import userRepository from '../../../backend/src/data/userRepository.js';

jest.mock('../../../backend/src/service/userService.js');
jest.mock('../../../backend/src/data/userRepository.js');

describe('User Controller', () => {
    let req, res;

    beforeEach(() => {
        req = { body: {}, params: {}, user: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    test('register should register user and return 201', async () => {
        const mockUser = { id: 1, name: 'Test' };
        userService.register.mockResolvedValue(mockUser);
        req.body = { name: 'Test', email: 'test@test.com', password: 'pass' };

        await userController.register(req, res);

        expect(userService.register).toHaveBeenCalledWith(req.body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ message: 'User registered successfully', user: mockUser });
    });

    test('register should handle error', async () => {
        userService.register.mockRejectedValue(new Error('Registration failed'));
        await userController.register(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Registration failed' });
    });

    test('login should login user and return 200', async () => {
        userService.login.mockResolvedValue({ token: 'abc', user: { id: 1 } });
        req.body = { email: 'test@test.com', password: 'pass' };

        await userController.login(req, res);

        expect(userService.login).toHaveBeenCalledWith('test@test.com', 'pass');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Login successful', token: 'abc', user: { id: 1 } });
    });

    test('login should handle error', async () => {
        userService.login.mockRejectedValue(new Error('Login failed'));
        req.body = { email: 'test@test.com', password: 'pass' };

        await userController.login(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Login failed' });
    });

    test('getProfile should return user profile', async () => {
        const mockUser = { id: 1, name: 'Test', email: 'test@test.com', has_avatar: true, avatar_config: { hair: 'style1' } };
        req.user = { userId: 1 };
        userRepository.findById.mockResolvedValue(mockUser);

        await userController.getProfile(req, res);

        expect(userRepository.findById).toHaveBeenCalledWith(1);
        expect(res.json).toHaveBeenCalledWith({
            id: 1,
            name: 'Test',
            email: 'test@test.com',
            has_avatar: true,
            avatar_config: { hair: 'style1' }
        });
    });

    test('getProfile should return 404 if user not found', async () => {
        req.user = { userId: 1 };
        userRepository.findById.mockResolvedValue(undefined);

        await userController.getProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    test('getProfile should handle error', async () => {
        req.user = { userId: 1 };
        userRepository.findById.mockRejectedValue(new Error('DB error'));

        await userController.getProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Error fetching profile' });
    });

    test('updateAvatar should explicitly update avatar customization data', async () => {
        const mockUserId = 1;
        const mockConfig = { hair: 'style2', eyes: 'blue' };
        const mockResponse = { message: 'Avatar saved successfully', user: { success: true } };

        req.user = { userId: mockUserId };
        req.body = { avatarConfig: mockConfig };
        userService.updateAvatar.mockResolvedValue({ success: true });

        await userController.updateAvatar(req, res);

        expect(userService.updateAvatar).toHaveBeenCalledWith(mockUserId, mockConfig);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockResponse);
    });

    test('updateAvatar should return 400 if userId is missing', async () => {
        req.user = {};
        req.body = { avatarConfig: { hair: 'style2' } };

        await userController.updateAvatar(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'User ID not found in token' });
    });

    test('updateAvatar should handle error', async () => {
        req.user = { userId: 1 };
        req.body = { avatarConfig: { hair: 'style2' } };
        userService.updateAvatar.mockRejectedValue(new Error('Avatar error'));

        await userController.updateAvatar(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Avatar error' });
    });
});
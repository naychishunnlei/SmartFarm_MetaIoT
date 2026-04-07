import userController from '../../../backend/src/presentation/controller/userController.js';
import userService from '../../../backend/src/service/userService.js';

jest.mock('../../../backend/src/service/userService.js');

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

    test('updateAvatar should explicitly update avatar customization data', async () => {
        const mockUserId = 1;
        const mockConfig = { hair: 'style2', eyes: 'blue' };
        const mockResponse = { message: 'Avatar saved successfully', user: { success: true } };

        req.user = { userId: mockUserId };
        // FIX: Wrap the config in an 'avatarConfig' key to match the controller logic
        req.body = { avatarConfig: mockConfig };
        
        userService.updateAvatar.mockResolvedValue({ success: true });

        await userController.updateAvatar(req, res);

        // Verification
        expect(userService.updateAvatar).toHaveBeenCalledWith(mockUserId, mockConfig);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockResponse);
    });
});
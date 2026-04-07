import farmService from '../../../backend/src/service/farmService.js';
import farmRepository from '../../../backend/src/data/farmRepository.js';

// Mock the repository
jest.mock('../../../backend/src/data/farmRepository.js', () => ({
    __esModule: true,
    default: {
        create: jest.fn(),
        findByNameAndUser: jest.fn(),
        findByUserId: jest.fn(),
        deleteByIdAndUser: jest.fn()
    }
}));

describe('Farm Service', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createFarm', () => {
        test('should create a farm successfully', async () => {
            const userId = 1;
            const farmData = { name: 'My Farm', lat: 10.5, lon: 20.5, location: 'Backyard' };
            const mockCreatedFarm = { id: 100, userId, ...farmData };
            
            farmRepository.create.mockResolvedValue(mockCreatedFarm);

            const result = await farmService.createFarm(farmData, userId);

            expect(farmRepository.create).toHaveBeenCalledWith({ name: 'My Farm', lat: 10.5, lon: 20.5, userId, location: 'Backyard' });
            expect(result).toEqual(mockCreatedFarm);
        });

        test('should throw error if name, lat, or lon is missing', async () => {
            const userId = 1;
            const invalidData = { name: 'No Coords Farm' }; // Missing lat, lon

            await expect(farmService.createFarm(invalidData, userId))
                .rejects.toThrow('Farm name, lat, and lon are required.');

            expect(farmRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('getOrCreateFarm', () => {
        test('should return existing farm if it already exists', async () => {
            const userId = 1;
            const farmData = { name: 'Existing Farm', lat: 10, lon: 20 };
            const existingFarm = { id: 100, userId, ...farmData };

            farmRepository.findByNameAndUser.mockResolvedValue(existingFarm);

            const result = await farmService.getOrCreateFarm(farmData, userId);

            expect(farmRepository.findByNameAndUser).toHaveBeenCalledWith('Existing Farm', userId);
            expect(farmRepository.create).not.toHaveBeenCalled();
            expect(result).toEqual(existingFarm);
        });

        test('should create and return a new farm if it does not exist', async () => {
            const userId = 1;
            const farmData = { name: 'New Farm', lat: 10, lon: 20 };
            const newFarm = { id: 101, userId, ...farmData };

            farmRepository.findByNameAndUser.mockResolvedValue(null);
            farmRepository.create.mockResolvedValue(newFarm);

            const result = await farmService.getOrCreateFarm(farmData, userId);

            expect(farmRepository.findByNameAndUser).toHaveBeenCalledWith('New Farm', userId);
            expect(farmRepository.create).toHaveBeenCalledWith({ name: 'New Farm', lat: 10, lon: 20, userId });
            expect(result).toEqual(newFarm);
        });
    });

    describe('getFarmsByUserId', () => {
        test('should return all farms for a specific user', async () => {
            const userId = 1;
            const mockFarms = [
                { id: 100, name: 'Farm 1' },
                { id: 101, name: 'Farm 2' }
            ];

            farmRepository.findByUserId.mockResolvedValue(mockFarms);

            const result = await farmService.getFarmsByUserId(userId);

            expect(farmRepository.findByUserId).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockFarms);
        });
    });

    describe('deleteFarm', () => {
        test('should delete farm successfully and return it', async () => {
            const farmId = 100;
            const userId = 1;
            const mockDeletedFarm = { id: 100, name: 'Deleted Farm' };

            farmRepository.deleteByIdAndUser.mockResolvedValue(mockDeletedFarm);

            const result = await farmService.deleteFarm(farmId, userId);

            expect(farmRepository.deleteByIdAndUser).toHaveBeenCalledWith(farmId, userId);
            expect(result).toEqual(mockDeletedFarm);
        });

        test('should throw error if farm not found or user unauthorized', async () => {
            const farmId = 999;
            const userId = 1;

            farmRepository.deleteByIdAndUser.mockResolvedValue(null);

            await expect(farmService.deleteFarm(farmId, userId))
                .rejects.toThrow('Farm not found or unauthorized.');

            expect(farmRepository.deleteByIdAndUser).toHaveBeenCalledWith(farmId, userId);
        });
    });
});
import zoneService from '../../../backend/src/service/zoneService.js';
import farmRepository from '../../../backend/src/data/farmRepository.js';
import zoneRepository from '../../../backend/src/data/zoneRepository.js';

// Mock the repositories
jest.mock('../../../backend/src/data/farmRepository.js', () => ({
    __esModule: true,
    default: {
        findById: jest.fn()
    }
}));

jest.mock('../../../backend/src/data/zoneRepository.js', () => ({
    __esModule: true,
    default: {
        findByFarmId: jest.fn(),
        create: jest.fn()
    }
}));

describe('Zone Service', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getZonesByFarmId', () => {
        test('should return zones for a farm successfully', async () => {
            const userId = 1;
            const farmId = 1;
            
            const mockFarm = { id: 1, user_id: 1, name: 'My Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);
            
            const mockZones = [{ id: 10, farm_id: 1, name: 'Greenhouse' }];
            zoneRepository.findByFarmId.mockResolvedValue(mockZones);

            const result = await zoneService.getZonesByFarmId(userId, farmId);

            expect(farmRepository.findById).toHaveBeenCalledWith(farmId);
            expect(zoneRepository.findByFarmId).toHaveBeenCalledWith(farmId);
            expect(result).toEqual(mockZones);
        });

        test('should throw error if farm not found', async () => {
            farmRepository.findById.mockResolvedValue(null);

            await expect(zoneService.getZonesByFarmId(1, 999))
                .rejects.toThrow('Farm not found');
        });

        test('should throw error if user does not own the farm', async () => {
            const mockFarm = { id: 1, user_id: 2, name: 'Someone Elses Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);

            await expect(zoneService.getZonesByFarmId(1, 1))
                .rejects.toThrow('Forbidden: you do not own this farm');
        });
    });

    describe('createZone', () => {
        test('should create a zone successfully', async () => {
            const userId = 1;
            const farmId = 1;
            const zoneName = '  Orchard  '; // with spaces to test trim
            
            const mockFarm = { id: 1, user_id: 1, name: 'My Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);
            
            const mockCreatedZone = { id: 10, farm_id: 1, name: 'Orchard' };
            zoneRepository.create.mockResolvedValue(mockCreatedZone);

            const result = await zoneService.createZone(userId, farmId, zoneName);

            expect(farmRepository.findById).toHaveBeenCalledWith(farmId);
            expect(zoneRepository.create).toHaveBeenCalledWith(farmId, 'Orchard');
            expect(result).toEqual(mockCreatedZone);
        });

        test('should throw error if farm not found', async () => {
            farmRepository.findById.mockResolvedValue(null);

            await expect(zoneService.createZone(1, 999, 'Zone A'))
                .rejects.toThrow('Farm not found');
        });

        test('should throw error if user does not own the farm', async () => {
            const mockFarm = { id: 1, user_id: 2, name: 'Someone Elses Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);

            await expect(zoneService.createZone(1, 1, 'Zone A'))
                .rejects.toThrow('Forbidden: you do not own this farm');
        });

        test('should throw error if zone name is empty or missing', async () => {
            const mockFarm = { id: 1, user_id: 1, name: 'My Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);

            await expect(zoneService.createZone(1, 1, '   '))
                .rejects.toThrow('Zone name is required');
            
            await expect(zoneService.createZone(1, 1, null))
                .rejects.toThrow('Zone name is required');
        });
    });
});
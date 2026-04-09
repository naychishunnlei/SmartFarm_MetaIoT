import objectService from '../../../backend/src/service/objectService.js';
import objectRepository from '../../../backend/src/data/objectRepository.js';
import farmRepository from '../../../backend/src/data/farmRepository.js';

// Mock the repositories matching the controller test style
jest.mock('../../../backend/src/data/objectRepository.js', () => ({
    __esModule: true,
    default: {
        create: jest.fn(),
        findByFarmId: jest.fn(),
        findById: jest.fn(),
        deleteAll: jest.fn(),
        delete: jest.fn(),
        updateGrowth: jest.fn(),
        updateIsRunning: jest.fn(),
        updateSensorValue: jest.fn(),
        updatePosition: jest.fn()
    }
}));

jest.mock('../../../backend/src/data/farmRepository.js', () => ({
    __esModule: true,
    default: {
        findById: jest.fn()
    }
}));

describe('Object Service', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createObject', () => {
        test('should create an object successfully', async () => {
            const userId = 1;
            const farmId = 1;
            const objectData = { object_name: 'Moisture Sensor', category: 'iot', position_x: 10, position_y: 20, position_z: 0 };
            
            const mockFarm = { id: 1, user_id: 1, name: 'My Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);
            
            const mockObject = { id: 100, farm_id: 1, ...objectData };
            objectRepository.create.mockResolvedValue(mockObject);

            const result = await objectService.createObject(userId, farmId, objectData);

            expect(farmRepository.findById).toHaveBeenCalledWith(farmId);
            expect(objectRepository.create).toHaveBeenCalledWith({ ...objectData, farm_id: farmId });
            expect(result).toEqual(mockObject);
        });

        test('should throw error if farm not found', async () => {
            const userId = 1;
            const farmId = 999;
            const objectData = { object_name: 'Sensor', category: 'iot', position_x: 10, position_y: 20, position_z: 0 };
            
            farmRepository.findById.mockResolvedValue(null);

            await expect(objectService.createObject(userId, farmId, objectData))
                .rejects.toThrow('farm not found');

            expect(objectRepository.create).not.toHaveBeenCalled();
        });

        test('should throw error if user does not own the farm', async () => {
            const userId = 1;
            const farmId = 1;
            const objectData = { object_name: 'Sensor', category: 'iot', position_x: 10, position_y: 20, position_z: 0 };
            
            const mockFarm = { id: 1, user_id: 2, name: 'Someone Elses Farm' }; // Different user
            farmRepository.findById.mockResolvedValue(mockFarm);

            await expect(objectService.createObject(userId, farmId, objectData))
                .rejects.toThrow('forbidden: you dont own this farm');

            expect(objectRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('getObjectsByFarm', () => {
        test('should return all objects for a farm', async () => {
            const userId = 1;
            const farmId = 1;
            
            const mockFarm = { id: 1, user_id: 1, name: 'My Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);
            
            const mockObjects = [
                { id: 100, farm_id: 1, object_name: 'Sensor 1', category: 'iot' },
                { id: 101, farm_id: 1, object_name: 'Crop 1', category: 'crops' }
            ];
            objectRepository.findByFarmId.mockResolvedValue(mockObjects);

            const result = await objectService.getObjectsByFarm(userId, farmId);

            expect(farmRepository.findById).toHaveBeenCalledWith(farmId);
            expect(objectRepository.findByFarmId).toHaveBeenCalledWith(farmId);
            expect(result).toEqual(mockObjects);
        });

        test('should throw error if farm not found', async () => {
            farmRepository.findById.mockResolvedValue(null);

            await expect(objectService.getObjectsByFarm(1, 999))
                .rejects.toThrow('farm not found');
        });

        test('should throw forbidden error if user does not own farm', async () => {
            const mockFarm = { id: 1, user_id: 2, name: 'Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);

            await expect(objectService.getObjectsByFarm(1, 1))
                .rejects.toThrow('forbidden');
        });
    });

    describe('deleteObject', () => {
        test('should delete an object successfully', async () => {
            const userId = 1;
            const farmId = 1;
            const objectId = 100;
            
            const mockFarm = { id: 1, user_id: 1, name: 'My Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);
            
            const mockObject = { id: 100, farm_id: 1, object_name: 'Sensor' };
            objectRepository.findById.mockResolvedValue(mockObject);
            objectRepository.delete.mockResolvedValue(true);

            await objectService.deleteObject(userId, farmId, objectId);

            expect(farmRepository.findById).toHaveBeenCalledWith(farmId);
            expect(objectRepository.findById).toHaveBeenCalledWith(objectId);
            expect(objectRepository.delete).toHaveBeenCalledWith(objectId);
        });

        test('should throw error if object not found on farm', async () => {
            const mockFarm = { id: 1, user_id: 1, name: 'My Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);
            objectRepository.findById.mockResolvedValue(null);

            await expect(objectService.deleteObject(1, 1, 999))
                .rejects.toThrow('Object not found on this farm.');
        });
        test('should throw forbidden error if user does not own farm', async () => {
            const userId = 1;
            const farmId = 1;
            const objectId = 100;
            const mockFarm = { id: 1, user_id: 2, name: 'Not My Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);

            await expect(objectService.deleteObject(userId, farmId, objectId))
                .rejects.toThrow('Forbidden: You do not have permission on this farm.');
        });
        
    });

    describe('updateObjectGrowth', () => {
        test('should update object growth successfully', async () => {
            const userId = 1;
            const farmId = 1;
            const objectId = 100;
            const growth = 0.8;
            
            const mockFarm = { id: 1, user_id: 1, name: 'My Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);
            
            const mockUpdatedObject = { id: 100, farm_id: 1, object_name: 'Crop', metadata: { growth: 0.8 } };
            objectRepository.updateGrowth.mockResolvedValue(mockUpdatedObject);

            const result = await objectService.updateObjectGrowth(userId, farmId, objectId, growth);

            expect(farmRepository.findById).toHaveBeenCalledWith(farmId);
            expect(objectRepository.updateGrowth).toHaveBeenCalledWith(objectId, growth);
            expect(result).toEqual(mockUpdatedObject);
        });

        test('should throw forbidden error if user does not own farm', async () => {
            const mockFarm = { id: 1, user_id: 2, name: 'Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);

            await expect(objectService.updateObjectGrowth(1, 1, 100, 0.8))
                .rejects.toThrow('forbidden: do not belong to this farm');
        });
    });

    describe('toggleDevice', () => {
        test('should toggle device running state successfully', async () => {
            const userId = 1;
            const farmId = 1;
            const objectId = 100;
            const isRunning = true;

            const mockFarm = { id: 1, user_id: 1, name: 'My Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);

            // 'decoration' is not in ESP32_DEVICE_MAP so the service returns early
            // without needing zoneRepository or sendCommandToDevice
            const mockFoundObject = { id: 100, farm_id: 1, object_name: 'decoration', zone_id: null };
            objectRepository.findById.mockResolvedValue(mockFoundObject);

            const mockUpdatedObject = { id: 100, farm_id: 1, object_name: 'decoration', metadata: { is_running: true } };
            objectRepository.updateIsRunning.mockResolvedValue(mockUpdatedObject);

            const result = await objectService.toggleDevice(userId, farmId, objectId, isRunning);

            expect(farmRepository.findById).toHaveBeenCalledWith(farmId);
            expect(objectRepository.updateIsRunning).toHaveBeenCalledWith(objectId, isRunning);
            expect(result).toEqual(mockUpdatedObject);
        });

        test('should throw forbidden error if user does not own farm', async () => {
            const mockFarm = { id: 1, user_id: 2, name: 'Not My Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);
            await expect(objectService.toggleDevice(1, 1, 100, true))
                .rejects.toThrow('forbidden');
        });
        test('should throw error if object not found', async () => {
            const mockFarm = { id: 1, user_id: 1, name: 'My Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);
            objectRepository.findById.mockResolvedValue(null);
            await expect(objectService.toggleDevice(1, 1, 100, true))
                .rejects.toThrow('Object not found');
        });

        
    });

    describe('updateSensorData', () => {
        test('should update sensor value successfully', async () => {
            const userId = 1;
            const farmId = 1;
            const objectId = 100;
            const value = 45.5;
            
            const mockFarm = { id: 1, user_id: 1, name: 'My Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);
            
            const mockUpdatedObject = { id: 100, farm_id: 1, object_name: 'Temp Sensor', metadata: { sensor_value: 45.5 } };
            objectRepository.updateSensorValue.mockResolvedValue(mockUpdatedObject);

            const result = await objectService.updateSensorData(userId, farmId, objectId, value);

            expect(farmRepository.findById).toHaveBeenCalledWith(farmId);
            expect(objectRepository.updateSensorValue).toHaveBeenCalledWith(objectId, value);
            expect(result).toEqual(mockUpdatedObject);
        });
    });

    describe('updateObjectPosition', () => {
        test('should update object position successfully', async () => {
            const userId = 1;
            const farmId = 1;
            const objectId = 100;
            const x = 15, y = 25, z = 5;
            
            const mockFarm = { id: 1, user_id: 1, name: 'My Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);
            
            const mockUpdatedObject = { id: 100, farm_id: 1, position_x: 15, position_y: 25, position_z: 5 };
            objectRepository.updatePosition.mockResolvedValue(mockUpdatedObject);

            const result = await objectService.updateObjectPosition(userId, farmId, objectId, x, y, z);

            expect(farmRepository.findById).toHaveBeenCalledWith(farmId);
            expect(objectRepository.updatePosition).toHaveBeenCalledWith(objectId, x, y, z);
            expect(result).toEqual(mockUpdatedObject);
        });
    });

    describe('deleteAllObjects', () => {
        test('should delete all objects from a farm', async () => {
            const userId = 1;
            const farmId = 1;
            
            const mockFarm = { id: 1, user_id: 1, name: 'My Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);
            objectRepository.deleteAll.mockResolvedValue(5); // 5 objects deleted

            const result = await objectService.deleteAllObjects(userId, farmId);

            expect(farmRepository.findById).toHaveBeenCalledWith(farmId);
            expect(objectRepository.deleteAll).toHaveBeenCalledWith(farmId);
            expect(result).toBe(5);
        });

        test('should throw forbidden error if user does not own farm', async () => {
            const mockFarm = { id: 1, user_id: 2, name: 'Farm' };
            farmRepository.findById.mockResolvedValue(mockFarm);

            await expect(objectService.deleteAllObjects(1, 1))
                .rejects.toThrow('Forbidden: You do not have permission on this farm.');
        });
    });
});
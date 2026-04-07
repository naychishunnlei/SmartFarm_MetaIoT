import objectRepository from '../../../backend/src/data/objectRepository.js';
import pool from '../../../backend/src/config/database.js';

// Mock the database pool
jest.mock('../../../backend/src/config/database.js', () => ({
    __esModule: true,
    default: {
        query: jest.fn()
    }
}));

describe('Object Repository', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        test('should insert a crop object with default growth metadata', async () => {
            const objectData = {
                farm_id: 1, object_name: 'Corn', category: 'crops',
                position_x: 10, position_y: 20, position_z: 0
            };
            const mockReturnedObj = { id: 100, ...objectData, metadata: { growth: 0.4 } };
            
            pool.query.mockResolvedValue({ rows: [mockReturnedObj] });

            const result = await objectRepository.create(objectData);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO objects'),
                [1, 'Corn', 'crops', 10, 20, 0, { growth: 0.4 }]
            );
            expect(result).toEqual(mockReturnedObj);
        });

        test('should insert an iot object with default device metadata', async () => {
            const objectData = {
                farm_id: 1, object_name: 'Pump', category: 'iot',
                position_x: 5, position_y: 5, position_z: 0
            };
            const mockReturnedObj = { id: 101, ...objectData, metadata: { is_running: false, sensor_value: 0.0 } };
            
            pool.query.mockResolvedValue({ rows: [mockReturnedObj] });

            const result = await objectRepository.create(objectData);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO objects'),
                [1, 'Pump', 'iot', 5, 5, 0, { is_running: false, sensor_value: 0.0 }]
            );
            expect(result).toEqual(mockReturnedObj);
        });
    });

    describe('findByFarmId', () => {
        test('should return all objects for a farm', async () => {
            const mockObjects = [{ id: 1, object_name: 'Sensor' }];
            pool.query.mockResolvedValue({ rows: mockObjects });

            const result = await objectRepository.findByFarmId(1);

            expect(pool.query).toHaveBeenCalledWith(
                'SELECT * FROM objects WHERE farm_id = $1 ORDER BY id ASC;',
                [1]
            );
            expect(result).toEqual(mockObjects);
        });
    });

    describe('findById', () => {
        test('should return an object by its id', async () => {
            const mockObject = { id: 100, object_name: 'Sensor' };
            pool.query.mockResolvedValue({ rows: [mockObject] });

            const result = await objectRepository.findById(100);

            expect(pool.query).toHaveBeenCalledWith(
                'SELECT * FROM objects WHERE id = $1;',
                [100]
            );
            expect(result).toEqual(mockObject);
        });
    });

    describe('deleteAll', () => {
        test('should delete all objects for a farm and return row count', async () => {
            pool.query.mockResolvedValue({ rowCount: 5 });

            const result = await objectRepository.deleteAll(1);

            expect(pool.query).toHaveBeenCalledWith(
                'DELETE FROM objects WHERE farm_id = $1;',
                [1]
            );
            expect(result).toBe(5);
        });
    });

    describe('delete', () => {
        test('should delete a specific object and return true if successful', async () => {
            pool.query.mockResolvedValue({ rowCount: 1 });

            const result = await objectRepository.delete(100);

            expect(pool.query).toHaveBeenCalledWith(
                'DELETE FROM objects WHERE id = $1',
                [100]
            );
            expect(result).toBe(true);
        });

        test('should return false if object was not found to delete', async () => {
            pool.query.mockResolvedValue({ rowCount: 0 });

            const result = await objectRepository.delete(999);

            expect(result).toBe(false);
        });
    });

    describe('updateGrowth', () => {
        test('should update crop growth metadata', async () => {
            const mockUpdatedObj = { id: 100, metadata: { growth: 0.8 } };
            pool.query.mockResolvedValue({ rows: [mockUpdatedObj] });

            const result = await objectRepository.updateGrowth(100, 0.8);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE objects'),
                [0.8, 100]
            );
            expect(result).toEqual(mockUpdatedObj);
        });
    });

    describe('updateIsRunning', () => {
        test('should update iot is_running metadata', async () => {
            const mockUpdatedObj = { id: 101, metadata: { is_running: true } };
            pool.query.mockResolvedValue({ rows: [mockUpdatedObj] });

            const result = await objectRepository.updateIsRunning(101, true);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE objects'),
                [true, 101]
            );
            expect(result).toEqual(mockUpdatedObj);
        });
    });

    describe('updateSensorValue', () => {
        test('should update iot sensor_value metadata', async () => {
            const mockUpdatedObj = { id: 102, metadata: { sensor_value: 45.5 } };
            pool.query.mockResolvedValue({ rows: [mockUpdatedObj] });

            const result = await objectRepository.updateSensorValue(102, 45.5);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE objects'),
                [45.5, 102]
            );
            expect(result).toEqual(mockUpdatedObj);
        });
    });

    describe('updatePosition', () => {
        test('should update object coordinates', async () => {
            const mockUpdatedObj = { id: 100, position_x: 10, position_y: 20, position_z: 5 };
            pool.query.mockResolvedValue({ rows: [mockUpdatedObj] });

            const result = await objectRepository.updatePosition(100, 10, 20, 5);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE objects'),
                [10, 20, 5, 100]
            );
            expect(result).toEqual(mockUpdatedObj);
        });
    });
});
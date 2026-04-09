import farmRepository from '../../../backend/src/data/farmRepository.js';
import pool from '../../../backend/src/config/database.js';

// Mock the database pool and client
const mockClient = {
    query: jest.fn(),
    release: jest.fn()
};

jest.mock('../../../backend/src/config/database.js', () => ({
    __esModule: true,
    default: {
        query: jest.fn(),
        connect: jest.fn()
    }
}));

describe('Farm Repository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        pool.connect.mockResolvedValue(mockClient);
    });

    describe('findById', () => {
        test('should return a farm by id', async () => {
            const mockFarm = { id: 1, name: 'Farm 1' };
            pool.query.mockResolvedValue({ rows: [mockFarm] });

            const result = await farmRepository.findById(1);

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM farms WHERE id = $1;', [1]);
            expect(result).toEqual(mockFarm);
        });

        test('should return undefined if farm not found', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            const result = await farmRepository.findById(999);

            expect(result).toBeUndefined();
        });
    });

    describe('findByNameAndUser', () => {
        test('should return a farm by name and user', async () => {
            const mockFarm = { id: 1, name: 'Farm 1', user_id: 2 };
            pool.query.mockResolvedValue({ rows: [mockFarm] });

            const result = await farmRepository.findByNameAndUser('Farm 1', 2);

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM farms WHERE name = $1 AND user_id = $2;', ['Farm 1', 2]);
            expect(result).toEqual(mockFarm);
        });

        test('should return undefined if not found', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            const result = await farmRepository.findByNameAndUser('No Farm', 2);

            expect(result).toBeUndefined();
        });
    });

    describe('create', () => {
        test('should insert a new farm and return it', async () => {
            const farmData = { name: 'Farm 1', lat: 10, lon: 20, userId: 2, location: 'Somewhere' };
            const mockFarm = { id: 1, ...farmData };
            pool.query.mockResolvedValue({ rows: [mockFarm] });

            const result = await farmRepository.create(farmData);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO farms'),
                ['Farm 1', 2, 10, 20, 'Somewhere']
            );
            expect(result).toEqual(mockFarm);
        });

        test('should use name as fallback if location is undefined', async () => {
            const farmData = { name: 'Farm 2', lat: 11, lon: 21, userId: 3 };
            const mockFarm = { id: 2, ...farmData, location: 'Farm 2' };
            pool.query.mockResolvedValue({ rows: [mockFarm] });

            const result = await farmRepository.create(farmData);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO farms'),
                ['Farm 2', 3, 11, 21, 'Farm 2']
            );
            expect(result).toEqual(mockFarm);
        });
    });

    describe('findByUserId', () => {
        test('should return all farms for a user', async () => {
            const mockFarms = [{ id: 1, name: 'Farm 1' }, { id: 2, name: 'Farm 2' }];
            pool.query.mockResolvedValue({ rows: mockFarms });

            const result = await farmRepository.findByUserId(2);

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM farms WHERE user_id = $1 ORDER BY name ASC;', [2]);
            expect(result).toEqual(mockFarms);
        });

        test('should return empty array if user has no farms', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            const result = await farmRepository.findByUserId(999);

            expect(result).toEqual([]);
        });
    });

    describe('deleteByIdAndUser', () => {
        beforeEach(() => {
            mockClient.query.mockReset();
            mockClient.release.mockReset();
        });

        test('should delete a farm and all dependencies if user owns the farm', async () => {
            // Ownership check returns 1 row
            mockClient.query
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({ rowCount: 1 }) // Ownership check
                .mockResolvedValueOnce({}) // Delete zone_sensor_logs
                .mockResolvedValueOnce({}) // Delete farm_sensor_logs
                .mockResolvedValueOnce({}) // Delete objects
                .mockResolvedValueOnce({}) // Delete zones
                .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Farm 1' }] }); // Delete farm

            const result = await farmRepository.deleteByIdAndUser(1, 2);

            expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
            expect(mockClient.query).toHaveBeenNthCalledWith(2, 'SELECT id FROM farms WHERE id = $1 AND user_id = $2', [1, 2]);
            expect(mockClient.query).toHaveBeenNthCalledWith(3, expect.stringContaining('DELETE FROM zone_sensor_logs'), [1]);
            expect(mockClient.query).toHaveBeenNthCalledWith(4, 'DELETE FROM farm_sensor_logs WHERE farm_id = $1', [1]);
            expect(mockClient.query).toHaveBeenNthCalledWith(5, 'DELETE FROM objects WHERE farm_id = $1', [1]);
            expect(mockClient.query).toHaveBeenNthCalledWith(6, 'DELETE FROM zones WHERE farm_id = $1', [1]);
            expect(mockClient.query).toHaveBeenNthCalledWith(7, 'DELETE FROM farms WHERE id = $1 RETURNING *', [1]);
            expect(mockClient.query).toHaveBeenNthCalledWith(8, 'COMMIT');
            expect(mockClient.release).toHaveBeenCalled();
            expect(result).toEqual({ id: 1, name: 'Farm 1' });
        });

        test('should return null and rollback if user does not own the farm', async () => {
            mockClient.query
                .mockResolvedValueOnce({})              // 1. For 'BEGIN'
                .mockResolvedValueOnce({ rowCount: 0 }) // 2. For the Ownership check SELECT
                .mockResolvedValueOnce({});             // 3. For 'ROLLBACK' (optional but good practice)

            const result = await farmRepository.deleteByIdAndUser(1, 2);

            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('SELECT id FROM farms WHERE id = $1 AND user_id = $2', [1, 2]);
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
            expect(result).toBeNull();
        });

        test('should rollback and throw error if any query fails', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rowCount: 1 }) // Ownership check
                .mockRejectedValueOnce(new Error('DB error')); // Fails on zone_sensor_logs

            await expect(farmRepository.deleteByIdAndUser(1, 2)).rejects.toThrow('DB error');
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });
});
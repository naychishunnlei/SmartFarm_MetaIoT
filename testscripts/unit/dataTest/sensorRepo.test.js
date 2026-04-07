import sensorRepository from '../../../backend/src/data/sensorRepository.js';
import pool from '../../../backend/src/config/database.js';

// Mock the database pool and its connect method
jest.mock('../../../backend/src/config/database.js', () => ({
    __esModule: true,
    default: {
        connect: jest.fn()
    }
}));

describe('Sensor Repository', () => {
    let mockClient;

    beforeEach(() => {
        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        pool.connect.mockResolvedValue(mockClient);
        jest.clearAllMocks();
    });

    describe('saveSensorData', () => {
        const payload = {
            hardware_id: 'ESP_12345',
            zone_id: 1,
            temperature: 25.5,
            humidity: 60.2,
            light_lux: 800,
            moisture_1: 45,
            pump: true,
            fan: false,
            light: true
        };

        test('should save sensor data successfully and return IDs', async () => {
            // Sequence of DB calls
            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 10 }] }) // Farm Lookup
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 100 }] }) // Zone Lookup
                .mockResolvedValueOnce({ rows: [{ id: 500 }] }) // Insert Farm Log
                .mockResolvedValueOnce({ rows: [{ id: 600 }] }) // Insert Zone Log
                .mockResolvedValueOnce(); // COMMIT

            const result = await sensorRepository.saveSensorData(payload);

            expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
            expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT id FROM farms'), ['ESP_12345']);
            expect(mockClient.query).toHaveBeenNthCalledWith(3, expect.stringContaining('SELECT id FROM zones'), [10, 0]); // offsetIndex = zone_id - 1
            expect(mockClient.query).toHaveBeenNthCalledWith(6, 'COMMIT');
            
            expect(mockClient.release).toHaveBeenCalled();
            expect(result).toEqual({ farm_log_id: 500, zone_log_id: 600, farm_id: 10, global_zone_id: 100 });
        });

        test('should handle "nan" and "null" for temperature and humidity properly', async () => {
            const nanPayload = { ...payload, temperature: 'nan', humidity: 'null' };
            
            mockClient.query
                .mockResolvedValueOnce() 
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 10 }] }) 
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 100 }] }) 
                .mockResolvedValueOnce({ rows: [{ id: 500 }] }) 
                .mockResolvedValueOnce({ rows: [{ id: 600 }] }) 
                .mockResolvedValueOnce(); 

            await sensorRepository.saveSensorData(nanPayload);

            // Verify safe values (null) are passed to the 4th query (farm log insert)
            expect(mockClient.query.mock.calls[3][1]).toEqual([10, null, null, 800, false, true]);
        });

        test('should rollback and throw error if hardware_id is not registered', async () => {
            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockResolvedValueOnce({ rowCount: 0 }); // Farm Lookup fails

            await expect(sensorRepository.saveSensorData(payload))
                .rejects.toThrow('Device ESP_12345 is not registered to any user.');

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });

        test('should rollback and throw error if global zone is not found', async () => {
            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 10 }] }) // Farm Lookup
                .mockResolvedValueOnce({ rowCount: 0 }); // Zone Lookup fails

            await expect(sensorRepository.saveSensorData(payload))
                .rejects.toThrow('Local Zone 1 is not set up in the database for this farm yet.');

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });

        test('should rollback and release client if query fails unexpectedly', async () => {
            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockRejectedValueOnce(new Error('Database syntax error')); // Fails immediately

            await expect(sensorRepository.saveSensorData(payload))
                .rejects.toThrow('Database syntax error');

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });
});
import zoneRepository from '../../../backend/src/data/zoneRepository.js';
import pool from '../../../backend/src/config/database.js';

// Mock the database pool
jest.mock('../../../backend/src/config/database.js', () => ({
    __esModule: true,
    default: {
        query: jest.fn()
    }
}));

describe('Zone Repository', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findByFarmId', () => {
        test('should return all zones for a given farm', async () => {
            const mockZones = [
                { id: 1, farm_id: 10, name: 'Zone A' },
                { id: 2, farm_id: 10, name: 'Zone B' }
            ];
            pool.query.mockResolvedValue({ rows: mockZones });

            const result = await zoneRepository.findByFarmId(10);

            expect(pool.query).toHaveBeenCalledWith(
                'SELECT * FROM zones WHERE farm_id = $1 ORDER BY id ASC',
                [10]
            );
            expect(result).toEqual(mockZones);
        });
    });

    describe('findById', () => {
        test('should return a specific zone by id', async () => {
            const mockZone = { id: 1, farm_id: 10, name: 'Zone A' };
            pool.query.mockResolvedValue({ rows: [mockZone] });

            const result = await zoneRepository.findById(1);

            expect(pool.query).toHaveBeenCalledWith(
                'SELECT * FROM zones WHERE id = $1',
                [1]
            );
            expect(result).toEqual(mockZone);
        });

        test('should return null if the zone is not found', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            const result = await zoneRepository.findById(999);

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        test('should create a new zone and return the inserted row', async () => {
            const mockCreatedZone = { id: 3, farm_id: 10, name: 'New Zone' };
            pool.query.mockResolvedValue({ rows: [mockCreatedZone] });

            const result = await zoneRepository.create(10, 'New Zone');

            expect(pool.query).toHaveBeenCalledWith(
                'INSERT INTO zones (farm_id, name) VALUES ($1, $2) RETURNING *',
                [10, 'New Zone']
            );
            expect(result).toEqual(mockCreatedZone);
        });
    });

    describe('deleteByFarmId', () => {
        test('should delete all zones for a farm and return the deleted rows', async () => {
            const mockDeletedZones = [
                { id: 1, farm_id: 10, name: 'Zone A' },
                { id: 2, farm_id: 10, name: 'Zone B' }
            ];
            pool.query.mockResolvedValue({ rows: mockDeletedZones });

            const result = await zoneRepository.deleteByFarmId(10);

            expect(pool.query).toHaveBeenCalledWith(
                'DELETE FROM zones WHERE farm_id = $1 RETURNING *',
                [10]
            );
            expect(result).toEqual(mockDeletedZones);
        });
    });
});
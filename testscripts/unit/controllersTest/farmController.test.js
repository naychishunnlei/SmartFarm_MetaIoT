import farmController from '../../../backend/src/presentation/controller/farmController.js';
import farmService from '../../../backend/src/service/farmService.js';
import pool from '../../../backend/src/config/database.js';

// 1. Mock the Service Layer
jest.mock('../../../backend/src/service/farmService.js', () => ({
    __esModule: true,
    default: {
        getOrCreateFarm: jest.fn(),
        getFarmsByUserId: jest.fn(),
        deleteFarm: jest.fn()
    }
}));

// 2. Mock the Database Pool used directly in `create`
jest.mock('../../../backend/src/config/database.js', () => ({
    __esModule: true,
    default: {
        connect: jest.fn()
    }
}));

describe('Farm Controller', () => {
    let req, res, mockClient;

    beforeEach(() => {
        req = { 
            body: {}, 
            params: {},
            user: { userId: 1 } 
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        // Setup a fake database client
        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        pool.connect.mockResolvedValue(mockClient);

        jest.clearAllMocks();
    });

    test('create should return 201 when farm is claimed and auto-generated', async () => {
        // Setup request body based on the controller's validation checks
        req.body = { 
            name: 'New Farm', 
            location: 'Backyard',
            hardware_id: 'ESP_12345',
            latitude: 10.0,
            longitude: 20.0
        };
        
        // Mock the sequence of database queries in the `create` method:
        // BEGIN → registry check → ownership check → insert farm → insert zone → COMMIT
        mockClient.query
            .mockResolvedValueOnce() // BEGIN
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ zone_count: 1, has_dht: false, has_light: false }] }) // Registry check
            .mockResolvedValueOnce({ rowCount: 0 }) // Ownership check
            .mockResolvedValueOnce({ rows: [{ id: 100, name: 'New Farm' }] }) // Insert Farm
            .mockResolvedValueOnce({ rows: [{ id: 200 }] }) // Insert Zone
            .mockResolvedValueOnce();  // COMMIT

        await farmController.create(req, res);

        expect(pool.connect).toHaveBeenCalled();
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Farm successfully claimed!',
            farm: { id: 100, name: 'New Farm' }
        }));
    });
    test('create should return 401 if userId is missing', async () => {
        req.user = {};
        await farmController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: User ID not found' });
    });

    test('create should return 400 if required fields are missing', async () => {
        req.body = { name: 'Farm', location: 'Loc' }; // missing hardware_id, latitude, longitude
        await farmController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields (name, location, hardware_id, or coordinates)' });
    });


    test('delete should return 200 and call farmService.deleteFarm on success', async () => {
        req.params = { farmId: '100' }; 
        
        const mockDeletedFarm = { id: 100, name: 'My Old Farm' };
        farmService.deleteFarm.mockResolvedValue(mockDeletedFarm);

        await farmController.delete(req, res);

        // Controller passes farmId as a Number, and userId from req.user
        expect(farmService.deleteFarm).toHaveBeenCalledWith(100, 1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Farm deleted successfully.',
            farm: mockDeletedFarm
        });
    });

    test('delete should return 400 for invalid farmId', async () => {
        req.params = { farmId: 'abc' };
        await farmController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid farm ID.' });
    });

    test('delete should return 404 if not found', async () => {
        req.params = { farmId: '100' };
        farmService.deleteFarm.mockRejectedValueOnce(new Error('not found'));
        await farmController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'not found' });
    });

    test('delete should return 400 for other errors', async () => {
        req.params = { farmId: '100' };
        farmService.deleteFarm.mockRejectedValueOnce(new Error('some error'));
        await farmController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'some error' });
    });

    test('getAllForUser should return 200 with list of farms', async () => {
        const mockFarms = [{ id: 1, name: 'Farm 1' }, { id: 2, name: 'Farm 2' }];
        farmService.getFarmsByUserId.mockResolvedValue(mockFarms);

        await farmController.getAllForUser(req, res);

        expect(farmService.getFarmsByUserId).toHaveBeenCalledWith(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockFarms);
    });
});
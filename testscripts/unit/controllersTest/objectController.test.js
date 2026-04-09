import objectController from '../../../backend/src/presentation/controller/objectController.js';
import objectService from '../../../backend/src/service/objectService.js';

// Mock the service layer to isolate controller logic
jest.mock('../../../backend/src/service/objectService.js', () => ({
    __esModule: true,
    default: {
        createObject: jest.fn(),
        getObjectsByFarm: jest.fn(),
        deleteObject: jest.fn(),
        updateObjectGrowth: jest.fn(),
        toggleDevice: jest.fn(),
        updateSensorData: jest.fn(),
        updateObjectPosition: jest.fn()
    }
}));

describe('Object Controller', () => {
    let req, res;

    beforeEach(() => {
        // Mocking the request object with user auth and params
        req = { 
            body: {}, 
            params: {},
            user: { userId: 1 } 
        };
        // Mocking the response object
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn()
        };
        jest.clearAllMocks();
    });

    test('create should return 201 when object is successfully added', async () => {
        req.params.farmId = '1';
        req.body = { type: 'sensor', x: 10, y: 20 };
        const mockObj = { id: 100, farm_id: 1, ...req.body };
        
        objectService.createObject.mockResolvedValue(mockObj);
        await objectController.create(req, res);

        // Expects userId (1), farmId (1), and body
        expect(objectService.createObject).toHaveBeenCalledWith(1, 1, req.body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(mockObj);
    });
      test('create should return 403 if forbidden error', async () => {
        req.params.farmId = '1';
        objectService.createObject.mockRejectedValue(new Error('forbidden: not allowed'));
        await objectController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'forbidden: not allowed' });
    });

    test('create should return 404 if farm error', async () => {
        req.params.farmId = '1';
        objectService.createObject.mockRejectedValue(new Error('farm not found'));
        await objectController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'farm not found' });
    });
    test('create should return 400 for other errors', async () => {
        req.params.farmId = '1';
        objectService.createObject.mockRejectedValue(new Error('some other error'));
        await objectController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'some other error' });
    });



    test('getAllForFarm should return 200 with all farm objects', async () => {
        req.params.farmId = '1';
        const mockObjects = [{ id: 100, type: 'sensor' }];
        
        objectService.getObjectsByFarm.mockResolvedValue(mockObjects);

        await objectController.getAllForFarm(req, res);

        expect(objectService.getObjectsByFarm).toHaveBeenCalledWith(1, 1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockObjects);
    });
    test('getAllForFarm should return 403 if forbidden', async () => {
        req.params.farmId = '1';
        objectService.getObjectsByFarm.mockRejectedValue(new Error('Forbidden: not allowed'));
        await objectController.getAllForFarm(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: not allowed' });
    });

    test('getAllForFarm should return 404 if farm not found', async () => {
        req.params.farmId = '1';
        objectService.getObjectsByFarm.mockRejectedValue(new Error('Farm not found'));
        await objectController.getAllForFarm(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Farm not found' });
    });

    test('getAllForFarm should return 500 for other errors', async () => {
        req.params.farmId = '1';
        objectService.getObjectsByFarm.mockRejectedValue(new Error('unexpected error'));
        await objectController.getAllForFarm(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'unexpected error' });
    });

    test('delete should return 204 when object is removed', async () => {
        req.params = { farmId: '1', objectId: '100' };
        
        objectService.deleteObject.mockResolvedValue(true);
        await objectController.delete(req, res);

        expect(objectService.deleteObject).toHaveBeenCalledWith(1, 1, 100);
        expect(res.status).toHaveBeenCalledWith(204); 
    });
    test('delete should return 403 if forbidden', async () => {
        req.params = { farmId: '1', objectId: '100' };
        objectService.deleteObject.mockRejectedValue(new Error('Forbidden: not allowed'));
        await objectController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: not allowed' });
    });

    test('delete should return 404 if not found', async () => {
        req.params = { farmId: '1', objectId: '100' };
        objectService.deleteObject.mockRejectedValue(new Error('Object not found'));
        await objectController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Object not found' });
    });
    test('delete should return 400 for other errors', async () => {
        req.params = { farmId: '1', objectId: '100' };
        objectService.deleteObject.mockRejectedValue(new Error('some error'));
        await objectController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'some error' });
    });


    test('toggleDevice should return 200 when state is updated', async () => {
        req.params = { farmId: '1', objectId: '100' };
        req.body = { is_running: true };
        const updatedObj = { id: 100, is_running: true };

        objectService.toggleDevice.mockResolvedValue(updatedObj);

        await objectController.toggleDevice(req, res);

        expect(objectService.toggleDevice).toHaveBeenCalledWith(1, 1, 100, true);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(updatedObj);
    });

    test('toggleDevice should return 400 if is_running is not boolean', async () => {
        req.params = { farmId: '1', objectId: '100' };
        req.body = { is_running: 'yes' };
        await objectController.toggleDevice(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'is_running boolean value is required' });
    });

    // toggleDevice not found
    test('toggleDevice should return 404 if object not found', async () => {
        req.params = { farmId: '1', objectId: '100' };
        req.body = { is_running: true };
        objectService.toggleDevice.mockResolvedValue(null);
        await objectController.toggleDevice(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Object not found' });
    });

    test('toggleDevice should return 403 if forbidden', async () => {
        req.params = { farmId: '1', objectId: '100' };
        req.body = { is_running: true };
        objectService.toggleDevice.mockRejectedValue(new Error('forbidden: not allowed'));
        await objectController.toggleDevice(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'forbidden: not allowed' });
    });

    // toggleDevice other error
    test('toggleDevice should return 400 for other errors', async () => {
        req.params = { farmId: '1', objectId: '100' };
        req.body = { is_running: true };
        objectService.toggleDevice.mockRejectedValue(new Error('some error'));
        await objectController.toggleDevice(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'some error' });
    });

    test('updateGrowth should return 400 if growth is missing', async () => {
        req.params = { farmId: '1', objectId: '100' };
        req.body = {};
        await objectController.updateGrowth(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Growth value is required' });
    });

    // updateGrowth not found
    test('updateGrowth should return 404 if object not found', async () => {
        req.params = { farmId: '1', objectId: '100' };
        req.body = { growth: 0.5 };
        objectService.updateObjectGrowth.mockResolvedValue(null);
        await objectController.updateGrowth(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Object not found' });
    });
    test('updateGrowth should return 403 if forbidden', async () => {
        req.params = { farmId: '1', objectId: '100' };
        req.body = { growth: 0.5 };
        objectService.updateObjectGrowth.mockRejectedValue(new Error('forbidden: not allowed'));
        await objectController.updateGrowth(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'forbidden: not allowed' });
    });

    // updateGrowth other error
    test('updateGrowth should return 400 for other errors', async () => {
        req.params = { farmId: '1', objectId: '100' };
        req.body = { growth: 0.5 };
        objectService.updateObjectGrowth.mockRejectedValue(new Error('some error'));
        await objectController.updateGrowth(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'some error' });
    });

    
});
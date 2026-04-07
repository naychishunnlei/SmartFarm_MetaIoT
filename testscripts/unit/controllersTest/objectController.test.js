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

        // Updated to use the 'create' method from your controller
        await objectController.create(req, res);

        // Expects userId (1), farmId (1), and body
        expect(objectService.createObject).toHaveBeenCalledWith(1, 1, req.body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(mockObj);
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

    test('delete should return 204 when object is removed', async () => {
        req.params = { farmId: '1', objectId: '100' };
        
        objectService.deleteObject.mockResolvedValue(true);

        // Updated to use the 'delete' method from your controller
        await objectController.delete(req, res);

        expect(objectService.deleteObject).toHaveBeenCalledWith(1, 1, 100);
        expect(res.status).toHaveBeenCalledWith(204); 
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
});
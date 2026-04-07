import zoneController from '../../../backend/src/presentation/controller/zoneController';
import zoneService from '../../../backend/src/service/zoneService';

jest.mock('../../../backend/src/service/zoneService.js');

describe('Zone Controller', () => {
    let req, res;

    beforeEach(() => {
        // Set up the req object to match what your controller expects
        req = { 
            body: {}, 
            params: {},
            user: { userId: 1 } // Added user object required by your controller
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    test('create should return 201 on successful zone creation', async () => {
        req.params.farmId = '1';
        req.body = { name: 'Greenhouse' };
        
        const mockZone = { id: 1, name: 'Greenhouse', farmId: 1, userId: 1 };
        zoneService.createZone.mockResolvedValue(mockZone);

        await zoneController.create(req, res);

        expect(zoneService.createZone).toHaveBeenCalledWith(1, 1, 'Greenhouse');
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(mockZone);
    });

    test('getAllForFarm should return 200 with list of zones', async () => {
        req.params.farmId = '1';
        const mockZones = [{ id: 1, name: 'Greenhouse' }];
        zoneService.getZonesByFarmId.mockResolvedValue(mockZones);

        await zoneController.getAllForFarm(req, res);

        expect(zoneService.getZonesByFarmId).toHaveBeenCalledWith(1, 1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockZones);
    });
});
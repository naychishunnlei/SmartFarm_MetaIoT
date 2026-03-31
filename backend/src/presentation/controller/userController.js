import userService from '../../service/userService.js';

class UserController {
    async register(req, res) {
        try {
            const user = await userService.register(req.body);
            res.status(201).json({ message: 'User registered successfully', user });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const result = await userService.login(email, password);
            res.status(200).json({ message: 'Login successful', ...result });
        } catch (error) {
            res.status(401).json({ message: error.message });
        }
    }

    // Example of a protected route controller
    async getProfile(req, res) {
        // The user object is attached to the request by the authMiddleware
        res.status(200).json({ user: req.user });
    }
}

export default new UserController();
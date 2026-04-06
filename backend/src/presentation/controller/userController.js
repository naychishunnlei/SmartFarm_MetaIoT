import userRepository from '../../data/userRepository.js';
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

    async getProfile(req, res) {
        try {
            const userId = req.user.userId; // From authMiddleware
            const user = await userRepository.findById(userId);
            
            if (!user) return res.status(404).json({ message: 'User not found' });

            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                has_avatar: user.has_avatar, // 🌟 THE CRITICAL FIELD
                avatar_config: user.avatar_config
            });
        } catch (error) {
            res.status(500).json({ message: 'Error fetching profile' });
        }
    }

    async updateAvatar(req, res) {
        try {
            const userId = req.user.id || req.user.userId; 
            
            if (!userId) {
                return res.status(400).json({ message: 'User ID not found in token' });
            }

            const updatedUser = await userService.updateAvatar(userId, req.body.avatarConfig);
            res.status(200).json({ message: 'Avatar saved successfully', user: updatedUser });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
}

export default new UserController();
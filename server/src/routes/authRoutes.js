import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../schemas/validationSchemas.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.getMe);
router.patch('/profile', requireAuth, validate(updateProfileSchema), authController.updateProfile);
router.patch('/status', requireAuth, authController.updateStatus);
router.patch('/presence', requireAuth, authController.updatePresence);

export default router;

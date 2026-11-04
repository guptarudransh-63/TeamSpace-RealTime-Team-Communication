import { Router } from 'express';
import * as fileController from '../controllers/fileController.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(requireAuth);

router.post('/upload', upload.single('file'), fileController.uploadFile);
router.get('/:fileId/download', fileController.downloadFile);

export default router;

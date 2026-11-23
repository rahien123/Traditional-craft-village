import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import mediaRoutes from './modules/media/media.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import newsRoutes from './modules/news/news.routes.js';
import batchesRoutes from './modules/batches/batches.routes.js';
import artisansRoutes from './modules/artisans/artisans.routes.js';
import catalogRoutes from './modules/catalog/catalog.routes.js';
import quotesRoutes from './modules/quotes/quotes.routes.js';

const router = Router();

// 1. Auth (#1 - #4)
router.use('/auth', authRoutes);

// 2. Media (#5) -> POST /uploads/images
router.use('/uploads', mediaRoutes);

// 3. Admin (#6 - #7)
router.use('/admin', adminRoutes);

// 4. News (#8 - #11)
router.use('/news', newsRoutes);

// 5. Batches & Trace (#12 - #19)
router.use('/', batchesRoutes);

// 6. Artisans (#20 - #22)
router.use('/artisans', artisansRoutes);

// 7. Catalog (#23 - #29)
router.use('/', catalogRoutes);

// 8. Quotes (#30 - #38)
router.use('/quotes', quotesRoutes);

export default router;

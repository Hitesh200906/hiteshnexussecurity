import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import scansRouter from "./scans";
import adminRouter from "./admin";
import pricingRouter from "./pricing";
import supportRouter from "./support";
import notificationsRouter from "./notifications";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(scansRouter);
router.use(pricingRouter);
router.use(supportRouter);
router.use(notificationsRouter);
router.use(profileRouter);
router.use(adminRouter);

export default router;

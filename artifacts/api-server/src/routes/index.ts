import { Router, type IRouter } from "express";
import healthRouter from "./health";
import nekopoiRouter from "./nekopoi.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/nekopoi", nekopoiRouter);

export default router;

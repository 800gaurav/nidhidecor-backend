import {Router} from "express"
import { incomeController } from "../../controllers/user/income.controller.js"
import { requireAuth } from "../../middlewares/require-auth.js"

const router = Router()

router.get('/binary-income', incomeController.pairincome)
router.get('/bouns-income/:userId', incomeController.bonusincome)
router.get('/history', requireAuth(["user"]), incomeController.getIncomeHistory)
router.get('/direct', requireAuth(["user"]), incomeController.getDirectIncome)
router.get('/matching', requireAuth(["user"]), incomeController.getMatchingIncome)
export {router as incomeRouter}

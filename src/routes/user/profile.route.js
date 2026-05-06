import {Router} from "express"
import { requireAuth } from "../../middlewares/require-auth.js"
import { profileController } from "../../controllers/user/profile.controller.js"
const router = Router()

router.get('/get-profile', requireAuth(["user", "admin"]), profileController.getprofile )
router.put('/update-status-user', profileController.updatestatus )
router.get('/get-left-right-user/:userId', requireAuth(["user"]), profileController.getleftrightchild )
router.get('/get-user-data', requireAuth(["user"]), profileController.userdata )
router.get('/purchase-bills', requireAuth(["user"]), profileController.purchaseBills )
export {router as userprofileRouter}

import { errorResponse } from "../utils/api-response.js"

const requireAuth = (roles) => {

  return (req, res, next) => {
 
    if (!req.currentUser) return errorResponse(res, "Requires Authentication", 401);
    if (!roles.includes(req.currentUser.role)) return errorResponse(res, "You don't have access to this route", 401);
    next();
  }
}

export { requireAuth }
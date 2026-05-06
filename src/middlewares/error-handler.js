import { errorResponse } from "../utils/api-response.js";

const errorHandler = (err, req, res, next) => {
  if (err) return errorResponse(res, err.message, err.statusCode);
  next()
}

export { errorHandler }
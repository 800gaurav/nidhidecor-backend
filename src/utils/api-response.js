

const apiResponse = (res, statusCode, success, message, data = null) => {
  return res.status(statusCode).json({
    statusCode,
    success,
    message,
    data
  });
};

const successResponse = (res, message, data = null, statusCode = 200) => {
  return apiResponse(res, statusCode, true, message, data);
};

const errorResponse = (res, message, statusCode = 500, data = null) => {
  return apiResponse(res, statusCode, false, message, data);
};

export { apiResponse, successResponse, errorResponse };

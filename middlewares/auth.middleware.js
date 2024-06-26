import jwt from "jsonwebtoken";
import AppError from "../utils/appError.js";
import asyncHandler from "./asyncHandler.middleware.js";

// export const isLoggedIn = asyncHandler(async (req, _res, next) => {
//   // extracting token from the cookies
//   const { token } = req.cookies;

//   // If no token send unauthorized message
//   if (!token) {
//     console.log("Token from isLoggedIn Function: ", token)
//     return next(new AppError("Unauthorized, please login to continue", 401));
//   }

//   // Decoding the token using jwt package verify method
//   const decoded = await jwt.verify(token, process.env.JWT_SECRET);

//   // If no decode send the message unauthorized
//   if (!decoded) {
//     return next(new AppError("Unauthorized, please login to continue", 401));
//   }

//   // If all good store the id in req object, here we are modifying the request object and adding a custom field user in it
//   req.user = decoded;

//   // Do not forget to call the next other wise the flow of execution will not be passed further
//   next();
// });

export const isLoggedIn = asyncHandler(async (req, _res, next) => {

  // console.log('Headers in backend: ', req.headers)

  // Extract the token from the Authorization header
  const authHeader = req.headers.authorization;

  console.log(authHeader)

  // If no Authorization header, return unauthorized
  if (!authHeader) {
    return next(new AppError("Unauthorized authHeader=NULL, please login to continue", 401));
  }

  // Extract the token from the Authorization header
  const token = authHeader.split('Bearer ')[1];

  // If no token, return unauthorized
  if (!token) {
    return next(new AppError("Unauthorized token=NULL, please login to continue", 401));
  } 
 
  // Decoding the token using jwt package verify method
  const decoded = await jwt.verify(token, process.env.JWT_SECRET);

  // If no decoded, return unauthorized
  if (!decoded) {
    return next(new AppError("Unauthorized decoded=FALSE, please login to continue", 401));
  }

  // If all good, store the decoded data in req object
  req.user = decoded;

  // Do not forget to call the next otherwise the flow of execution will not be passed further
  next();
});

// Middleware to check if user is admin or not
export const authorizeRoles = (...roles) =>
  asyncHandler(async (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to view this route", 403)
      );
    }

    next();
  });

// Middleware to check if user has an active subscription or not
export const authorizeSubscribers = asyncHandler(async (req, _res, next) => {
  // If user is not admin or does not have an active subscription then error else pass
  if (req.user.role !== "ADMIN" && req.user.subscription.status !== "active") {
    return next(new AppError("Please subscribe to access this route.", 403));
  }

  next();
});

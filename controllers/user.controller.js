import crypto from 'crypto';
import fs from 'fs/promises';
import cloudinary from 'cloudinary';
import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import AppError from '../utils/appError.js';
import User from '../models/user.model.js';
import sendEmail from '../utils/sendEmail.js';
import { EnrolledUsersIYFA, EnrolledUsersYLP } from '../models/enrolledUsers.model.js';
import Course from '../models/course.model.js';
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import OTP from '../models/otp.model.js';

const cookieOptions = {
  // secure: process.env.NODE_ENV === 'production' ? true : false,
  secure: false,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true,
};

/**
 * @REGISTER
 * @ROUTE @POST {{URL}}/api/v1/user/register
 * @ACCESS Public
 */
export const registerUser = asyncHandler(async (req, res, next) => {
  try {
    // Destructuring the necessary data from req object
    const { email } = req.body;

    // Check if the data is there or not, if not throw error message
    if (!email) {
      return next(new AppError('All fields are required', 400));
    }

    // Check if the user exists with the provided email
    const userExists = await User.findOne({ email });

    // If user exists send the reponse
    if (userExists) {
      return next(new AppError('Email already exists', 409));
    }

    //  OTP VERIFICATION

    const min = 100000; // Minimum 6-digit number
    const max = 999999; // Maximum 6-digit number
    const otp = Math.floor(Math.random() * (max - min + 1)) + min;

    // Save the OTP temporarily
    await OTP.create({
      email,
      otp,
      createdAt: new Date(),
    });

    // Send OTP to the user's email
    const emailSubject = 'OTP Verification';
    const emailMessage = `Your OTP for registration is: ${otp}`;
    await sendEmail(email, emailSubject, emailMessage);

    // Send a response to the client indicating that the OTP has been sent
    res.status(201).json({
      success: true,
      message: 'OTP sent to your email'
    });
  } catch (error) {
    return next(
      new AppError(
        error.message || 'Something went wrong, please try again.',
        500
      )
    );
  }
});

/**
 * @REGISTER
 * @ROUTE @POST {{URL}}/api/v1/user/verify-otp
 * @ACCESS Public
 */
export const verifyOTP = asyncHandler(async (req, res, next) => {
  // Destructuring the necessary data from req object
  const { fullName, email, password, otp } = req.body;

  // Check if the data is there or not, if not throw error message
  if (!fullName) {
    return next(new AppError('Full Name is required', 400));
  }
  if (!email) {
    return next(new AppError('Email is required', 400));
  }
  if (!password) {
    return next(new AppError('Password is required', 400));
  }
  if (!otp) {
    return next(new AppError('Otp is required', 400));
  }

  // Find the latest OTP associated with the user's email from MongoDB
  const latestOTP = await OTP.findOne({ email }).sort({ createdAt: -1 });

  const isOTPExpired = (createdAt) => {
    const expirationTimeInMinutes = 5; // Set expiration time to 5 minutes (adjust as needed)
    const expirationTimeInMillis = expirationTimeInMinutes * 60 * 1000;
    return new Date().getTime() - new Date(createdAt).getTime() > expirationTimeInMillis;
  };

  try {
    // Check if the OTP matches the one saved temporarily
    if (latestOTP && latestOTP.otp === otp && !isOTPExpired(latestOTP.createdAt)) {
      // Create new user with the given necessary data and save to DB
      const user = await User.create({
        fullName,
        email,
        password,
      });

      // If user not created send message response
      if (!user) {
        return next(
          new AppError('User registration failed, please try again later', 400)
        );
      }

      // Run only if user sends a file
      // if (req.file) {
      //   try {
      //     const result = await cloudinary.v2.uploader.upload(req.file.path, {
      //       folder: 'lms', // Save files in a folder named lms
      //       width: 250,
      //       height: 250,
      //       gravity: 'faces', // This option tells cloudinary to center the image around detected faces (if any) after cropping or resizing the original image
      //       crop: 'fill',
      //     });

      //     // If success
      //     if (result) {
      //       // Set the public_id and secure_url in DB
      //       user.avatar.public_id = result.public_id;
      //       user.avatar.secure_url = result.secure_url;

      //       // After successful upload remove the file from local storage
      //       fs.rm(`uploads/${req.file.filename}`);
      //     }
      //   } catch (error) {
      //     return next(
      //       new AppError(error || 'File not uploaded, please try again', 400)
      //     );
      //   }
      // }

      // Save the user object
      await user.save();

      // Generating a JWT token
      const token = await user.generateJWTToken();

      // Setting the password to undefined so it does not get sent in the response
      user.password = undefined;

      // Setting the token in the cookie with name token along with cookieOptions
      res.cookie('token', token, cookieOptions);

      // If all good send the response to the frontend
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user,
      });
    } else {
      // If OTP verification fails, send an error response
      return next(new AppError('Invalid OTP. Please try again.', 400));
    }
  } catch (error) {
    return next(
      new AppError(
        error.message || 'Something went wrong, please try again.',
        500
      )
    );
  }
});

/**
 * @LOGIN
 * @ROUTE @POST {{URL}}/api/v1/user/login
 * @ACCESS Public
 */
export const loginUser = asyncHandler(async (req, res, next) => {
  // Destructuring the necessary data from req object
  const { email, password } = req.body;

  // Check if the data is there or not, if not throw error message
  if (!email || !password) {
    return next(new AppError('Email and Password are required', 400));
  }

  // Finding the user with the sent email
  const user = await User.findOne({ email }).select('+password');

  // If no user or sent password do not match then send generic response
  if (!(user && (await user.comparePassword(password)))) {
    return next(
      new AppError('Email or Password do not match or user does not exist', 401)
    );
  }

  // Generating a JWT token
  const token = await user.generateJWTToken();

  // Setting the password to undefined so it does not get sent in the response
  user.password = undefined;

  // Setting the token in the cookie with name token along with cookieOptions
  res.cookie('token', token, cookieOptions);
  console.log('Token from login function: ', token)

  // If all good send the response to the frontend
  res.status(200).json({
    success: true,
    message: 'User logged in successfully',
    token,
    user,
  });
});

/**
 * @LOGOUT
 * @ROUTE @POST {{URL}}/api/v1/user/logout
 * @ACCESS Public
 */
export const logoutUser = asyncHandler(async (_req, res, _next) => {
  // Setting the cookie value to null
  res.cookie('token', null, {
    secure: process.env.NODE_ENV === 'production' ? true : false,
    maxAge: 0,
    httpOnly: true,
  });

  // Sending the response
  res.status(200).json({
    success: true,
    message: 'User logged out successfully',
  });
});


export const emailCheck = asyncHandler(async (req, res, next) => {

  try {
    const email = 'akshat4575@gmail.com'

    const currentDate = new Date(); // Get the current date and time

    // Create an array of month names
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Get the day of the month (1-31)
    const day = currentDate.getDate();

    // Get the month (0-11, so we add 1)
    const month = monthNames[currentDate.getMonth()];

    // Get the year
    const year = currentDate.getFullYear();

    // Format the date as "5 May 2023"
    const formattedDate = `${day} ${month} ${year}`;

    const orderID = '2wwf32ere433'

    const htmlContent = `<!DOCTYPE html>
  <html lang="en">
  
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <!-- <title>Document</title> -->
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
  
        .main-container {
          display: flex;
          width: 100%;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
  
        .sub-container {
          width: 600px;
        }
  
        .main-logo {
          margin-bottom: 25px;
        }
  
        .order-id {
          text-align: right;
          margin-bottom: 25px;
        }
  
        .gray-text {
          color: gray;
          font-size: 18px;
        }
  
        .amount {
          display: flex;
          font-size: 18px;
          margin-bottom: 25px;
        }
  
        .amount2 {
          margin-left: 10px;
        }
  
        .text-bold {
          font-weight: bolder;
        }
  
        .date-box {
          display: flex;
          justify-content: space-between;
          margin-bottom: 65px;
        }
  
        .table-main {
          display: flex;
          justify-content: space-between;
          margin-bottom: 45px;
        }
  
        .table-heading {
          margin-bottom: 10px;
          font-weight: bold;
        }
  
        .table-main-right {
          display: flex;
          justify-content: space-around;
        }
  
        .table-main-right-1 {
          margin-right: 16px;
        }
  
        .table-main-right-2 {
          margin-right: 16px;
        }
  
        .total-amount {
          text-align: right;
          font-size: 20px;
          margin-bottom: 20px;
        }
  
        .total-amount span{
          margin-left: 30px;
        }
  
        .blue-text {
          text-align: right;
          margin-bottom: 50px;
          color: darkblue;
        } 
  
        .blue-text span{
          margin-left: 55px;
        }
  
        .congo {
          margin-bottom: 120px;
        }
  
        .doubt {
          margin-top: 30px;
          margin-bottom: 60px;
        }
  
        .last-section {
          display: flex;
          flex-direction: column;
        }
  
        .last-p {
          font-weight: 900;
          margin-bottom: 10px;
        }
  
        .secondlast {
          margin-top: 10px;
          margin-bottom: 10px;
        }
  
        .last-links {
          margin-bottom: 30px;
        }
      </style>
    </head>
  
    <body>
      <div class="main-container">
        <div class="sub-container">
          <div class="main-logo">
            <img src="https://indiamun.org/static/media/logo%20left.548aa3eb.webp" alt="logo" width="180px">
          </div>
  
          <div class="order-id gray-text">
            <p class="">ORDER ID: ${orderID}</p>
          </div>
  
          <div class="amount">
            <p class="gray-text">AMOUNT PAID: </p>
            <p class="text-bold amount2">₹ 2500.00</p>
          </div>
  
          <div class="date-box">
            <div class="date-box-1">
              <p class="gray-text">ISSUED TO : </p>
              <p class="">${formattedDate}</p>
            </div>
            <div class="date-box-2">
              <p class="gray-text">PAID ON : </p>
              <p class="">${formattedDate}</p>
            </div>
          </div>
  
          <div class="table-main">
            <div class="table-main-left">
              <p class="table-heading">DESCRIPTION</p>
              <p class="">Amount</p>
            </div>
            <div class="table-main-right">
              <div class="table-main-right-1">
                <p class="table-heading">UNIT PRICE</p>
                <p class="">₹ 2500.00</p>
              </div>
              <div class="table-main-right-2">
                <p class="table-heading">QTY</p>
                <p class="">1</p>
              </div>
              <div class="table-main-right-3">
                <p class="table-heading">AMOUNT</p>
                <p class="">₹ 2500.00</p>
              </div>
            </div>
          </div>
  
          <div class="total-amount">
            <p class="gap text-bold">Total <span>₹ 2500.00</span></p>
          </div>
  
          <div class="paid-amount">
            <p class="blue-text">Total <span>₹ 2500.00</span></p>
          </div>
  
          <div class="congo">
            <p>Congratulations! You have successfully registered for Youth Leadership Program.</p>
          </div>
        </div>
      </div>
  
      <hr>
  
      <div class="doubt">If you have any questions, reply to this email or contact us at <a
          href="mailto:secritariat@indiamun.org">secritariat@indiamun.org</a> </div>
  
      <div class="last-section">
        <p class="last-p">Secretariat - India MUN</p>
        <img width="120px" src="https://indiamun.org/static/media/logo%20left.548aa3eb.webp" alt="logo">
        <a class="secondlast" href="mailto:secretariat@indiamun.org">secretariat@indiamun.org</a>
        <div class="last-links"><a href="https://indiamun.org/">www.indiamun.org</a> | <a href="https://indiamun.org/">India MUN</a></div>
      </div>
  
    </body>
  
  </html>`

    await sendEmail(email, 'Email Test', 'Testing Email', htmlContent);

  } catch (error) {
    return next(
      new AppError(
        error.message || 'Something went wrong, please try again.',
        500
      )
    );
  }

  // Sending the response
  res.status(200).json({
    success: true,
    message: 'Email Sent successfully',
  });
});

/**
 * @LOGGED_IN_USER_DETAILS
 * @ROUTE @GET {{URL}}/api/v1/user/me
 * @ACCESS Private(Logged in users only)
 */
export const getLoggedInUserDetails = asyncHandler(async (req, res, _next) => {
  // Finding the user using the id from modified req object
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    message: 'User details',
    user,
  });
});

/**
 * @FORGOT_PASSWORD
 * @ROUTE @POST {{URL}}/api/v1/user/reset
 * @ACCESS Public
 */
export const forgotPassword = asyncHandler(async (req, res, next) => {
  // Extracting email from request body
  const { email } = req.body;

  // If no email send email required message
  if (!email) {
    return next(new AppError('Email is required', 400));
  }

  // Finding the user via email
  const user = await User.findOne({ email });

  // If no email found send the message email not found
  if (!user) {
    return next(new AppError('Email not registered', 400));
  }

  // Generating the reset token via the method we have in user model
  const resetToken = await user.generatePasswordResetToken();

  // Saving the forgotPassword* to DB
  await user.save();

  // constructing a url to send the correct data
  /**HERE
   * req.protocol will send if http or https
   * req.get('host') will get the hostname
   * the rest is the route that we will create to verify if token is correct or not
   */
  // const resetPasswordUrl = `${req.protocol}://${req.get(
  //   "host"
  // )}/api/v1/user/reset/${resetToken}`;
  const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  // We here need to send an email to the user with the token
  const subject = 'Reset Password';
  const message = `You can reset your password by clicking <a href=${resetPasswordUrl} target="_blank">Reset your password</a>\nIf the above link does not work for some reason then copy paste this link in new tab ${resetPasswordUrl}.\n If you have not requested this, kindly ignore.`;

  try {
    await sendEmail(email, subject, message);

    // If email sent successfully send the success response
    res.status(200).json({
      success: true,
      message: `Reset password token has been sent to ${email} successfully`,
    });
  } catch (error) {
    // If some error happened we need to clear the forgotPassword* fields in our DB
    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiry = undefined;

    await user.save();

    return next(
      new AppError(
        error.message || 'Something went wrong, please try again.',
        500
      )
    );
  }
});

/**
 * @RESET_PASSWORD
 * @ROUTE @POST {{URL}}/api/v1/user/reset/:resetToken
 * @ACCESS Public
 */
export const resetPassword = asyncHandler(async (req, res, next) => {
  // Extracting resetToken from req.params object
  const { resetToken } = req.params;

  // Extracting password from req.body object
  const { password } = req.body;

  // We are again hashing the resetToken using sha256 since we have stored our resetToken in DB using the same algorithm
  const forgotPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Check if password is not there then send response saying password is required
  if (!password) {
    return next(new AppError('Password is required', 400));
  }

  console.log(forgotPasswordToken);

  // Checking if token matches in DB and if it is still valid(Not expired)
  const user = await User.findOne({
    forgotPasswordToken,
    forgotPasswordExpiry: { $gt: Date.now() }, // $gt will help us check for greater than value, with this we can check if token is valid or expired
  });

  // If not found or expired send the response
  if (!user) {
    return next(
      new AppError('Token is invalid or expired, please try again', 400)
    );
  }

  // Update the password if token is valid and not expired
  user.password = password;

  // making forgotPassword* valus undefined in the DB
  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;

  // Saving the updated user values
  await user.save();

  // Sending the response when everything goes good
  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * @CHANGE_PASSWORD
 * @ROUTE @POST {{URL}}/api/v1/user/change-password
 * @ACCESS Private (Logged in users only)
 */
export const changePassword = asyncHandler(async (req, res, next) => {
  // Destructuring the necessary data from the req object
  const { oldPassword, newPassword } = req.body;
  const { id } = req.user; // because of the middleware isLoggedIn

  // Check if the values are there or not
  if (!oldPassword || !newPassword) {
    return next(
      new AppError('Old password and new password are required', 400)
    );
  }

  // Finding the user by ID and selecting the password
  const user = await User.findById(id).select('+password');

  // If no user then throw an error message
  if (!user) {
    return next(new AppError('Invalid user id or user does not exist', 400));
  }

  // Check if the old password is correct
  const isPasswordValid = await user.comparePassword(oldPassword);

  // If the old password is not valid then throw an error message
  if (!isPasswordValid) {
    return next(new AppError('Invalid old password', 400));
  }

  // Setting the new password
  user.password = newPassword;

  // Save the data in DB
  await user.save();

  // Setting the password undefined so that it won't get sent in the response
  user.password = undefined;

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * @UPDATE_USER
 * @ROUTE @PUT {{URL}}/api/v1/user/update/:id
 * @ACCESS Private (Logged in user only)
 */
export const updateUser = asyncHandler(async (req, res, next) => {
  // Destructuring the necessary data from the req object
  const { fullName } = req.body;
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    return next(new AppError('Invalid user id or user does not exist'));
  }

  if (fullName) {
    user.fullName = fullName;
  }

  // // Run only if user sends a file
  // if (req.file) {
  //   // Deletes the old image uploaded by the user
  //   await cloudinary.v2.uploader.destroy(user.avatar.public_id);

  //   try {
  //     const result = await cloudinary.v2.uploader.upload(req.file.path, {
  //       folder: 'lms', // Save files in a folder named lms
  //       width: 250,
  //       height: 250,
  //       gravity: 'faces', // This option tells cloudinary to center the image around detected faces (if any) after cropping or resizing the original image
  //       crop: 'fill',
  //     });

  //     // If success
  //     if (result) {
  //       // Set the public_id and secure_url in DB
  //       user.avatar.public_id = result.public_id;
  //       user.avatar.secure_url = result.secure_url;

  //       // After successful upload remove the file from local storage
  //       fs.rm(`uploads/${req.file.filename}`);
  //     }
  //   } catch (error) {
  //     return next(
  //       new AppError(error || 'File not uploaded, please try again', 400)
  //     );
  //   }
  // }

  // Save the user object
  await user.save();

  res.status(200).json({
    success: true,
    message: 'User details updated successfully',
  });
});

/**
 * @UPDATE_USER
 * @ROUTE @PUT {{URL}}/api/v1/user/update/:id
 * @ACCESS Private (Logged in user only)
 */
export const myLearning = asyncHandler(async (req, res, next) => {

  const { id } = req.user;

  // Retrieve user's email
  const user = await User.findById(id);
  const userEmail = user.email;
  console.log(`userEmail: ${userEmail}`)

  if (!user) {
    return next(new AppError('Invalid user id or user does not exist'));
  }

  // Query the EnrolledUsersIYFA collection to check if the user's email exists for the 'IYFA' course
  const enrolledUserIYFA = await EnrolledUsersIYFA.findOne({ email: userEmail });
  console.log(`enrolledUserIYFA: ${enrolledUserIYFA}`)

  // Query the EnrolledUsersYLP collection to check if the user's email exists for the 'YLP' course
  const enrolledUserYLP = await EnrolledUsersYLP.findOne({ email: userEmail });

  // if (!enrolledUserIYFA) {
  //   return res.status(200).json({
  //     success: true,
  //     message: 'IYFA course not purchased by the user',
  //     data: [],
  //   });
  // }

  // if (!enrolledUserYLP) {
  //   return res.status(200).json({
  //     success: true,
  //     message: 'IYFA course not purchased by the user',
  //     data: [],
  //   });
  // }

  // Initialize arrays to store purchased courses
  let purchasedCoursesIYFA = [];
  let purchasedCoursesYLP = [];

  // If the user is enrolled, fetch the courses related to that user for the 'IYFA' course
  if (enrolledUserIYFA) {
    purchasedCoursesIYFA = await Course.find({ title: 'IYFA' });
  }

  // If the user is enrolled, fetch the courses related to that user for the 'YLP' course
  if (enrolledUserYLP) {
    purchasedCoursesYLP = await Course.find({ title: 'YLP' });
  }

  // Combine the purchased courses for both 'IYFA' and 'YLP'
  const allPurchasedCourses = [...purchasedCoursesIYFA, ...purchasedCoursesYLP];

  res.status(200).json({
    success: true,
    message: 'User\'s Purchased Courses fetched successfully',
    data: allPurchasedCourses,
  });
});

/**
 * @UPDATE_USER
 * @ROUTE @PUT {{URL}}/api/v1/user/update/:id
 * @ACCESS Private (Logged in user only)
 */
export const emailTesting = asyncHandler(async (req, res, next) => {

  try {
    const email = 'akshat4575@gmail.com'

    const currentDate = new Date(); // Get the current date and time

    // Create an array of month names
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June','July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Get the day of the month (1-31)
    const day = currentDate.getDate();

    // Get the month (0-11, so we add 1)
    const month = monthNames[currentDate.getMonth()];

    // Get the year
    const year = currentDate.getFullYear();

    // Format the date as "5 May 2023"
    const formattedDate = `${day} ${month} ${year}`;

    const orderID = '2wwf32ere433'

    const htmlContent = `<!DOCTYPE html>
    <html lang="en" style="margin: 0; padding: 0; box-sizing: border-box;">
    
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    
    <body style="margin: 0; padding: 0; box-sizing: border-box;">
      <div style="display: flex; margin-left: 200px; flex-direction: column; justify-content: center; align-items: center;">
        <div style="width: 600px;">
          <div style="margin-bottom: 25px;">
            <img src="https://indiamun.org/static/media/logo%20left.548aa3eb.webp" alt="logo" width="180px">
          </div>
    
          <div style="text-align: right; margin-bottom: 25px; color: gray; font-size: 18px;">
            <p>ORDER ID: ${orderID}</p>
          </div>
    
          <div style="display: flex; font-size: 18px; margin-bottom: 25px;">
            <p style="color: gray;">AMOUNT PAID: </p>
            <p style="margin-left: 10px; font-weight: bolder;">₹ 2500.00</p>
          </div>
    
          <div style="display: flex; width: 100%; justify-content: space-between; margin-bottom: 65px;">
            <div>
              <p style="color: gray;">ISSUED TO : </p>
              <p>${email}</p>
            </div>
            <div style="margin-left: 370px">
              <p style="color: gray;">PAID ON : </p>
              <p>${formattedDate}</p>
            </div>
          </div>
    
          <div style="display: flex; width: 100%; justify-content: space-between; margin-bottom: 45px;">
            <div>
              <p style="margin-bottom: 10px; font-weight: bold;">DESCRIPTION</p>
              <p>Amount</p>
            </div>
            <div style="display: flex; margin-left:310px; justify-content: space-around;">
              <div style="margin-right: 16px;">
                <p style="margin-bottom: 10px; font-weight: bold;">UNIT PRICE</p>
                <p>₹ 2500.00</p>
              </div>
              <div style="margin-right: 16px;">
                <p style="margin-bottom: 10px; font-weight: bold;">QTY</p>
                <p>1</p>
              </div>
              <div>
                <p style="margin-bottom: 10px; font-weight: bold;">AMOUNT</p>
                <p>₹ 2500.00</p>
              </div>
            </div>
          </div>
    
          <div style="text-align: right; font-size: 20px; margin-bottom: 20px;">
            <p style="font-weight: bolder;">Total <span style="margin-left: 30px;">₹ 2500.00</span></p>
          </div>
    
          <div style="text-align: right; margin-bottom: 50px; color: darkblue;">
            <p>Total <span style="margin-left: 55px;">₹ 2500.00</span></p>
          </div>
    
          <div style="margin-bottom: 120px;">
            <p>Congratulations! You have successfully registered for Youth Leadership Program.</p>
          </div>
        </div>
      </div>
    
      <hr>
    
      <div style="margin-top: 30px; margin-bottom: 60px;">If you have any questions, reply to this email or contact us at <a
          href="mailto:secritariat@indiamun.org">secritariat@indiamun.org</a> </div>
    
      <div style="display: flex; flex-direction: column;">
        <div style="margin-bottom: 30px;"><a href="https://indiamun.org/">www.indiamun.org</a> | <a href="https://indiamun.org/">India MUN</a></div>
      </div>
    
    </body>
    
    </html>`

    await sendEmail(email, 'Email Test', 'Testing Email', htmlContent);

  } catch (error) {
    return next(
      new AppError(
        error.message || 'Something went wrong, please try again.',
        500
      )
    );
  }

  // Sending the response
  res.status(200).json({
    success: true,
    message: 'Email Sent successfully',
  });
});

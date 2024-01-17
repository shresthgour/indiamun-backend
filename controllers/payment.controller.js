import crypto from 'crypto';

import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import User from '../models/user.model.js';
import AppError from '../utils/AppError.js';
import { razorpay } from '../server.js';
import Razorpay from 'razorpay';
import Payment from '../models/Payment.model.js';
import Course from '../models/course.model.js';
import {EnrolledUsersIYFA, EnrolledUsersYLP} from '../models/enrolledUsers.model.js';
import { v4 as uuidv4 } from 'uuid';
import generatePDFReceipt from '../utils/generatePDFReceipt.js';
import sendEmail from '../utils/sendEmail.js';

/**
 * @ACTIVATE_SUBSCRIPTION
 * @ROUTE @POST {{URL}}/api/v1/payments/subscribe
 * @ACCESS Private (Logged in user only)
 */
export const buySubscription = asyncHandler(async (req, res, next) => {
  // Extracting ID from request obj
  const { id } = req.user;

  // Finding the user based on the ID
  const user = await User.findById(id);

  if (!user) {
    return next(new AppError('Unauthorized, please login'));
  }

  // Checking the user role
  if (user.role === 'ADMIN') {
    return next(new AppError('Admin cannot purchase a subscription', 400));
  }

  // Creating a subscription using razorpay that we imported from the server
  const subscription = await razorpay.subscriptions.create({
    plan_id: process.env.RAZORPAY_PLAN_ID, // The unique plan ID
    customer_notify: 1, // 1 means razorpay will handle notifying the customer, 0 means we will not notify the customer
    total_count: 12, // 12 means it will charge every month for a 1-year sub.
  });

  // Adding the ID and the status to the user account
  user.subscription.id = subscription.id;
  user.subscription.status = subscription.status;

  // Saving the user object
  await user.save();

  res.status(200).json({
    success: true,
    message: 'subscribed successfully',
    subscription_id: subscription.id,
  });
});

/**
 * @MAKE_PAYMENT
 * @ROUTE @POST {{URL}}/api/v1/payments/payment
 * @ACCESS Private (Logged in user only)
 */
export const paymentIYFA = asyncHandler(async (req, res, next) => {
  try {
    // Extracting ID from request obj
    const { id } = req.user;

    // Finding the user based on the ID
    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('Unauthorized, please login'));
    }

    // Checking the user role
    if (user.role === 'ADMIN') {
      return next(new AppError('Admin cannot make a payment', 400));
    }

    // This uuidv4() function creates different id everytime its called
    const randomUUID = uuidv4()
    // console.log(`UUID: `, randomUUID)

    const handlePayment = async () => {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_SECRET,
      });

      const options = {
        amount: '100',
        currency: "INR",
        receipt: randomUUID,
        payment_capture: 1,
      };

      try {
        // const response = await razorpay.createPaymentOrder(options);
        const response = await razorpay.orders.create(options)
        // Handle success
        console.log(response);
      } catch (error) {
        // Handle error
        console.log(error);
      }

      // const razorpayCheckout = new window.Razorpay(options);
      // razorpayCheckout.open();
    };

    handlePayment()

    const orderIdPrefix = `order_${user._id}_${Date.now()}`;
    const truncatedOrderId = orderIdPrefix.slice(0, 40);

    // Creating an order using razorpay
    const order = await razorpay.orders.create({
      amount: process.env.PAYMENT_AMOUNT,
      currency: process.env.CURRENCY,
      receipt: truncatedOrderId,
    });

    // Ensure user.payment is defined before accessing its properties
    user.payment = user.payment || {};

    // Adding the order ID to the user account
    user.payment.order_id = order.id;

    // Saving the user object
    await user.save();

    // Adding the user email in the enrolled user list
    await EnrolledUsersIYFA.create({
      email: user.email,
    });

    // Generate PDF receipt details
    const pdfDetails = await generatePDFReceipt(order);

    // Send receipt via email
    const attachments = [pdfDetails];
    await sendEmail(user.email, 'Payment Receipt', 'Thank you for purchasing our course!', attachments);

    res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: 'Receipt sent via email',
    });

  } catch (error) {
    console.error('Payment Error:', error);

    // Handle the error and send an appropriate response
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message, // Include the error message for debugging
    });
  }
});

/**
 * @MAKE_PAYMENT
 * @ROUTE @POST {{URL}}/api/v1/payments/payment
 * @ACCESS Private (Logged in user only)
 */
export const paymentYLP = asyncHandler(async (req, res, next) => {
  try {
    // Extracting ID from request obj
    const { id } = req.user;

    // const { course } = req.params;

    // Finding the user based on the ID
    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('Unauthorized, please login'));
    }

    // Checking the user role
    if (user.role === 'ADMIN') {
      return next(new AppError('Admin cannot make a payment', 400));
    }

    // This uuidv4() function creates different id everytime its called
    const randomUUID = uuidv4()
    // console.log(`UUID: `, randomUUID)

    const handlePayment = async () => {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_SECRET,
      });

      const options = {
        amount: '100',
        currency: "INR",
        receipt: randomUUID,
        payment_capture: 1,
      };

      try {
        // const response = await razorpay.createPaymentOrder(options);
        const response = await razorpay.orders.create(options)
        // Handle success
        console.log(response);
      } catch (error) {
        // Handle error
        console.log(error);
      }

      // const razorpayCheckout = new window.Razorpay(options);
      // razorpayCheckout.open();
    };

    handlePayment()

    const orderIdPrefix = `order_${user._id}_${Date.now()}`;
    const truncatedOrderId = orderIdPrefix.slice(0, 40);

    // Creating an order using razorpay
    const order = await razorpay.orders.create({
      amount: process.env.PAYMENT_AMOUNT,
      currency: process.env.CURRENCY,
      receipt: truncatedOrderId,
    });

    // Ensure user.payment is defined before accessing its properties
    user.payment = user.payment || {};

    // Adding the order ID to the user account
    user.payment.order_id = order.id;

    // Saving the user object
    await user.save();

    // Adding the user email in the enrolled user list
    await EnrolledUsersYLP.create({
      email: user.email,
    });


    res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });

  } catch (error) {
    console.error('Payment Error:', error);

    // Handle the error and send an appropriate response
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message, // Include the error message for debugging
    });
  }
});

/**
 * @MAKE_PAYMENT
 * @ROUTE @POST {{URL}}/api/v1/payments/payment
 * @ACCESS Private (Logged in user only)
 */
export const makePayment = asyncHandler(async (req, res, next) => {
  try {
    // Extracting ID from request obj
    const { id } = req.user;

    // Finding the user based on the ID
    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('Unauthorized, please login'));
    }

    // Checking the user role
    if (user.role === 'ADMIN') {
      return next(new AppError('Admin cannot make a payment', 400));
    }

    const orderIdPrefix = `order_${user._id}_${Date.now()}`;
    const truncatedOrderId = orderIdPrefix.slice(0, 40);

    // Creating an order using razorpay
    const order = await razorpay.orders.create({
      amount: process.env.PAYMENT_AMOUNT,
      currency: process.env.CURRENCY,
      receipt: truncatedOrderId,
    });

    // Ensure user.payment is defined before accessing its properties
    user.payment = user.payment || {};

    // Adding the order ID to the user account
    user.payment.order_id = order.id;

    // Saving the user object
    await user.save();

    res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (error) {
    console.error('Payment Error:', error);

    // Handle the error and send an appropriate response
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message, // Include the error message for debugging
    });
  }
});

/**
 * @VERIFY_SUBSCRIPTION
 * @ROUTE @POST {{URL}}/api/v1/payments/verify
 * @ACCESS Private (Logged in user only)
 */
export const verifySubscription = asyncHandler(async (req, res, next) => {
  const { id } = req.user;
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

  // Finding the user
  const user = await User.findById(id);

  // Getting the subscription ID from the user object
  const subscriptionId = user.subscription.id;

  // Generating a signature with SHA256 for verification purposes
  // Here the subscriptionId should be the one which we saved in the DB
  // razorpay_payment_id is from the frontend and there should be a '|' character between this and subscriptionId
  // At the end convert it to Hex value
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_SECRET)
    .update(`${razorpay_payment_id}|${subscriptionId}`)
    .digest('hex');

  // Check if generated signature and signature received from the frontend is the same or not
  if (generatedSignature !== razorpay_signature) {
    return next(new AppError('Payment not verified, please try again.', 400));
  }

  // If they match create payment and store it in the DB
  await Payment.create({
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_signature,
  });

  // Update the user subscription status to active (This will be created before this)
  user.subscription.status = 'active';

  // Save the user in the DB with any changes
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
  });
});

/**
 * @VERIFY_PAYMENT
 * @ROUTE @POST {{URL}}/api/v1/payments/verifyPayment
 * @ACCESS Private (Logged in user only)
 */
export const verifyPayment = asyncHandler(async (req, res, next) => {
  const { id } = req.user;
  const { razorpay_payment_id, razorpay_signature } = req.body;

  // Finding the user
  const user = await User.findById(id);

  // Check if the user exists
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Generate a signature with SHA256 for verification purposes
  // Here, the orderId should be unique for each payment
  // razorpay_payment_id is from the frontend, and there should be a '|' character between this and orderId
  // At the end convert it to Hex value
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_SECRET)
    .update(`${razorpay_payment_id}|${user._id}`)
    .digest('hex');

  // Check if the generated signature and signature received from the frontend match
  if (generatedSignature !== razorpay_signature) {
    return next(new AppError('Payment not verified, please try again.', 400));
  }

  // If they match, create a payment and store it in the DB
  await Payment.create({
    razorpay_payment_id,
    user: user._id,
  });

  // Update the user subscription status to active (This will be created before this)
  user.subscription.status = 'active';

  // Save the user in the DB with any changes
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
  });
});


/**
 * @CANCEL_SUBSCRIPTION
 * @ROUTE @POST {{URL}}/api/v1/payments/unsubscribe
 * @ACCESS Private (Logged in user only)
 */
export const cancelSubscription = asyncHandler(async (req, res, next) => {
  const { id } = req.user;

  // Finding the user
  const user = await User.findById(id);

  // Checking the user role
  if (user.role === 'ADMIN') {
    return next(
      new AppError('Admin does not need to cannot cancel subscription', 400)
    );
  }

  // Finding subscription ID from subscription
  const subscriptionId = user.subscription.id;

  // Creating a subscription using razorpay that we imported from the server
  try {
    const subscription = await razorpay.subscriptions.cancel(
      subscriptionId // subscription id
    );

    // Adding the subscription status to the user account
    user.subscription.status = subscription.status;

    // Saving the user object
    await user.save();
  } catch (error) {
    // Returning error if any, and this error is from razorpay so we have statusCode and message built in
    return next(new AppError(error.error.description, error.statusCode));
  }

  // Finding the payment using the subscription ID
  const payment = await Payment.findOne({
    razorpay_subscription_id: subscriptionId,
  });

  // Getting the time from the date of successful payment (in milliseconds)
  const timeSinceSubscribed = Date.now() - payment.createdAt;

  // refund period which in our case is 14 days
  const refundPeriod = 14 * 24 * 60 * 60 * 1000;

  // Check if refund period has expired or not
  if (refundPeriod <= timeSinceSubscribed) {
    return next(
      new AppError(
        'Refund period is over, so there will not be any refunds provided.',
        400
      )
    );
  }

  // If refund period is valid then refund the full amount that the user has paid
  await razorpay.payments.refund(payment.razorpay_payment_id, {
    speed: 'optimum', // This is required
  });

  user.subscription.id = undefined; // Remove the subscription ID from user DB
  user.subscription.status = undefined; // Change the subscription Status in user DB

  await user.save();
  await payment.remove();

  // Send the response
  res.status(200).json({
    success: true,
    message: 'Subscription canceled successfully',
  });
});

/**
 * @GET_RAZORPAY_ID
 * @ROUTE @POST {{URL}}/api/v1/payments/razorpay-key
 * @ACCESS Public
 */
export const getRazorpayApiKey = asyncHandler(async (_req, res, _next) => {
  res.status(200).json({
    success: true,
    message: 'Razorpay API key',
    key: process.env.RAZORPAY_KEY_ID,
  });
});

/**
 * @GET_RAZORPAY_ID
 * @ROUTE @GET {{URL}}/api/v1/payments
 * @ACCESS Private (ADMIN only)
 */
export const allPayments = asyncHandler(async (req, res, _next) => {
  const { count, skip } = req.query;

  // Find all subscriptions from razorpay
  const allPayments = await razorpay.subscriptions.all({
    count: count ? count : 10, // If count is sent then use that else default to 10
    skip: skip ? skip : 0, // // If skip is sent then use that else default to 0
  });

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const finalMonths = {
    January: 0,
    February: 0,
    March: 0,
    April: 0,
    May: 0,
    June: 0,
    July: 0,
    August: 0,
    September: 0,
    October: 0,
    November: 0,
    December: 0,
  };

  const monthlyWisePayments = allPayments.items.map((payment) => {
    // We are using payment.start_at which is in unix time, so we are converting it to Human readable format using Date()
    const monthsInNumbers = new Date(payment.start_at * 1000);

    return monthNames[monthsInNumbers.getMonth()];
  });

  monthlyWisePayments.map((month) => {
    Object.keys(finalMonths).forEach((objMonth) => {
      if (month === objMonth) {
        finalMonths[month] += 1;
      }
    });
  });

  const monthlySalesRecord = [];

  Object.keys(finalMonths).forEach((monthName) => {
    monthlySalesRecord.push(finalMonths[monthName]);
  });

  res.status(200).json({
    success: true,
    message: 'All payments',
    allPayments,
    finalMonths,
    monthlySalesRecord,
  });
});
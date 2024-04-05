import { Router } from 'express';
import {
  getRazorpayApiKey,
  verifySubscription,
  allPayments,
  makePayment,
  checkout,
  paymentVerification,
  paymentIYFA,
  paymentYLP,
  receiptCheck
} from '../controllers/payment.controller.js';
import {
  authorizeRoles,
  authorizeSubscribers,
  isLoggedIn, 
} from '../middlewares/auth.middleware.js';

const router = Router();

// router.route('/payment').post(isLoggedIn, makePayment);
router.route('/payment-iyfa').post(isLoggedIn, paymentIYFA);
router.route('/checkout').get(isLoggedIn, checkout);
router.route('/paymentverification').post(paymentVerification);
router.route('/payment-ylp').post(isLoggedIn, paymentYLP);
router.route('/verify').post(isLoggedIn, verifySubscription);
router.route('/razorpay-key').get(isLoggedIn, getRazorpayApiKey);
router.route('/rcheck').get(receiptCheck);
// router.route('/').get(isLoggedIn, authorizeRoles('ADMIN'), allPayments);

export default router;

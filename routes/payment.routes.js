import { Router } from 'express';
import {
  getRazorpayApiKey,
  buySubscription,
  verifySubscription,
  cancelSubscription,
  allPayments,
  makePayment,
  paymentIYFA,
  paymentYLP
} from '../controllers/payment.controller.js';
import {
  authorizeRoles,
  authorizeSubscribers,
  isLoggedIn, 
} from '../middlewares/auth.middleware.js';

const router = Router();

router.route('/subscribe').post(isLoggedIn, buySubscription);
router.route('/payment').post(isLoggedIn, makePayment);
router.route('/payment-iyfa').post(isLoggedIn, paymentIYFA);
router.route('/payment-ylp').post(isLoggedIn, paymentYLP);
router.route('/verify').post(isLoggedIn, verifySubscription);
router
  .route('/unsubscribe')
  .post(isLoggedIn, authorizeSubscribers, cancelSubscription);
router.route('/razorpay-key').get(isLoggedIn, getRazorpayApiKey);
router.route('/').get(isLoggedIn, authorizeRoles('ADMIN'), allPayments);

export default router;

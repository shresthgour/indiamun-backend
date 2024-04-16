import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  getLoggedInUserDetails,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  updateUser,
  myLearning,
  emailTesting,
  verifyOTP
} from "../controllers/user.controller.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/verify-otp", verifyOTP);
// router.post("/verify-otp", upload.single("avatar"), verifyOTP);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
// router.get("/me", isLoggedIn, getLoggedInUserDetails);
router.post("/reset", forgotPassword);
router.post("/reset/:resetToken", resetPassword);
router.post("/change-password", isLoggedIn, changePassword);
router.put("/update/:id", isLoggedIn, updateUser);
// router.put("/update/:id", isLoggedIn, upload.single("avatar"), updateUser);
router.post("/my-learning", isLoggedIn, myLearning);
router.get("/email-testing", emailTesting);

export default router;
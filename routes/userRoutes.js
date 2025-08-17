import express from "express";
import {registerUser,loginUser, userCredits,paymentRazorpay,verifyPayment} from '../Controllers/userController.js'
import userAuth from "../middlewares/Auth.js";

const userRouter = express.Router();
userRouter.post('/register',registerUser);
userRouter.post('/login',loginUser);
userRouter.get('/credits',userAuth,userCredits);
userRouter.post('/pay-razor',userAuth,paymentRazorpay)
userRouter.post("/verify", userAuth, verifyPayment);
export default userRouter;

//http://localhost:4000/api/user/register
//http:localhost:4000/api/login
// npm run start => backend
// npm run dev => frontend
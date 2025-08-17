import useModel from "../Models/userModel.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Razorpay from "razorpay";
import dotenv from "dotenv";
import transactionModel from "../Models/transactionModel.js";
dotenv.config();



const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please fill in all fields' });
        }

        const sanitizedEmail = email.toLowerCase().trim();
        const existingUser = await useModel.findOne({ email: sanitizedEmail });

        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email is already registered' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new useModel({
            name,
            email: sanitizedEmail,
            password: hashedPassword
        });
        const user = await newUser.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.status(201).json({ success: true, token, user: { name: user.name } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const sanitizedEmail = email.toLowerCase().trim();
        const user = await useModel.findOne({ email: sanitizedEmail });
        const isMatch = user ? await bcrypt.compare(password, user.password) : false;

        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid Credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        return res.status(200).json({ success: true, token, user: { name: user.name } });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const userCredits = async (req,res)=>{
    try{    
        const {userId} = req;
        const user = await useModel.findById(userId);
        res.json({success:true,credits:user.creditBalance,user:{name:user.name}});
    }   
    catch(error){
        console.log(error);
        return res.status(500).json({success:false,message : 'server error'});
    }
};

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


const paymentRazorpay = async(req,res)=>{
    try{
        const userId = req.userId;
        const { planId } = req.body;

        const userData = await useModel.findById(userId)
         if(!userId || !planId){
            return res.json({success:false,message:'Missing Details'});
        }

        let credits,plan,amount,date

        switch(planId){
            case 'Basic':
                plan  = 'Basic';
                credits = 100;
                amount = 10;
                break;
           case 'Advanced':
                plan  = 'Advanced';
                credits = 500;
                amount = 50;
                break;     
            case 'Business':
                plan  = 'Business';
                credits = 5000;
                amount = 250;
                break;

            default :
                return res.json({success:false,message:'plan not found'});
        }
        date = Date.now();

        const transactionData = {
            userId,plan,amount,credits,date,payment: false 
        }
        const newTransaction = await transactionModel.create(transactionData)

        const options = {
            amount : amount*100,
            currency : process.env.CURRENCY,
            receipt : newTransaction._id
        }
        
        razorpayInstance.orders.create(options, (error, order) => {
        if (error) {
            console.log(error);
            return res.json({ success: false, message: error });
        }
        res.json({ success: true, order });
        });

    }
    catch(error){
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId } = req.body;

        
        const crypto = await import('crypto');
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        await transactionModel.findByIdAndUpdate(transactionId, { payment: true });

        const transaction = await transactionModel.findById(transactionId);
        await useModel.findByIdAndUpdate(transaction.userId, {
            $inc: { creditBalance: transaction.credits }
        });

        res.json({ success: true, message: 'Payment verified and credits added' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};


export { registerUser, loginUser, userCredits,paymentRazorpay , verifyPayment };
import { razorpayInstance } from "../app.js";
import { Payment } from "../models/payment.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import crypto from 'crypto'
const createOrder = asyncHandler(async (req , res) => {
    const { amount } = req.body;

    if (!razorpayInstance) {
        return res.status(503).json({
            success: false,
            message: "Razorpay is not configured on the server. Set RAZORPAY_KEY and RAZORPAY_KEY_SECRET in the backend environment."
        });
    }

    try {
        const options = {
            amount: Number(amount * 100),
            currency: "INR",
            receipt: crypto.randomBytes(10).toString("hex"),
        }

        razorpayInstance.orders.create(options, (error, order) => {
            if (error) {
                console.log(error);
                return res.status(error.statusCode || 500).json({
                    success: false,
                    message: error.error?.description || error.message || "Unable to create Razorpay order"
                });
            }
            res.status(200).json({ success: true, data: order });
            console.log(order)
        });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error!" });
        console.log(error);
    }
})

const verifyPayment = asyncHandler(async (req , res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!process.env.RAZORPAY_KEY_SECRET) {
        return res.status(503).json({
            success: false,
            message: "Razorpay secret is not configured on the server."
        });
    }

    try {
        // Create Sign
        const sign = razorpay_order_id + "|" + razorpay_payment_id;

        // Create ExpectedSign
        const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        // Create isAuthentic
        const isAuthentic = expectedSign === razorpay_signature;

        // Condition 
        if (isAuthentic) {
            const payment = new Payment({
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            });

            // Save Payment 
            await payment.save();

            // Send Message 
            res.json({
                message: "Payement Successfully"
            });
        }
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error!" });
        console.log(error);
    }
})

export { createOrder , verifyPayment };
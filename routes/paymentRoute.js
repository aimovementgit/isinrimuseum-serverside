import express from 'express';
import { payment, verifyPayment, } from '../controllers/payStack.js';

const paymentRouter = express.Router();

// Payment initialization route
paymentRouter.post('/initialize', payment);

// Payment verification route
paymentRouter.get('/verify/:reference', verifyPayment);



// Default export
export default paymentRouter;


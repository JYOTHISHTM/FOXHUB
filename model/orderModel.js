const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  productPrice: { type: Number, required: true },
  status: { type: String, default: 'Processing' },
  cancelReason: { type: String, default: null },
  returnReason: { type: String, default: null },
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  razorpayOrderId: {
    type: String,
    sparse: true,
    unique: true
  },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  address: {
    state: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true }
  },  
  paymentMethod: { type: String, required: true },
  status: { type: String, required: true, default: 'Pending' },
  coupon: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  hasRequest: { type: Boolean, default: false }
}, { timestamps: true });

orderSchema.index({ createdAt: -1 });
orderSchema.index({ razorpayOrderId: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;




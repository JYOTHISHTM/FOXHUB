const Wallet = require('../model/walletModel');
const mongoose = require('mongoose');

const renderWallet = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/login');
    }
    const userId = req.session.user_id;
    let wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!wallet) {
      const newWallet = new Wallet({ userId: userId, balance: 0, transactions: [] });
      await newWallet.save();
      wallet = newWallet;
    }
    res.render('userWallet', { wallet, userId, currentUrl: req.path });
  } catch (error) {
    console.error("Error in renderWallet:", error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
const addMoney = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.redirect('/login'); // Ensure proper handling of unauthorized access
    }
    
    let { amount } = req.body;
    amount = parseFloat(amount);

    // Check if amount is within the allowed range
    if (isNaN(amount) || amount < 1 || amount > 10000) {
      return res.status(400).json({ success: false, message: 'Invalid amount. Please enter a value between 1 and 10000.' });
    }

    const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (wallet) {
      wallet.balance += amount;
      wallet.transactions.push({
        amount: amount,
        transactionMethod: 'Credit',
        date: new Date()
      });

      await wallet.save();
      res.status(200).json({ success: true, message: 'Money added successfully', wallet });
    } else {
      res.status(404).json({ success: false, message: 'Wallet not found' });
    }
  } catch (error) {
    console.error("Error in addMoney:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
const checkWalletBalance = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { amount } = req.body;
    const wallet = await Wallet.findOne({ userId });

    if (wallet && wallet.balance >= parseFloat(amount)) {
      res.status(200).json({ sufficientBalance: true });
    } else {
      res.status(200).json({ sufficientBalance: false });
    }
  } catch (error) {
    console.error("Error in checkWalletBalance:", error);
    res.status(500).json({ sufficientBalance: false, message: 'An error occurred while checking the wallet balance. Please try again later.' });
  }
};

const deductFromWallet = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { amount, finalPrice } = req.body;
    const wallet = await Wallet.findOne({ userId });

    const deductionAmount = parseFloat(finalPrice || amount);
    console.log(deductionAmount + " deductFromWallet");

    if (wallet && wallet.balance >= deductionAmount) {
      wallet.balance -= deductionAmount;
      wallet.transactions.push({
        amount: deductionAmount,
        transactionMethod: 'Debit',
        date: new Date()
      });
      await wallet.save();

      res.status(200).json({ success: true });
    } else {
      res.status(200).json({ success: false, message: 'Insufficient balance in your wallet. Please choose another payment method.' });
    }
  } catch (error) {
    console.error("Error deducting amount from wallet:", error);
    res.status(500).json({ success: false, message: 'An error occurred while deducting the amount from the wallet. Please try again later.' });
  }
};



module.exports = {
  renderWallet,
  addMoney,
  checkWalletBalance,
  deductFromWallet,
  
};

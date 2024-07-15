const Order = require('../model/orderModel');


const renderDashboard = async (req, res) => {
  try {
      res.render('dashboard')
  }
  catch (error) {
      console.log(error.message);
  }
}

module.exports = {
  renderDashboard,
  
};

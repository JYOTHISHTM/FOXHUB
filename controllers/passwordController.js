const bcrypt = require('bcrypt');
const User = require('../model/userModel');

const changePassword = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { oldPassword, newPassword, confirmPassword } = req.body;

        if (!userId) {
            return res.redirect('/login');
        }

        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.render('changePassword', { message: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.render('changePassword', { message: 'New passwords do not match' });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Compare old password with stored hashed password
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

        if (!isPasswordValid) {
            return res.render('changePassword', { message: 'Current password is incorrect' });
        }

        // Hash the new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update user's password with the new hashed password
        user.password = hashedNewPassword;

        // Save the updated user object
        await user.save();

        // Render the changePassword page with success message
        return res.render('changePassword', { message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        return res.status(500).send('Internal Server Error');
    }
};

const renderChangePassword = async (req, res) => {
    try {
        const userId = req.session.user_id;
        if (!userId) {
            return res.redirect('/login');
        }
        // Provide a default value for the message
        res.render('changePassword', { message: '', currentUrl: req.path });
    } catch (error) {
        console.error('Error rendering change password page:', error);
        res.status(500).send('Internal Server Error');
    }
};


module.exports = {
    changePassword,
    renderChangePassword,
};

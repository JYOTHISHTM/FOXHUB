🦊 FoxHub - E-commerce Web Application

FoxHub is a full-featured e-commerce web application built using the MVC pattern with technologies like Node.js, Express, MongoDB, EJS, and integrates third-party services like Razorpay and Google OAuth.





📁 Tech Stack

Frontend: EJS (Embedded JavaScript)

Backend: Node.js, Express.js

Database: MongoDB (Mongoose ODM)

Authentication: Google OAuth 2.0

Payment Gateway: Razorpay

File Uploads: Multer

Architecture: MVC Pattern





.env

MongoUri=your_db_url

RAZORPAY_KEY_ID=your_razorpay_key_id

RAZORPAY_KEY_SECRET=your_razorpay_secret_key

GOOGLE_CLIENT_ID=your_google_client_id

GOOGLE_CLIENT_SECRET=your_google_client_secret_key

GOOGLE_CALLBACK_URL=your_google_callback_url







🚀 Getting Started

git clone https://github.com/yourusername/foxhub.git

cd foxhub


npm install


nodemon index.js






🔐 User Features

Signup/Login (Google OAuth supported)

Browse and shop products

Cart and Wishlist functionality

Checkout with Razorpay

Wallet payment

Profile management

Manage Addresses

Apply and use Coupons

Referals ans rewards






🛠 Admin Features

Add/Edit/Delete Products

Add and manage Coupons

View and manage Users

Dashboard and Analytics

sales report




foxhub/
│
├── controllers/        # Business logic
├── models/             # Mongoose models
├── routes/             # Express routes
├── views/              # EJS templates
├── public/             # Static files
├── middlewares/        # Custom middleware
├── utils/              # Helper functions
├── index.js            # Entry point
└── .env                # Environment configuration


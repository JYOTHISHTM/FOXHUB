# 🦊 FoxHub - E-commerce Web Application

FoxHub is a full-featured e-commerce web application built using the MVC pattern with technologies like Node.js, Express, MongoDB, EJS, and integrates third-party services like Razorpay and Google OAuth.



## 📂 Project Structure

```

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

```


## 🚀  Features

### Admin Panel
- Dashboard with analytics
- Add/Edit/Delete Products
- Add and manage Coupons
- View and manage Users
- sales report



### Users
- Signup/Login (Google OAuth supported)
- Browse and shop products
- Cart and Wishlist functionality
- Checkout with Razorpay
- Wallet payment
- Profile management
- Manage Addresses
- Apply and use Coupons
- Referals and rewards






### 3. Environment Variables

Create a `.env` file :

```env

MongoUri=your_db_url
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret_key
GOOGLE_CALLBACK_URL=your_google_callback_url
```


## 🛠️ Tech Stack

- **Backend:** Node.js, Express, MongoDB
- **Frontend:**  EJS (Embedded JavaScript)
- **Services:**  Nodemailer, Razorpay
  
## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/foxhub.git
cd foxhub
```

### 2. Install dependencies

```bash

npm install

```


### 4. Running the App

```bash

nodemon index.js

```

Developed by **Jothish T M**




🎉 FESTIVIA - Event Management Platform
Note: This project is currently under active development. Features and documentation will be updated as development progresses.

FESTIVIA is a full-stack event management and ticketing platform for Users, Event Creators, and Admins. The platform will enable creators to host events, users to book tickets, and admins to manage the overall system.

📂 Project Structure
Festivia/
├── BACKEND/        # Node.js + TypeScript + MongoDB
│   └── src/        # Source files
├── FRONTEND/       # Frontend implementation
│   └── src/        # Frontend source files
└── README.md
🚀 Planned Features
Admin Panel
Dashboard with analytics
Event and creator management
Subscription plan management
Financial tracking
Event Creators
Creator application process
Event creation and management
Earnings dashboard
Communication with users
Users
Authentication options
Event discovery and booking
Personal event creation
Profile management
🛠️ Tech Stack
Backend: Node.js, Express, TypeScript, MongoDB
Frontend: Vite + React/Vue, TailwindCSS
Services: Cloudinary, Nodemailer, Razorpay
⚙️ Getting Started
1. Clone the repository
git clone https://github.com/your-username/festivia.git
cd festivia
2. Install dependencies
# Backend
cd BACKEND
npm install

# Frontend
cd ../FRONTEND
npm install
3. Environment Variables
Create a .env file in the BACKEND/ directory with:

MONGO_URI=mongodb://localhost:27017/festivia
EMAIL_USER=your_email_address
EMAIL_PASS=your_email_app_password
CLOUDINARY_CLOUD_NAME=cloudinary_name
CLOUDINARY_API_KEY=cloudinary_api_key
CLOUDINARY_API_SECRET=cloudinary_api_secret
JWT_SECRET=jwt_secret
JWT_REFRESH_SECRET=jwt_refresh_secret
GOOGLE_CLIENT_ID=google_client_id
GOOGLE_CLIENT_SECRET=google_client_secret
GOOGLE_CALLBACK_URL=google_callback_url
FRONTEND_URL=http://localhost:3030
4. Running the App
# Backend
cd BACKEND
npm run dev

# Frontend
cd FRONTEND
npm run dev
Developed by Jothish T M

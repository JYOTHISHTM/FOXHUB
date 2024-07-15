const mongoose = require('mongoose')

const path = require('path')
require('dotenv').config();



mongoose.connect(process.env.MongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});

const express = require('express')
const app = express()
app.use(express.static('public'))





const userRoute = require('./routes/userRoutes')
app.use('/', userRoute);


const adminRoute = require('./routes/adminRoute')
app.use('/admin', adminRoute)
const session = require('express-session')
app.use(session({
    secret: 'hello',
    resave: false,
    saveUninitialized: true
}))

app.listen(4000, () => {
    console.log(`http://localhost:4000`);
    console.log(`http://localhost:4000/admin`)
})

// require('dotenv').config()

import dotenv from "dotenv";
// const mongoose = require('mongoose');
// const { DB_NAME } = require('./constant');
// import express from "express";
import connectDB from "./db/index.js";


dotenv.config({
    path:'./env' 
})


connectDB()











// function connectDB(){}


// connectDB();

//****optimised code */
// ;(async () => {
//     try{
//        await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`);
//        app.on("error", (error) => {
//             console.log("ERRR", error);
//             throw error;
//        })

//        app.listen(process.env.PORT, ()=>{
//          console.log(`The app is taking from port ${process.env.PORT}`)
//        })

//     }
//     catch(error){
//        console.log("The error is:",error);
//     }
// })()

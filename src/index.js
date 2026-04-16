// require('dotenv').config()

import dotenv from "dotenv";
// const mongoose = require('mongoose');
// const { DB_NAME } = require('./constant');
import express from "express";
import connectDB from "./db/index.js";
import {app} from "./app.js";

// const app = express();

dotenv.config({
    path:'./env' 
})


connectDB()  //async method will return a promise after completion
.then(()=> {
    app.on("error", (error) => {
            console.log("EROR", error);
            throw error;
    })
    app.listen(process.env.PORT || 8000, ()=> {
        console.log(`Server is running at port : ${process.env.PORT}`);
    });
})
.catch((error)=>{
    console.log("Mongo DB connection failed !!", error);
})










// function connectDB(){}


// connectDB();

//****optimised code */
// ;(async () => {
//     try{
//        await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`);
//        app.on("error", (error) => {
//             console.log("EROR", error);
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

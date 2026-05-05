import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({ override: true });

connectDB()
.then(() => {
    app.on("error", (error) => {
        console.log("ERROR:", error);
        throw error;
    });

    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port: ${process.env.PORT}`);
    });
})
.catch((error) => {
    console.log("Mongo DB connection failed !!", error);
});










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

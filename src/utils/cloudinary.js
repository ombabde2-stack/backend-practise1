 import {v2 as cloudinary} from "cloudinary";
 import fs from "fs";
 import dotenv from "dotenv";

// dotenv.config({ override: true });

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

let lastCloudinaryError = "";

const setLastCloudinaryError = (message) => {
   lastCloudinaryError = message || "Unknown Cloudinary upload error"
}

const getLastCloudinaryError = () => lastCloudinaryError;

const removeLocalFile = (localFilePath) => {
   if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath)
   }
}

const uploadOnCloudinary = async (localFilePath) => {
   try{
      if(!localFilePath) return null

      if (
         !process.env.CLOUDINARY_CLOUD_NAME ||
         !process.env.CLOUDINARY_API_KEY ||
         !process.env.CLOUDINARY_API_SECRET ||
         process.env.CLOUDINARY_API_SECRET === "my_secret"
      ) {
         setLastCloudinaryError("invalid Cloudinary credentials in .env")
         console.log("Cloudinary upload failed:", getLastCloudinaryError());
         removeLocalFile(localFilePath)
         return null
      }

      //upload the file on cloudinary
      const response = await cloudinary.uploader.upload(
         localFilePath,
         {
            resource_type: "auto"
         }
      );
      //file has been uploaded successfully
      console.log("file has been uploaded on cloudinary",response.url);
      removeLocalFile(localFilePath)
      return response;
   }
   catch(error){
      setLastCloudinaryError(error?.message)
      console.log("Cloudinary upload failed:", getLastCloudinaryError());
      removeLocalFile(localFilePath)
      return null; 
   }
}

//  const uploadOnCloudinary = async(localFilePath) => {
//      try {
//          if(!localFilePath) return null
//          //upload the file on cloudinary
//          const response = await cloudinary.uploader.upload(localFilePath, {
//             resource_type: "auto"
//          })
//          //file has been uploaded successfully
//          console.log("file is uploaded on cloudinary ", response.url)
//          return response;
//      } catch (error) {
//          fs.unlinkSync(localFilePath)
//      }
// }


export {uploadOnCloudinary, getLastCloudinaryError};

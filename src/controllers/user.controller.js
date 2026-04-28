import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId) => {
    try {
      const user =  await User.findById(userId)
      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()
      
      user.refreshToken = refreshToken
      await user.save({validateBeforeSave: false})

      return {accessToken, refreshToken}

    } 
    catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler( async (req, res) =>{
    // console.log("API HIT"); 
    // res.status(200).json({
    //     message: "ok"
    // })
     
    //get user details from frontend
    const {fullName, email, username, password} = req.body
    console.log("email: ",email)

    if(
        [fullName, email, username, password].some((field) => field?.trim()==="")
    ) {
        throw new ApiError(400, "All fields are required");
    }
      
    const existedUser = User.findOne({
        $or: [{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409, "Username with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase() 
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})

const loginUser = asyncHandler(async(req,res) => {
    
    const {email,username,password} = req.body

    if(!username || !email) {
        throw new ApiError(400, "username or password require")
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await 
    generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken") 
    
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, 
            {
            user: loggedInUser, accessToken, refreshToken
            },
            "user logged In successfully"
        )
    )
})

const logoutUser = asyncHandler( async(req,res) => {
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $set:{
                    refreshToken: undefined
                }
            },
            {
                new:true
            }
        )

        const options = {
            httpOnly: true,
            secure: true,
        }

        return res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken 
                                || req.body.refreshToken

    if(incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken._id)
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or invalid")
        }
    
        const {newAccessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res.status(200)
               .cookie("accessToken", newAccessToken, options)
               .cookie("refreshToken", newRefreshToken, options)
               .json(
                   new ApiResponse(
                    200,
                    {newAccessToken, newRefreshToken},
                    "Access Token Refreshed"
                   )
               )
    } catch (error) {
       throw new ApiError(401, error?.message || "Invalid refresh token") 
    }

})

const changeCurrentPassword = asyncHandler(async(req,res) => {

    //1-Take user oldPass, newPass info from frontend
    //2-Check weather oldPass matches mongoDB stored password
    //3-Change old password to new Password in database
    //4-Send "password send successfully" as ApiResponse

    const {oldPassword,newPassword} = req.body;

    const user = User.findById(req.user?._id);
    
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false})

    return res
       .status(200)      
       .json(
          new ApiResponse(404,"password changed successfully") 
       )
})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(200, req.user, "current account fetched successsfully")
})

const updateAccountDetails = asyncHandler(async(req,res) => {

    const {fullName, email} = req.body
    if(!fullName || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))

})

const updateUserAvatar = asyncHandler(async(req,res) => {

    const avatarLocalPath = req.file?.path 
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
       throw new ApiError(400, "Error while uploading the avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.status(200)
              .json(new ApiResponse(200, "Cover Image updated successfully"))

}).select("-password")

export {registerUser,
        loginUser,
        logoutUser,
        refreshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar
}
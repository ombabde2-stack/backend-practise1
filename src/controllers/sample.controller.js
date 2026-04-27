import { asyncHandler } from "../utils/asyncHandler";
import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import {ApiResponse} from "../utils/ApiResponse.js"

const generateAccessAndRefreshToken = asyncHandler(async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating Access and Refresh Token")
    }
})

const loginUser = asyncHandler(async(req,res)=> {
    //req body -> data
    
    const {username, email, password} = req.body;
    
    if(!(username || email)){
        throw new ApiError(404, "username or email is required")
    }

    const user = await User.findOne({
        $or:[{email},{username}]
    })

    if(!user){
        throw new ApiError(404, "user does not exist")
    }

    const validPassword = await user.method.isPasswordCorrect(password)
    if(!validPassword){
        throw new ApiError(401, "Invalid user credentials")
    }
    
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
    
    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken") 

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refresh Token",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
              user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        )
    )
})
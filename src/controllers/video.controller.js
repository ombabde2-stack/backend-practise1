import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {Comment} from "../models/comment.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    const pageNumber = Number(page)
    const limitNumber = Number(limit)

    if (userId && !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }

    const matchStage = {
        isPublished: true
    }

    if (query) {
        matchStage.$or = [
            {title: {$regex: query, $options: "i"}},
            {description: {$regex: query, $options: "i"}}
        ]
    }

    if (userId) {
        matchStage.owner = new mongoose.Types.ObjectId(userId)
    }

    const sortStage = {
        [sortBy || "createdAt"]: sortType === "asc" ? 1 : -1
    }

    const videosAggregate = Video.aggregate([
        {
            $match: matchStage
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $sort: sortStage
        }
    ])

    const videos = await Video.aggregatePaginate(videosAggregate, {
        page: Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1,
        limit: Number.isFinite(limitNumber) && limitNumber > 0 ? limitNumber : 10
    })

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body

    if (!title?.trim() || !description?.trim()) {
        throw new ApiError(400, "Title and description are required")
    }

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required")
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!videoFile) {
        throw new ApiError(500, "Video upload failed")
    }

    if (!thumbnail) {
        throw new ApiError(500, "Thumbnail upload failed")
    }

    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title: title.trim(),
        description: description.trim(),
        duration: videoFile.duration,
        owner: req.user?._id
    })

    return res
        .status(201)
        .json(new ApiResponse(201, video, "Video published successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                },
                likesCount: {
                    $size: "$likes"
                },
                isLiked: {
                    $in: [req.user?._id, "$likes.likedBy"]
                }
            }
        },
        {
            $project: {
                likes: 0
            }
        }
    ])

    if (!video?.length) {
        throw new ApiError(404, "Video not found")
    }

    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        }
    })

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "Video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {title, description} = req.body

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    if (!title?.trim() && !description?.trim() && !req.file?.path) {
        throw new ApiError(400, "At least one field is required to update")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this video")
    }

    const updateFields = {}

    if (title?.trim()) {
        updateFields.title = title.trim()
    }

    if (description?.trim()) {
        updateFields.description = description.trim()
    }

    if (req.file?.path) {
        const thumbnail = await uploadOnCloudinary(req.file.path)

        if (!thumbnail) {
            throw new ApiError(500, "Thumbnail upload failed")
        }

        updateFields.thumbnail = thumbnail.url
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: updateFields
        },
        {
            new: true
        }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this video")
    }

    await Video.findByIdAndDelete(videoId)
    await Comment.deleteMany({video: videoId})
    await Like.deleteMany({video: videoId})

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this video")
    }

    video.isPublished = !video.isPublished
    await video.save({validateBeforeSave: false})

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Publish status toggled successfully"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}

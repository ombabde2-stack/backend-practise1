import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {User} from "../models/user.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getPlaylistWithDetails = (playlistId) => {
    return Playlist.findById(playlistId)
        .populate("owner", "username fullName avatar")
        .populate({
            path: "videos",
            select: "videoFile thumbnail title description duration views owner createdAt",
            populate: {
                path: "owner",
                select: "username fullName avatar"
            }
        })
}

const ensurePlaylistOwner = (playlist, userId) => {
    if (playlist.owner?.toString() !== userId?.toString()) {
        throw new ApiError(403, "You are not allowed to modify this playlist")
    }
}

const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if (!name?.trim()) {
        throw new ApiError(400, "Playlist name is required")
    }

    if (!description?.trim()) {
        throw new ApiError(400, "Playlist description is required")
    }

    const playlist = await Playlist.create({
        name: name.trim(),
        description: description.trim(),
        owner: req.user?._id
    })

    const createdPlaylist = await getPlaylistWithDetails(playlist._id)

    return res
        .status(201)
        .json(new ApiResponse(201, createdPlaylist, "Playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }

    const user = await User.findById(userId)

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $project: {
                            thumbnail: 1,
                            title: 1,
                            duration: 1,
                            views: 1,
                            createdAt: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                videosCount: {
                    $size: "$videos"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                owner: 1,
                videos: 1,
                videosCount: 1,
                createdAt: 1,
                updatedAt: 1
            }
        },
        {
            $sort: {
                updatedAt: -1
            }
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "Playlists fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await getPlaylistWithDetails(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    ensurePlaylistOwner(playlist, req.user?._id)

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (playlist.videos.some((id) => id.toString() === videoId.toString())) {
        throw new ApiError(409, "Video already exists in playlist")
    }

    playlist.videos.push(videoId)
    await playlist.save({validateBeforeSave: true})

    const updatedPlaylist = await getPlaylistWithDetails(playlistId)

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    ensurePlaylistOwner(playlist, req.user?._id)

    playlist.videos = playlist.videos.filter(
        (id) => id.toString() !== videoId.toString()
    )
    await playlist.save({validateBeforeSave: true})

    const updatedPlaylist = await getPlaylistWithDetails(playlistId)

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    ensurePlaylistOwner(playlist, req.user?._id)

    await Playlist.findByIdAndDelete(playlistId)

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    if (!name?.trim()) {
        throw new ApiError(400, "Playlist name is required")
    }

    if (!description?.trim()) {
        throw new ApiError(400, "Playlist description is required")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    ensurePlaylistOwner(playlist, req.user?._id)

    playlist.name = name.trim()
    playlist.description = description.trim()
    await playlist.save({validateBeforeSave: true})

    const updatedPlaylist = await getPlaylistWithDetails(playlistId)

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}

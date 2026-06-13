import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleLike = async ({
  res,
  userId,
  targetId,
  targetField,
  Model,
  invalidMessage,
  notFoundMessage,
}) => {
  if (!isValidObjectId(targetId)) {
    throw new ApiError(400, invalidMessage);
  }

  const target = await Model.findById(targetId);

  if (!target) {
    throw new ApiError(404, notFoundMessage);
  }

  const likeFilter = {
    [targetField]: targetId,
    likedBy: userId,
  };

  const existingLike = await Like.findOne(likeFilter);

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { liked: false }, "Like removed successfully")
      );
  }

  const like = await Like.create(likeFilter);

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true, like }, "Liked successfully"));
};

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  return toggleLike({
    res,
    userId: req.user?._id,
    targetId: videoId,
    targetField: "video",
    Model: Video,
    invalidMessage: "Invalid video id",
    notFoundMessage: "Video not found",
  });
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  return toggleLike({
    res,
    userId: req.user?._id,
    targetId: commentId,
    targetField: "comment",
    Model: Comment,
    invalidMessage: "Invalid comment id",
    notFoundMessage: "Comment not found",
  });
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  return toggleLike({
    res,
    userId: req.user?._id,
    targetId: tweetId,
    targetField: "tweet",
    Model: Tweet,
    invalidMessage: "Invalid tweet id",
    notFoundMessage: "Tweet not found",
  });
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
        video: {
          $exists: true,
          $ne: null,
        },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
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
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "video",
              as: "likes",
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
              likesCount: {
                $size: "$likes",
              },
              isLiked: true,
            },
          },
          {
            $project: {
              likes: 0,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        video: {
          $first: "$video",
        },
      },
    },
    {
      $match: {
        video: {
          $ne: null,
        },
      },
    },
    {
      $replaceRoot: {
        newRoot: "$video",
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };

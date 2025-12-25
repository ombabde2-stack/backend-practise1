import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema({
    videoFile: {
        type: String,  //cloudinary url
        required: true
    },
    thumbnail: {
        type: String,  //cloudinary url
        required: true
    },
    title: {
        type:String,
        required: true,
        uppercase: true,
    },
    description: {
        type: String,  
        required: true
    },
    duration : {
        type: Number,   //clodinary url(cloudinary jaise hi koi file upload karta hai uski information apko bhej dega)
        required: true
    },
    views: {  //initially 0 after we will update it
        type: Number,
        default: 0
    },
    isPublished: { //video lagaya hai to sabko dhekne do
        type: Boolean,
        default: true
    },
    owner: {
        type:Schema.Types.ObjectId,
        ref:"User",
    },
},
{timestamps: true})

videoSchema.plugin(mongooseAggregatePaginate);

export const video = mongoose.model("Video",videoSchema);
import mongoose, {Schema} from "mongoose"
import jwt from "jsonwebtoken"

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true}) 


export const subsciptionSchema = mongoose.model("subsciption",subsciptionSchema);
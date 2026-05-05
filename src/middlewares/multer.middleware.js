import multer from "multer";

// app.post('/profile', upload.single('avatar'), function(req, res, next) {
//     // req.file is the avatar file
//     //req.body will hold 
// })

const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, "./public/temp")
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
        cb(null, `${uniqueSuffix}-${file.originalname}`)
    }
})
  
export const upload = multer({storage,});

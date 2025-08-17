import express from 'express'
import { generateImage } from '../Controllers/imageController.js'
import userAuth from '../middlewares/Auth.js'

const imageRouter = express.Router()

imageRouter.post('/generate-image',userAuth,generateImage);

export default imageRouter;
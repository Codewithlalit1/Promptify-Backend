import useModel from "../Models/userModel.js";
import FormData from 'form-data'
import axios from 'axios'  

export const generateImage = async(req,res)=>{
    try{
        const { prompt } = req.body;
        const userId = req.userId;
        const user = await useModel.findById(userId);

        if(!user || !prompt){
            return res.json({success:false,message:'Missing Details'});
        }

        if(user.creditBalance === 0 || useModel.creditBalance<0){
            return res.json({success:false,message:'No credit Balance',creditBalance:user.creditBalance});
        }
        const formData = new FormData();
        formData.append('prompt',prompt);

        const {data} = await axios.post('https://clipdrop-api.co/text-to-image/v1',
            formData,
            {headers:
                {'x-api-key': process.env.API},
                responseType : 'arraybuffer'
            });

            const base64image = Buffer.from(data,'binary').toString('base64');
            const resultImage = `data:image/png;base64,${base64image}`

            await useModel.findByIdAndUpdate(user._id,{creditBalance:user.creditBalance-1},{new:true})

            return res.json({success:true,message:'Image Generated',creditBalance:user.creditBalance-1,resultImage});
    }
    catch(error){
        console.error(error.message);
        return res.json({success:false,message:error.message});
    }
}
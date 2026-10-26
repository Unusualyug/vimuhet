import mongoose from 'mongoose';
const schema=new mongoose.Schema({eventId:{type:String,required:true,unique:true,index:true},event:String,orderId:{type:String,index:true},processedAt:Date,payload:{type:mongoose.Schema.Types.Mixed}},{timestamps:true});
export default mongoose.model('PaymentEvent',schema);

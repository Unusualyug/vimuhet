import mongoose from 'mongoose';
const schema=new mongoose.Schema({email:{type:String,required:true,unique:true,lowercase:true,trim:true,index:true},consentedAt:{type:Date,required:true},subscribed:{type:Boolean,default:true,index:true},unsubscribeTokenHash:{type:String,required:true}},{timestamps:true});export default mongoose.model('NewsletterSubscriber',schema);

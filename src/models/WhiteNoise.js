import mongoose from "mongoose";

const { Schema } = mongoose;

const whiteNoiseSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    url: { type: String, required: true },
  },
  { timestamps: true }
);

const WhiteNoise = mongoose.model("WhiteNoise", whiteNoiseSchema);
export default WhiteNoise;

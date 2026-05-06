import { BannerModel } from "../../models/banner.model.js"

// Admin can update banner message and status
export const updateBanner = async (req, res) => {
  try {
    const { message, isActive } = req.body
    const image = req.file?.path.replace(/\\/g, '/');

    const banner = await BannerModel.findOne()
    if (banner) {
      banner.message = message
      banner.isActive = isActive
      if (image) {
        banner.image = image; 
      }
      await banner.save()
    } else {
      await BannerModel.create({ message, isActive, image })
    }

    res.status(200).json({ success: true, message: "Banner updated successfully" })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// Anyone can fetch current banner
export const getBanner = async (req, res) => {
  try {
    const banner = await BannerModel.findOne()
    if (!banner || !banner.isActive) {
      return res.status(200).json({ show: false, message: "" })
    }
    res.status(200).json({ show: true, message: banner.message, image: banner.image })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
};
import { UserModel } from "../models/user.model.js";


const findBinaryPlacement = async (rootUser) => {
    // BFS (Breadth-First Search) for automatic binary placement
    const queue = [rootUser];

    while (queue.length) {
        const currentUser = queue.shift();

        // Check left child first
        if (!currentUser.leftChild) {
            return { parent: currentUser, side: "left" };
        }

        // Check right child
        if (!currentUser.rightChild) {
            return { parent: currentUser, side: "right" };
        }

        // Both children exist, add them to queue for next level
        const leftUser = await UserModel.findById(currentUser.leftChild);
        const rightUser = await UserModel.findById(currentUser.rightChild);
        
        if (leftUser) queue.push(leftUser);
        if (rightUser) queue.push(rightUser);
    }

    throw new Error("Binary tree is full");
};


const buildReferralTree = async (userId, currentLevel, maxLevel) => {
    if (currentLevel > maxLevel) return null;

    // Find all users referred by this user
    const referrals = await UserModel.find({ referrer: userId }).select("name email walletBalance referralCode level");

    const children = await Promise.all(
        referrals.map(async (referral) => {
            const subtree = await buildReferralTree(referral._id, currentLevel + 1, maxLevel);
            return {
                _id: referral._id,
                name: referral.name,
                email: referral.email,
                level: referral.level,
                walletBalance: referral.walletBalance,
                referralCode: referral.referralCode,
                 level: currentLevel,
                children: subtree || []
            };
        })
    );

    return children;
};

const getReferralTree = async (req, res) => {
  try {
    const rootUserId = req.currentUser._id;
    
   
    const directs = await UserModel.find({ referrer: rootUserId })
   
    return res.status(200).json({
      success: true,
      message: "fatched data successfully",
      data: directs
    });
  } catch (error) {
    console.error("❌ Error fetching direct referrals:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
    findBinaryPlacement,
    buildReferralTree,
    getReferralTree

}
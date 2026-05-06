import { UserModel } from "../models/user.model.js";

const TREE_USER_FIELDS =
  "_id userId name email phone sponsor createdAt isActivated totalPurchaseAmount leftChild rightChild";

export const findInDownline = async (rootUserId, searchUserId) => {
  const visited = new Set();

  const dfs = async (userId) => {
    if (!userId || visited.has(userId.toString())) return null;
    visited.add(userId.toString());

    const user = await UserModel.findById(userId)
      .select(TREE_USER_FIELDS)
      .populate("leftChild", TREE_USER_FIELDS)
      .populate("rightChild", TREE_USER_FIELDS);
    if (!user) return null;

    // Check direct match
    if (user._id.toString() === searchUserId.toString()) {
      return user;
    }

    // Traverse left
    if (user.leftChild) {
      const foundLeft = await dfs(user.leftChild);
      if (foundLeft) return foundLeft;
    }

    // Traverse right
    if (user.rightChild) {
      const foundRight = await dfs(user.rightChild);
      if (foundRight) return foundRight;
    }

    return null;
  };

  return dfs(rootUserId);
};

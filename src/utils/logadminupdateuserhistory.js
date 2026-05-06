import AdminUpdateHistory from '../models/addedbyadminhistory.js';
import { UserModel } from '../models/user.model.js';

export const logAdminUpdateHistory = async (userId, changes = {}) => {
  if (!userId || Object.keys(changes).length === 0) return;

  const user = await UserModel.findOne({ userId });

  const logs = Object.entries(changes).map(([field, { oldValue, newValue }]) => ({
    userId,
    username: user?.username || user?.userId,
    field,
    oldValue,
    newValue,
  }));

  if (logs.length > 0) {
    await AdminUpdateHistory.insertMany(logs);
  }
};

import mongoose from "mongoose";

const incomeSchema = new mongoose.Schema({
    user_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User', require: true},
    userId: {type: String},
    paymenttype: { type: String},
    amount: { type: Number, default: 0 },
    purchaseBill: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseBill" },
    sourceUserId: { type: String },
    carryslsp: { type: Number, default: 0 },
    carrysrsp: { type: Number, default: 0 },
    slsp: { type: Number, default: 0 },
    srsp: { type: Number, default: 0 },
    todaysp: { type: Number, default: 0 },
    currentleftsp: {type: Number, default: 0},
    currentrightsp: {type: Number, default: 0},
    type: { type: String, enum: ["income", "outcome"], default: "income" },
},{
    timestamps: true
  })
const IncomeModel = mongoose.model("Income", incomeSchema);

export { IncomeModel }

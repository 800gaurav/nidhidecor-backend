import { CartModel } from "../models/cart.model.js";
import { ProductModel } from "../models/product.model.js";
import { errorResponse, successResponse } from "../utils/api-response.js";

const formatCart = (cart) => ({
  items:
    cart?.items
      ?.filter((item) => item.product)
      .map((item) => ({
        ...item.product.toObject(),
        quantity: item.quantity,
      })) || [],
});

export const getCart = async (req, res) => {
  try {
    const cart = await CartModel.findOne({ user: req.currentUser._id }).populate("items.product");
    return successResponse(res, "Cart fetched successfully", formatCart(cart));
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const product = await ProductModel.findOne({ _id: productId, status: { $ne: "archived" } });
    if (!product) return errorResponse(res, "Product not found", 404);

    const cart = await CartModel.findOneAndUpdate(
      { user: req.currentUser._id },
      { $setOnInsert: { user: req.currentUser._id } },
      { upsert: true, new: true }
    );

    const existing = cart.items.find((item) => item.product.toString() === productId);
    if (existing) {
      existing.quantity += Number(quantity) || 1;
    } else {
      cart.items.push({ product: productId, quantity: Number(quantity) || 1 });
    }
    await cart.save();
    await cart.populate("items.product");

    return successResponse(res, "Product added to cart", formatCart(cart));
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const cart = await CartModel.findOne({ user: req.currentUser._id });
    if (!cart) return successResponse(res, "Product removed from cart", { items: [] });

    cart.items = cart.items.filter((item) => item.product.toString() !== req.params.productId);
    await cart.save();
    await cart.populate("items.product");

    return successResponse(res, "Product removed from cart", formatCart(cart));
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

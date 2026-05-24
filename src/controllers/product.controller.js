import fs from "fs/promises";
import path from "path";
import { ProductModel } from "../models/product.model.js";
import { errorResponse, successResponse } from "../utils/api-response.js";
import { parseCsv } from "../utils/csv.js";

const numberValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const stripHtml = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

const calculateNetAmount = (product) => {
  const dp = numberValue(product.dp);
  const taxRate =
    numberValue(product.cgstRate) + numberValue(product.sgstRate) + numberValue(product.igstRate);
  return roundMoney(dp + dp * (taxRate / 100) + numberValue(product.shippingCharge));
};

const mapCsvRecordToProduct = (record) => {
  const title = stripHtml(record.Title);
  const handle = record.Handle?.trim();
  const image = record["Image Src"]?.trim() || record["Variant Image"]?.trim();

  return {
    handle,
    title,
    productCode:
      record["Custom id identifier for product (product.metafields.kwik-cart.custom-id)"]?.trim() ||
      record["Variant SKU"]?.trim() ||
      handle,
    category: stripHtml(record["Product Category"]) || "Uncategorized",
    description: stripHtml(record["Body (HTML)"]) || "",
    vendor: record.Vendor?.trim(),
    mrp: numberValue(record["Variant Compare At Price"] || record["Variant Price"]),
    dp: numberValue(record["Variant Price"]),
    sp: numberValue(record["Variant Price"]),
    inventoryQty: numberValue(record["Variant Inventory Qty"]),
    image,
    images: image ? [image] : [],
    status: record.Status?.trim() || "active",
    source: "csv",
  };
};

export const importProductsFromCsvFile = async (csvPath) => {
  const content = await fs.readFile(csvPath, "utf8");
  const records = parseCsv(content);
  const productsByHandle = new Map();

  records.forEach((record) => {
    const handle = record.Handle?.trim();
    if (!handle) return;
    const image = record["Image Src"]?.trim() || record["Variant Image"]?.trim();

    if (record.Title?.trim()) {
      const product = mapCsvRecordToProduct(record);
      productsByHandle.set(handle, product);
      return;
    }

    if (image && productsByHandle.has(handle)) {
      const product = productsByHandle.get(handle);
      if (!product.images.includes(image)) product.images.push(image);
    }
  });

  let upserted = 0;
  let updated = 0;
  const usedProductCodes = new Set();

  for (const product of productsByHandle.values()) {
    if (!product.title) continue;
    const existingWithCode = product.productCode
      ? await ProductModel.findOne({ productCode: product.productCode }).select("handle")
      : null;
    if (
      product.productCode &&
      (usedProductCodes.has(product.productCode) ||
        (existingWithCode && existingWithCode.handle !== product.handle))
    ) {
      product.productCode = `${product.productCode}-${product.handle}`.slice(0, 120);
    }
    if (product.productCode) usedProductCodes.add(product.productCode);
    product.netAmount = calculateNetAmount(product);
    const result = await ProductModel.updateOne(
      { handle: product.handle },
      { $set: product, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    if (result.upsertedCount) upserted += 1;
    else if (result.modifiedCount) updated += 1;
  }

  return { total: productsByHandle.size, upserted, updated };
};

export const importProductsFromCsv = async (req, res) => {
  try {
    const csvPath = path.join(process.cwd(), "uploads", "products_export_1.csv");
    const result = await importProductsFromCsvFile(csvPath);
    return successResponse(res, "Products imported successfully", result);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const products = await ProductModel.find({ status: { $ne: "archived" } }).sort({ createdAt: -1 });
    return successResponse(res, "Products fetched successfully", products);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await ProductModel.findById(req.params.id);
    if (!product) return errorResponse(res, "Product not found", 404);
    return successResponse(res, "Product fetched successfully", product);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const createProduct = async (req, res) => {
  try {
    const productData = {
      ...req.body,
      title: stripHtml(req.body.title),
      description: stripHtml(req.body.description),
      category: stripHtml(req.body.category) || "Uncategorized",
      image: req.file?.path || req.body.image,
      source: "admin",
    };
    if (!productData.productCode) productData.productCode = `PRD${Date.now()}`;
    productData.netAmount = calculateNetAmount(productData);
    const product = await ProductModel.create(productData);
    return successResponse(res, "Product created successfully", product, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const updateProduct = async (req, res) => {
  try {
    const existing = await ProductModel.findById(req.params.id);
    if (!existing) return errorResponse(res, "Product not found", 404);

    const productData = { ...req.body };
    if (productData.title) productData.title = stripHtml(productData.title);
    if (productData.description) productData.description = stripHtml(productData.description);
    if (productData.category) productData.category = stripHtml(productData.category);
    if (req.file?.path) productData.image = req.file.path;
    productData.netAmount = calculateNetAmount({ ...existing.toObject(), ...productData });

    const product = await ProductModel.findByIdAndUpdate(req.params.id, productData, {
      new: true,
      runValidators: true,
    });
    return successResponse(res, "Product updated successfully", product);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await ProductModel.findByIdAndUpdate(
      req.params.id,
      { status: "archived" },
      { new: true }
    );
    if (!product) return errorResponse(res, "Product not found", 404);
    return successResponse(res, "Product deleted successfully", product);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

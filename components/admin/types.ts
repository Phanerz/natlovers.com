import {ShopHandle, ShopMaterial, ShopProductType, ShopShape, ShopSize, shopHandles, shopProductTypes, shopShapes, shopSizes} from "@/app/catalogue/shop-data";

export type AdminProduct = {
  slug: string;
  name: string;
  priceIdr: number;
  imageUrl: string;
  images: string[];
  description: string | null;
  productType: ShopProductType;
  materials: ShopMaterial[];
  size: ShopSize;
  shape: ShopShape;
  handle: ShopHandle;
  tags: string[];
  soldOut?: boolean;
  isActive: boolean;
};

export type ProductFormState = {
  name: string;
  priceIdr: string;
  description: string;
  productType: ShopProductType;
  size: ShopSize;
  shape: ShopShape;
  handle: ShopHandle;
  materials: ShopMaterial[];
  tags: string;
  images: File[];
};

export function emptyForm(): ProductFormState {
  return {
    name: "",
    priceIdr: "",
    description: "",
    productType: shopProductTypes[0],
    size: shopSizes[0],
    shape: shopShapes[0],
    handle: shopHandles[0],
    materials: [],
    tags: "",
    images: []
  };
}

export function formFromProduct(product: AdminProduct): ProductFormState {
  return {
    name: product.name,
    priceIdr: String(product.priceIdr),
    description: product.description ?? "",
    productType: product.productType,
    size: product.size,
    shape: product.shape,
    handle: product.handle,
    materials: product.materials,
    tags: product.tags.join(", "),
    images: []
  };
}

export function buildFormData(form: ProductFormState) {
  const formData = new FormData();
  formData.set("name", form.name);
  formData.set("priceIdr", form.priceIdr);
  formData.set("description", form.description);
  formData.set("productType", form.productType);
  formData.set("size", form.size);
  formData.set("shape", form.shape);
  formData.set("handle", form.handle);
  form.materials.forEach((material) => formData.append("materials", material));
  form.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .forEach((tag) => formData.append("tags", tag));
  form.images.forEach((file) => formData.append("images", file));
  return formData;
}

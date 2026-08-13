export type HeroCardType = "color" | "image";

export type AdminHeroCard = {
  id: string;
  displayOrder: number;
  cardType: HeroCardType;
  colorValue: string | null;
  imageUrl: string | null;
};

export type HeroCardFormState = {
  cardType: HeroCardType;
  colorValue: string;
  image: File[];
};

export function emptyHeroCardForm(): HeroCardFormState {
  return {cardType: "image", colorValue: "#43AA8B", image: []};
}

export function buildHeroCardFormData(form: HeroCardFormState) {
  const formData = new FormData();
  formData.set("cardType", form.cardType);
  if (form.cardType === "color") formData.set("colorValue", form.colorValue);
  if (form.cardType === "image" && form.image[0]) formData.set("image", form.image[0]);
  return formData;
}

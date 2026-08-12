export type HeroCardType = "color" | "image" | "testimony";

export type AdminHeroCard = {
  id: string;
  displayOrder: number;
  cardType: HeroCardType;
  colorValue: string | null;
  imageUrl: string | null;
  textContent: string | null;
};

export type HeroCardFormState = {
  cardType: HeroCardType;
  colorValue: string;
  textContent: string;
  image: File[];
};

export function emptyHeroCardForm(): HeroCardFormState {
  return {cardType: "color", colorValue: "#43AA8B", textContent: "", image: []};
}

export function buildHeroCardFormData(form: HeroCardFormState) {
  const formData = new FormData();
  formData.set("cardType", form.cardType);
  if (form.cardType === "color") formData.set("colorValue", form.colorValue);
  if (form.cardType === "testimony") formData.set("textContent", form.textContent);
  if (form.cardType === "image" && form.image[0]) formData.set("image", form.image[0]);
  return formData;
}

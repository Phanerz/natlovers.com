export type CardType = "bag" | "testimony" | "bag_with_customer";

export type AdminTestimonialCard = {
  id: string;
  groupId: string;
  position: number;
  cardType: CardType;
  imageUrl: string | null;
  testimonyText: string | null;
  customerName: string | null;
};

export type AdminTestimonialGroup = {
  groupId: string;
  displayOrder: number;
  isActive: boolean;
  cards: AdminTestimonialCard[];
};

export type TestimonialGroupFormState = {
  bagImage: File[];
  bagCustomerImage: File[];
  testimonyText: string;
  customerName: string;
};

export function emptyTestimonialForm(): TestimonialGroupFormState {
  return {bagImage: [], bagCustomerImage: [], testimonyText: "", customerName: ""};
}

export function testimonialFormFromGroup(group: AdminTestimonialGroup): TestimonialGroupFormState {
  const testimony = group.cards.find((card) => card.cardType === "testimony");
  return {
    bagImage: [],
    bagCustomerImage: [],
    testimonyText: testimony?.testimonyText ?? "",
    customerName: testimony?.customerName ?? ""
  };
}

export function buildTestimonialFormData(form: TestimonialGroupFormState) {
  const formData = new FormData();
  formData.set("testimonyText", form.testimonyText);
  formData.set("customerName", form.customerName);
  if (form.bagImage[0]) formData.set("bagImage", form.bagImage[0]);
  if (form.bagCustomerImage[0]) formData.set("bagCustomerImage", form.bagCustomerImage[0]);
  return formData;
}

export function groupImageUrl(group: AdminTestimonialGroup, position: 1 | 3): string | null {
  return group.cards.find((card) => card.position === position)?.imageUrl ?? null;
}

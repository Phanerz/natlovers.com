import type {LocationIcon, LocationType} from "@/lib/location-constants";

export type AdminLocation = {
  id: string;
  name: string;
  type: LocationType;
  icon: LocationIcon;
  addressLine1: string;
  addressLine2: string | null;
  latitude: number;
  longitude: number;
  hoursDisplay: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LocationFormState = {
  name: string;
  type: LocationType;
  icon: LocationIcon;
  addressLine1: string;
  addressLine2: string;
  latitude: string;
  longitude: string;
  hoursDisplay: string;
  isActive: boolean;
};

export function emptyLocationForm(): LocationFormState {
  return {
    name: "",
    type: "stockist",
    icon: "shopping_bag",
    addressLine1: "",
    addressLine2: "",
    latitude: "",
    longitude: "",
    hoursDisplay: "",
    isActive: true
  };
}

export function formFromLocation(location: AdminLocation): LocationFormState {
  return {
    name: location.name,
    type: location.type,
    icon: location.icon,
    addressLine1: location.addressLine1,
    addressLine2: location.addressLine2 ?? "",
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    hoursDisplay: location.hoursDisplay ?? "",
    isActive: location.isActive
  };
}

export function buildLocationFormData(form: LocationFormState) {
  const formData = new FormData();
  formData.set("name", form.name.trim());
  formData.set("type", form.type);
  formData.set("icon", form.icon);
  formData.set("addressLine1", form.addressLine1.trim());
  formData.set("addressLine2", form.addressLine2.trim());
  formData.set("latitude", form.latitude.trim());
  formData.set("longitude", form.longitude.trim());
  formData.set("hoursDisplay", form.hoursDisplay.trim());
  formData.set("isActive", String(form.isActive));
  return formData;
}

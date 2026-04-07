import { getHttp } from "./http";

export interface Material {
  id: string;
  name: string;
  size: number;
  url: string;
  createdAt: string;
}

export async function fetchMaterials() {
  const http = getHttp();
  return await http<Material[]>("/materials", {
    method: "get",
  });
}

export async function uploadMaterial(formData: FormData) {
  const http = getHttp();
  return await http<Material>("/materials", {
    method: "post",
    body: formData,
  });
}

export async function deleteMaterial(name: string) {
  const http = getHttp();
  return await http<any>(`/materials/${name}`, {
    method: "delete",
  });
}

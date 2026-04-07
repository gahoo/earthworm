import type { CourseApiResponse } from "./course";
import type { CoursePack, CoursePacksItem } from "~/types";
import { getHttp } from "./http";

export type CoursePacksItemApiResponse = {
  id: string;
  title: string;
  isFree: boolean;
  description: string;
  cover: string;
  creatorId?: string;
  uId?: string;
};

export interface CoursePackApiResponse {
  id: string;
  title: string;
  description: string;
  isFree: boolean;
  cover: string;
  creatorId?: string;
  courses: CourseApiResponse[];
}

export async function fetchCoursePacks() {
  const http = getHttp();
  return (await http<CoursePacksItemApiResponse[]>("/course-pack", {
    method: "get",
  })) as CoursePacksItem[];
}

export async function fetchCoursePack(coursePackId: string) {
  const http = getHttp();
  return (await http<CoursePackApiResponse>(`/course-pack/${coursePackId}`, {
    method: "get",
  })) as CoursePack;
}

export async function createCoursePack(data: { title: string; description?: string }) {
  const http = getHttp();
  return await http<any>("/course-pack", {
    method: "post",
    body: data,
  });
}

export async function updateCoursePack(id: string, data: { title?: string; description?: string }) {
  const http = getHttp();
  return await http<any>(`/course-pack/${id}`, {
    method: "patch",
    body: data,
  });
}

export async function deleteCoursePack(id: string) {
  const http = getHttp();
  return await http<any>(`/course-pack/${id}`, {
    method: "delete",
  });
}

export async function exportCoursePack(id: string) {
  const http = getHttp();
  return await http<any>(`/course-pack/${id}/export`, {
    method: "get",
  });
}

export async function importCoursePack(data: any) {
  const http = getHttp();
  return await http<any>("/course-pack/import", {
    method: "post",
    body: data,
  });
}

export async function generateCourseViaAI(data: {
  materialNames: string[];
  prompt?: string;
  provider?: string;
  apiKey?: string;
  apiBaseUrl?: string;
  model?: string;
}) {
  const http = getHttp();
  return await http<any>("/ai/generate-course", {
    method: "post",
    body: data,
  });
}

export async function createCourse(
  coursePackId: string,
  data: { title: string; description?: string },
) {
  const http = getHttp();
  return await http<any>(`/course-pack/${coursePackId}/courses`, {
    method: "post",
    body: data,
  });
}

export async function deleteCourse(coursePackId: string, courseId: string) {
  const http = getHttp();
  return await http<any>(`/course-pack/${coursePackId}/courses/${courseId}`, {
    method: "delete",
  });
}

export async function updateCourse(
  coursePackId: string,
  courseId: string,
  data: { title?: string; description?: string },
) {
  const http = getHttp();
  return await http<any>(`/course-pack/${coursePackId}/courses/${courseId}`, {
    method: "post",
    body: data,
  });
}

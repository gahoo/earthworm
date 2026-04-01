import type { Course } from "./course";

export type CoursePacksItem = {
  id: string;
  title: string;
  isFree: boolean;
  description: string;
  cover: string;
  creatorId?: string;
  uId?: string;
};

export type CoursePack = {
  id: string;
  title: string;
  description: string;
  isFree: boolean;
  cover: string;
  creatorId?: string;
  courses: Course[];
};

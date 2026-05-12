import type { ObjectId } from "mongodb";

export type MiscTodoLevel = "high" | "medium" | "low";

export type MiscTodo = {
  id: string;
  task: string;
  note?: string;
  level: MiscTodoLevel;
  sortOrder: number;
  createdAt: string; // ISO
};

export type MiscTodoDbDocument = {
  _id?: ObjectId;
  task: string;
  note?: string;
  level?: MiscTodoLevel;
  sortOrder?: number;
  createdAt: Date;
};

import type { ObjectId } from "mongodb";

export type MiscTodo = {
  id: string;
  task: string;
  note?: string;
  createdAt: string; // ISO
};

export type MiscTodoDbDocument = {
  _id?: ObjectId;
  task: string;
  note?: string;
  createdAt: Date;
};

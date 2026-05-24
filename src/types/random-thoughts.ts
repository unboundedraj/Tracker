import type { ObjectId } from "mongodb";

export interface RandomThought {
  id: string;
  content: string;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: string; // ISO string for client-side
}

export interface RandomThoughtDbDocument {
  _id?: ObjectId;
  content: string;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: Date;
}
